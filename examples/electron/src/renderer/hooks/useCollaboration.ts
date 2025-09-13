/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  UseCollaborationOptions,
  UseCollaborationReturn,
} from '../../shared/types';
import { ElectronCollaborationProvider } from '../services/electronCollaborationProvider';
import { isRuntimeInCleanupRegistry } from '../utils/notebook';

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
    if (configuration?.runUrl && configuration?.token && !runtimeTerminated) {
      // Additional check: Verify runtime hasn't been marked as terminated in global registry
      if (runtimeId && isRuntimeInCleanupRegistry(runtimeId)) {
        console.info(
          '🛑 [useCollaboration] Blocking collaboration provider creation for terminated runtime:',
          runtimeId
        );
        return;
      }

      // Dispose existing provider
      if (collaborationProviderRef.current) {
        try {
          collaborationProviderRef.current.dispose();
        } catch (error) {
          console.warn(
            '[useCollaboration] Error disposing existing provider:',
            error
          );
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

  // Dispose collaboration provider
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
