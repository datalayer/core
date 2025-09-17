/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * @module useCollaboration
 * @description React hook for managing collaboration provider lifecycle and real-time collaboration features in Electron
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  UseCollaborationOptions,
  UseCollaborationReturn,
} from '../../shared/types';
import { ElectronCollaborationProvider } from '../services/electronCollaborationProvider';
import {
  isRuntimeInCleanupRegistry,
  isRuntimeTerminated,
} from '../utils/notebook';
import { useRuntimeStore } from '../stores/runtimeStore';

/**
 * React hook that manages the lifecycle of collaboration providers for real-time notebook collaboration.
 * Handles creation, disposal, and cleanup of collaboration instances based on runtime state.
 *
 * @param options - Configuration options for collaboration
 * @param options.configuration - Datalayer configuration with authentication and service URLs
 * @param options.selectedNotebook - Currently selected notebook object
 * @param options.runtimeId - Runtime identifier for collaboration context
 * @param options.runtimeTerminated - Whether the runtime has been terminated
 * @returns Object containing collaboration provider, ready state, and disposal function
 */
export const useCollaboration = ({
  configuration,
  selectedNotebook,
  runtimeId,
  runtimeTerminated,
}: UseCollaborationOptions): UseCollaborationReturn => {
  const [collaborationProvider, setCollaborationProvider] =
    useState<ElectronCollaborationProvider | null>(null);
  const [collaborationReady, setCollaborationReady] = useState(false);

  // Store the collaboration provider in a ref to prevent component re-renders
  const collaborationProviderRef = useRef<ElectronCollaborationProvider | null>(
    null
  );
  const collaborationVersionRef = useRef(0);

  // Create collaboration provider instance when configuration is available
  useEffect(() => {
    // Don't create collaboration if notebook is null or runtime is terminated
    if (!selectedNotebook) {
      console.info('[useCollaboration] Skipping - no selected notebook');
      return;
    }

    if (configuration?.runUrl && configuration?.token && !runtimeTerminated) {
      // PRIORITY CHECK: Verify runtime hasn't been marked as terminated in global registry
      if (runtimeId && isRuntimeInCleanupRegistry(runtimeId)) {
        console.info(
          '🛑 [useCollaboration] Blocking collaboration provider creation for terminated runtime:',
          runtimeId
        );
        return;
      }

      // Check if the notebook's runtime was terminated
      if (selectedNotebook?.id && isRuntimeTerminated(selectedNotebook.id)) {
        console.info(
          '🛑 [useCollaboration] Blocking collaboration provider creation - notebook runtime was terminated'
        );
        return;
      }

      // ADDITIONAL CHECK: Check global cleanup registry directly for any runtime
      const cleanupRegistry = (window as any).__datalayerRuntimeCleanup;
      if (cleanupRegistry && runtimeId) {
        if (
          cleanupRegistry.has(runtimeId) &&
          cleanupRegistry.get(runtimeId).terminated
        ) {
          console.info(
            '[useCollaboration] 🛑 RACE CONDITION PREVENTION: Blocking collaboration provider creation for terminated runtime:',
            runtimeId
          );
          return;
        }
      }

      // TERMINATING STATE CHECK: Don't create resources if any runtime is currently terminating
      try {
        const { isTerminatingRuntime: storeTerminating } =
          useRuntimeStore.getState();
        if (storeTerminating) {
          console.info(
            '[useCollaboration] 🛑 RACE CONDITION PREVENTION: Blocking collaboration provider creation during termination'
          );
          return;
        }
      } catch (error) {
        // If we can't check the store, err on the side of caution
        console.warn(
          '[useCollaboration] Could not check terminating state:',
          error
        );
      }

      // Dispose existing provider
      if (collaborationProviderRef.current) {
        try {
          // Clean up Yjs providers before disposal to prevent "Invalid access" errors
          const provider = collaborationProviderRef.current as any;
          if (provider.yWebsocketProvider) {
            try {
              provider.yWebsocketProvider.destroy();
            } catch (e) {
              // Ignore Yjs cleanup errors
            }
          }
          if (provider.awareness) {
            try {
              provider.awareness.destroy();
            } catch (e) {
              // Ignore awareness cleanup errors
            }
          }
          collaborationProviderRef.current.dispose();
        } catch (error) {
          // Suppress Yjs "Invalid access" errors which are expected during cleanup
          if (
            !String(error).includes('Invalid access') &&
            !String(error).includes('Yjs')
          ) {
            console.warn(
              '[useCollaboration] Error disposing existing provider:',
              error
            );
          }
        }
        collaborationProviderRef.current = null;
        setCollaborationProvider(null);
        setCollaborationReady(false);
      }

      collaborationVersionRef.current++;
      console.info(
        '[useCollaboration] Creating Electron collaboration provider v' +
          collaborationVersionRef.current
      );
      console.info(
        '[useCollaboration] Configuration token:',
        configuration.token?.substring(0, 10) + '...'
      );
      console.info(
        '[useCollaboration] Configuration runUrl:',
        configuration.runUrl
      );
      console.info(
        '[useCollaboration] Runtime ID for collaboration:',
        runtimeId || 'NONE'
      );

      try {
        const provider = new ElectronCollaborationProvider({
          runUrl: configuration.runUrl,
          token: configuration.token,
          runtimeId: runtimeId || undefined,
        });

        // Listen for collaboration errors but don't let them break the notebook
        provider.events.errorOccurred.connect((_sender, error) => {
          console.error(
            '[useCollaboration] Collaboration error (non-fatal):',
            error
          );
          setCollaborationReady(false);
        });

        // Listen for collaboration ready state if available
        if ('ready' in provider.events && provider.events.ready) {
          const readyEvent = provider.events.ready as any;
          if (readyEvent && typeof readyEvent.connect === 'function') {
            readyEvent.connect(() => {
              console.info(
                '[useCollaboration] Collaboration provider is ready'
              );
              setCollaborationReady(true);
            });
          }
        }

        collaborationProviderRef.current = provider;
        setCollaborationProvider(provider);

        console.info(
          '[useCollaboration] Collaboration provider created successfully'
        );
      } catch (error) {
        console.error(
          '[useCollaboration] Error creating collaboration provider:',
          error
        );
        setCollaborationProvider(null);
        setCollaborationReady(false);
      }
    } else {
      // Clear provider if conditions are not met
      if (collaborationProviderRef.current) {
        try {
          collaborationProviderRef.current.dispose();
        } catch (error) {
          console.warn(
            '[useCollaboration] Error disposing provider on cleanup:',
            error
          );
        }
        collaborationProviderRef.current = null;
      }
      setCollaborationProvider(null);
      setCollaborationReady(false);

      if (runtimeTerminated) {
        console.info(
          '[useCollaboration] Runtime terminated, clearing collaboration provider'
        );
      }
    }
  }, [
    configuration?.runUrl,
    configuration?.token,
    selectedNotebook?.id,
    runtimeId,
    runtimeTerminated,
  ]);

  // Listen for runtime collaboration cleanup events
  useEffect(() => {
    const handleCollaborationCleanup = (event: CustomEvent) => {
      const { runtimeId: cleanupRuntimeId, notebookId } = event.detail;
      console.info(
        `🤝 [useCollaboration] Received collaboration cleanup event for runtime: ${cleanupRuntimeId}, notebook: ${notebookId}`
      );

      // Check if this cleanup event is for our current notebook
      if (
        notebookId === selectedNotebook?.id &&
        collaborationProviderRef.current
      ) {
        console.info(
          `🤝 [useCollaboration] Disposing collaboration provider for notebook: ${notebookId}`
        );
        try {
          collaborationProviderRef.current.dispose();
          collaborationProviderRef.current = null;
          setCollaborationProvider(null);
          setCollaborationReady(false);
          console.info(
            `🤝 [useCollaboration] Collaboration provider disposed successfully`
          );
        } catch (error) {
          console.error(
            '🤝 [useCollaboration] Error disposing collaboration provider:',
            error
          );
        }
      }
    };

    // Add event listener for runtime collaboration cleanup
    window.addEventListener(
      'runtime-collaboration-cleanup',
      handleCollaborationCleanup as EventListener
    );

    // Cleanup listener on unmount
    return () => {
      window.removeEventListener(
        'runtime-collaboration-cleanup',
        handleCollaborationCleanup as EventListener
      );
    };
  }, [selectedNotebook?.id]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (collaborationProviderRef.current) {
        try {
          collaborationProviderRef.current.dispose();
        } catch (error) {
          console.warn(
            '[useCollaboration] Error disposing provider on unmount:',
            error
          );
        }
      }
    };
  }, []);

  /**
   * Manually disposes the current collaboration provider and cleans up all associated resources
   */
  const disposeCollaboration = useCallback(() => {
    if (collaborationProviderRef.current) {
      try {
        collaborationProviderRef.current.dispose();
        collaborationProviderRef.current = null;
        setCollaborationProvider(null);
        setCollaborationReady(false);
        console.info(
          '[useCollaboration] Collaboration provider disposed manually'
        );
      } catch (error) {
        console.error(
          '[useCollaboration] Error disposing collaboration provider:',
          error
        );
      }
    }
  }, []);

  return {
    collaborationProvider,
    collaborationReady,
    disposeCollaboration,
  };
};
