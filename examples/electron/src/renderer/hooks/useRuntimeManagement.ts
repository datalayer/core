/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * @module useRuntimeManagement
 * @description React hook for managing Jupyter runtime lifecycle, service managers, and runtime state coordination
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import type { ServiceManager } from '@jupyterlab/services';
import {
  UseRuntimeManagementOptions,
  UseRuntimeManagementReturn,
} from '../../shared/types';
import { useRuntimeStore } from '../stores/runtimeStore';
import { createProxyServiceManager } from '../services/proxyServiceManager';
import {
  isRuntimeTerminated,
  markRuntimeTerminated,
  clearRuntimeTerminationFlag,
  getCachedServiceManager,
  cacheServiceManager,
  removeCachedServiceManager,
  safelyDisposeServiceManager,
  formatErrorMessage,
} from '../utils/notebook';

/**
 * React hook that manages the complete lifecycle of Jupyter runtimes and service managers.
 * Handles runtime creation, termination, caching, and state synchronization with the runtime store.
 *
 * @param options - Configuration options for runtime management
 * @param options.selectedNotebook - Currently selected notebook object
 * @param options.configuration - Datalayer configuration with service URLs and authentication
 * @returns Object containing service manager, runtime state, and control functions
 */
export const useRuntimeManagement = ({
  selectedNotebook,
  configuration,
}: UseRuntimeManagementOptions): UseRuntimeManagementReturn => {
  const [serviceManager, setServiceManager] =
    useState<ServiceManager.IManager | null>(null);
  const [creating, setCreating] = useState(false);
  const [terminating, setTerminating] = useState(false);
  const [terminated, setTerminated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use refs to prevent race conditions and component lifecycle issues
  const mountedRef = useRef(true);

  // Use runtime store for runtime management
  const {
    isCreatingRuntime,
    isTerminatingRuntime,
    runtimeError,
    createRuntimeForNotebook,
    getRuntimeForNotebook,
    terminateRuntimeForNotebook,
    setServiceManagerForNotebook,
    setActiveNotebook,
    loadRuntimesFromStorage,
  } = useRuntimeStore();

  // Get runtime for current notebook
  const notebookRuntime = selectedNotebook
    ? getRuntimeForNotebook(selectedNotebook.id)
    : null;
  const runtime = notebookRuntime?.runtime;

  // Component mount/unmount tracking
  useEffect(() => {
    mountedRef.current = true;
    loadRuntimesFromStorage();
    return () => {
      mountedRef.current = false;
    };
  }, [loadRuntimesFromStorage]);

  // Reset termination flag when changing notebooks
  useEffect(() => {
    if (mountedRef.current && selectedNotebook) {
      setTerminated(false);
      clearRuntimeTerminationFlag(selectedNotebook.id);
    }
  }, [selectedNotebook?.id]);

  // Initialize service manager for the notebook
  useEffect(() => {
    let cancelled = false;

    const initServiceManager = async () => {
      if (!mountedRef.current || !selectedNotebook) {
        return;
      }

      // Check if we already have a runtime with service manager for this notebook
      const existingRuntime = getRuntimeForNotebook(selectedNotebook.id);
      const hasExistingServiceManager =
        existingRuntime?.serviceManager &&
        !existingRuntime.serviceManager.isDisposed;

      if (
        configuration?.token &&
        configuration?.runUrl &&
        !hasExistingServiceManager
      ) {
        setError(null);
        setCreating(true);

        try {
          console.info(
            '[useRuntimeManagement] Creating runtime with Datalayer service...'
          );

          // Check if this notebook was just terminated
          if (isRuntimeTerminated(selectedNotebook.id)) {
            clearRuntimeTerminationFlag(selectedNotebook.id);
            return;
          }

          // Set this notebook as active
          setActiveNotebook(selectedNotebook.id);

          // Get or create runtime for this specific notebook
          let currentRuntime = runtime;

          // Only create a new runtime if one doesn't exist
          if (!currentRuntime) {
            const newRuntime = await createRuntimeForNotebook(
              selectedNotebook.id,
              selectedNotebook.path,
              {
                environment: 'python-cpu-env',
                credits: 10,
              }
            );

            if (!newRuntime) {
              throw new Error(runtimeError || 'Failed to create runtime');
            }
            currentRuntime = newRuntime;
          } else {
            console.info(
              `[useRuntimeManagement] Reusing existing runtime for notebook ${selectedNotebook.id}:`,
              currentRuntime.uid
            );
          }

          const jupyterServerUrl = currentRuntime?.ingress;
          if (!jupyterServerUrl) {
            throw new Error(
              'No Jupyter server URL provided in runtime response'
            );
          }

          const jupyterToken = currentRuntime?.token || configuration.token;
          console.info(
            '[useRuntimeManagement] Connecting to Jupyter server:',
            jupyterServerUrl
          );

          if (cancelled || !mountedRef.current) return;

          // Check if we already have a service manager for this runtime
          let manager = getCachedServiceManager(currentRuntime.uid);

          if (!manager) {
            console.info(
              '[useRuntimeManagement] Creating new ServiceManager for runtime:',
              currentRuntime.uid
            );
            manager = await createProxyServiceManager(
              jupyterServerUrl,
              jupyterToken,
              currentRuntime.uid
            );

            if (manager) {
              await manager.ready;
            }

            if (cancelled || !mountedRef.current) {
              // Clean up if component was unmounted during async operation
              safelyDisposeServiceManager(manager);
              return;
            }

            // Cache the service manager with cleanup
            cacheServiceManager(currentRuntime.uid, manager);

            // Add cleanup function to prevent disposal conflicts
            if (manager && typeof (manager as any).dispose === 'function') {
              const originalDispose = (manager as any).dispose;
              (manager as any).dispose = () => {
                console.info(
                  '[useRuntimeManagement] Disposing ServiceManager for runtime:',
                  currentRuntime.uid
                );
                removeCachedServiceManager(currentRuntime.uid);
                try {
                  if (typeof originalDispose === 'function') {
                    originalDispose.call(manager);
                  }
                } catch (e) {
                  console.error(
                    '[useRuntimeManagement] Error in original dispose:',
                    e
                  );
                }
              };
            }
          } else {
            console.info(
              '[useRuntimeManagement] Reusing existing ServiceManager for runtime:',
              currentRuntime.uid
            );

            // Verify the manager is still valid
            if ((manager as any).isDisposed) {
              console.info(
                '[useRuntimeManagement] Cached ServiceManager was disposed, creating new one'
              );
              removeCachedServiceManager(currentRuntime.uid);
              manager = await createProxyServiceManager(
                jupyterServerUrl,
                jupyterToken,
                currentRuntime.uid
              );

              if (manager) {
                await manager.ready;
              }

              if (cancelled || !mountedRef.current) {
                safelyDisposeServiceManager(manager);
                return;
              }
              cacheServiceManager(currentRuntime.uid, manager);
            }
          }

          if (cancelled || !mountedRef.current) {
            return;
          }

          if (manager) {
            setServiceManagerForNotebook(selectedNotebook.id, manager);
            setServiceManager(manager);
          }
          console.info(
            '[useRuntimeManagement] ServiceManager ready with runtime Jupyter server'
          );
        } catch (initError) {
          console.error(
            '[useRuntimeManagement] Failed to create ProxyServiceManager:',
            initError
          );
          if (!cancelled) {
            const errorMessage = formatErrorMessage(initError as Error);
            setError(errorMessage);
          }
        } finally {
          setCreating(false);
        }
      } else if (!configuration?.token || !configuration?.runUrl) {
        console.info(
          '[useRuntimeManagement] No Datalayer credentials configured'
        );
        setServiceManager(null);
        setError(null);
      } else if (hasExistingServiceManager) {
        // Use existing service manager
        setServiceManager(existingRuntime.serviceManager || null);
        setError(null);
      }
    };

    initServiceManager();

    return () => {
      cancelled = true;
    };
  }, [
    configuration?.token,
    configuration?.runUrl,
    selectedNotebook?.id,
    selectedNotebook?.path,
    runtime,
    getRuntimeForNotebook,
    createRuntimeForNotebook,
    setServiceManagerForNotebook,
    setActiveNotebook,
    runtimeError,
  ]);

  // Terminate runtime function
  const terminateRuntime = useCallback(async () => {
    if (!selectedNotebook) return;

    setTerminating(true);
    try {
      // Mark as terminated to prevent re-creation
      markRuntimeTerminated(selectedNotebook.id);

      await terminateRuntimeForNotebook(selectedNotebook.id);

      setServiceManager(null);
      setError(null);
      setTerminated(true);

      // Clear the active notebook from the store
      setActiveNotebook(null);

      console.info('[useRuntimeManagement] Runtime terminated successfully');
    } catch (terminateError) {
      console.error(
        '[useRuntimeManagement] Error terminating runtime:',
        terminateError
      );
      // Don't set error state here - let the parent component handle it
    } finally {
      setTerminating(false);
    }
  }, [selectedNotebook, terminateRuntimeForNotebook, setActiveNotebook]);

  return {
    serviceManager,
    runtime,
    creating: creating || isCreatingRuntime,
    terminating: terminating || isTerminatingRuntime,
    terminated,
    error: error || runtimeError,
    terminateRuntime,
  };
};
