/**
 * @module renderer/stores/runtimeStore
 * @description Zustand store for managing compute runtime state.
 * Handles runtime creation, termination, and lifecycle management.
 */

/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { create } from 'zustand';
import { ServiceManager } from '@jupyterlab/services';

// Type declarations for globalThis properties
declare global {
  var __datalayerRuntimeCleanup:
    | Map<string, { terminated: boolean }>
    | undefined;
  var __runtimeCreationPromises:
    | Map<string, Promise<Runtime | null>>
    | undefined;
}

/**
 * Runtime information from Datalayer API.
 * @interface Runtime
 */
interface Runtime {
  /** Unique identifier for the runtime */
  uid: string;
  /** Optional display name */
  given_name?: string;
  /** Kubernetes pod name */
  pod_name: string;
  /** Ingress URL for accessing the runtime */
  ingress?: string;
  /** Authentication token for the runtime */
  token?: string;
  /** Environment name used */
  environment_name?: string;
  /** Environment display title */
  environment_title?: string;
  /** Runtime type */
  type?: string;
  /** Credit burning rate */
  burning_rate?: number;
  /** Reservation identifier */
  reservation_id?: string;
  /** Start timestamp */
  started_at?: string;
  /** Expiration timestamp */
  expired_at?: string;
  /** Current runtime status */
  status?: string;
  /** Additional properties */
  [key: string]: unknown;
}

/**
 * Associates a notebook with its runtime and service manager.
 * @interface NotebookRuntime
 */
interface NotebookRuntime {
  /** Unique notebook identifier */
  notebookId: string;
  /** Optional notebook file path */
  notebookPath?: string;
  /** Associated runtime instance */
  runtime: Runtime;
  /** Optional Jupyter service manager */
  serviceManager?: ServiceManager.IManager;
}

/**
 * Runtime store state and actions.
 * @interface RuntimeState
 */
interface RuntimeState {
  // Map of notebook IDs to their runtimes
  notebookRuntimes: Map<string, NotebookRuntime>;

  // Currently active notebook
  activeNotebookId: string | null;

  // Loading states
  isCreatingRuntime: boolean;
  isTerminatingRuntime: boolean;

  // Error state
  runtimeError: string | null;

  // Actions
  setActiveNotebook: (notebookId: string | null) => void;
  setIsCreatingRuntime: (value: boolean) => void;
  setIsTerminatingRuntime: (value: boolean) => void;
  setRuntimeError: (error: string | null) => void;

  // Runtime management
  createRuntimeForNotebook: (
    notebookId: string,
    notebookPath?: string,
    options?: { environment?: string; name?: string; credits?: number }
  ) => Promise<Runtime | null>;
  _createRuntimeInternal: (
    notebookId: string,
    notebookPath?: string,
    options?: { environment?: string; name?: string; credits?: number }
  ) => Promise<Runtime | null>;
  getRuntimeForNotebook: (notebookId: string) => NotebookRuntime | undefined;
  setServiceManagerForNotebook: (
    notebookId: string,
    manager: ServiceManager.IManager
  ) => void;
  terminateRuntimeForNotebook: (notebookId: string) => Promise<void>;
  terminateAllRuntimes: () => Promise<void>;

  // Helper getters
  getCurrentRuntime: () => Runtime | null;
  getCurrentServiceManager: () => ServiceManager.IManager | null;
  getActiveNotebook: () => NotebookRuntime | null;
  hasActiveRuntime: () => boolean;
  getActiveNotebookWithRuntime: () => {
    notebookId: string;
    notebookPath?: string;
  } | null;

  // Persistence
  saveRuntimesToStorage: () => void;
  loadRuntimesFromStorage: () => void;
  reconnectToExistingRuntimes: () => Promise<void>;
  createServiceManagerFromRuntime: (
    runtime: Record<string, unknown>,
    notebookId: string,
    notebookPath: string
  ) => Promise<ServiceManager.IManager | null>;
  removeRuntimeFromStorage: (notebookId: string) => void;

  // Single notebook enforcement
  canOpenNotebook: (notebookId: string) => {
    allowed: boolean;
    message?: string;
  };
}

export const useRuntimeStore = create<RuntimeState>((set, get) => ({
  // Initial state
  notebookRuntimes: new Map(),
  activeNotebookId: null,
  isCreatingRuntime: false,
  isTerminatingRuntime: false,
  runtimeError: null,

  // Basic setters
  setActiveNotebook: notebookId => set({ activeNotebookId: notebookId }),
  setIsCreatingRuntime: value => set({ isCreatingRuntime: value }),
  setIsTerminatingRuntime: value => set({ isTerminatingRuntime: value }),
  setRuntimeError: error => set({ runtimeError: error }),

  // Create a runtime for a specific notebook
  createRuntimeForNotebook: async (notebookId, notebookPath, options) => {
    const { notebookRuntimes } = get();

    // Check if this notebook already has a runtime
    const existingRuntime = notebookRuntimes.get(notebookId);
    if (existingRuntime) {
      // CRITICAL: Check if the runtime has been terminated
      const cleanupRegistry = globalThis.__datalayerRuntimeCleanup;
      const isTerminated =
        cleanupRegistry &&
        cleanupRegistry.has(existingRuntime.runtime.uid) &&
        cleanupRegistry.get(existingRuntime.runtime.uid)?.terminated;

      if (isTerminated) {
        console.info(
          `⚠️ [Runtime Check] Existing runtime ${existingRuntime.runtime.uid} for notebook ${notebookId} has been terminated, creating new one`
        );
      } else {
        console.info(
          `Reusing existing runtime for notebook ${notebookId}:`,
          existingRuntime.runtime.uid
        );
        return existingRuntime.runtime;
      }
    }

    // CRITICAL: Prevent race condition by checking if runtime creation is already in progress
    // This prevents React strict mode from triggering duplicate API calls
    if (!globalThis.__runtimeCreationPromises) {
      globalThis.__runtimeCreationPromises = new Map();
    }

    const existingPromise =
      globalThis.__runtimeCreationPromises.get(notebookId);
    if (existingPromise) {
      console.info(
        `🔄 [Race Condition Protection] Runtime creation already in progress for notebook ${notebookId}, waiting for existing request...`
      );
      return existingPromise;
    }

    // Create and store the promise to prevent concurrent requests
    const creationPromise = get()._createRuntimeInternal(
      notebookId,
      notebookPath,
      options
    );
    globalThis.__runtimeCreationPromises.set(notebookId, creationPromise);

    try {
      const result = await creationPromise;
      globalThis.__runtimeCreationPromises.delete(notebookId);
      return result;
    } catch (error) {
      globalThis.__runtimeCreationPromises.delete(notebookId);
      throw error;
    }
  },

  // Internal runtime creation method (extracted to allow promise caching)
  _createRuntimeInternal: async (notebookId, notebookPath, options) => {
    const { notebookRuntimes } = get();
    const { setIsCreatingRuntime, setRuntimeError } = get();

    setIsCreatingRuntime(true);
    setRuntimeError(null);

    try {
      console.info(
        `Creating new runtime for notebook ${notebookId} with options:`,
        options
      );

      // Add timestamp to ensure unique runtime names
      const timestamp = Date.now().toString(36); // Convert to base36 for shorter string
      const createRuntimeParams = {
        environment: options?.environment || 'python-cpu-env',
        name: `electron-example-${notebookId}-${timestamp}`,
        credits: options?.credits || 10,
      };

      // Check authentication state before API call
      const authState = await (window as any).datalayerAPI.getCredentials();
      console.info('[RUNTIME DEBUG] Authentication state:', {
        isAuthenticated: authState.isAuthenticated,
        runUrl: authState.runUrl,
        hasToken: !!authState.token,
      });

      console.info(
        '[RUNTIME DEBUG] Calling createRuntime with params:',
        createRuntimeParams
      );

      // DEBUG: Check if datalayerAPI is available
      console.info(
        '[RUNTIME DEBUG] datalayerAPI exists:',
        !!(window as any).datalayerAPI
      );
      console.info(
        '[RUNTIME DEBUG] createRuntime method exists:',
        typeof (window as any).datalayerAPI?.createRuntime
      );
      console.info(
        '[RUNTIME DEBUG] datalayerAPI keys:',
        Object.keys((window as any).datalayerAPI || {})
      );

      const result = await (window as any).datalayerAPI.createRuntime(
        createRuntimeParams
      );
      console.info('[RUNTIME DEBUG] createRuntime response:', {
        success: result.success,
        hasData: !!result.data,
        error: result.error,
        fullResult: result,
      });

      if (result.success && result.data?.runtime) {
        const runtime = result.data.runtime;

        // Log the complete runtime object to understand its structure
        console.info(
          '🔍 Complete runtime object structure:',
          JSON.stringify(runtime, null, 2)
        );

        // Store the runtime for this notebook
        const newRuntimes = new Map(notebookRuntimes);
        newRuntimes.set(notebookId, {
          notebookId,
          notebookPath,
          runtime,
        });
        set({ notebookRuntimes: newRuntimes });

        // Save to storage for persistence
        get().saveRuntimesToStorage();

        console.info(
          `Runtime created successfully for notebook ${notebookId}:`,
          runtime.uid
        );
        return runtime;
      } else {
        throw new Error(result.error || 'Failed to create runtime');
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to create runtime';
      console.error('Error creating runtime:', errorMessage);
      setRuntimeError(errorMessage);
      return null;
    } finally {
      setIsCreatingRuntime(false);
    }
  },

  // Get runtime for a specific notebook
  getRuntimeForNotebook: notebookId => {
    return get().notebookRuntimes.get(notebookId);
  },

  // Set service manager for a notebook
  setServiceManagerForNotebook: (notebookId, manager) => {
    const { notebookRuntimes } = get();
    const notebookRuntime = notebookRuntimes.get(notebookId);

    if (notebookRuntime) {
      const newRuntimes = new Map(notebookRuntimes);
      newRuntimes.set(notebookId, {
        ...notebookRuntime,
        serviceManager: manager,
      });
      set({ notebookRuntimes: newRuntimes });
    }
  },

  // Terminate runtime for a specific notebook
  terminateRuntimeForNotebook: async notebookId => {
    // Wrap entire function in a Promise to handle all async errors
    return new Promise<void>((resolve, reject) => {
      let resolved = false; // Track if promise has been resolved

      // Use async IIFE to handle async operations
      (async () => {
        const { notebookRuntimes, setIsTerminatingRuntime, setRuntimeError } =
          get();
        const notebookRuntime = notebookRuntimes.get(notebookId);

        if (!notebookRuntime) {
          console.info(`No runtime to terminate for notebook ${notebookId}`);
          resolved = true;
          resolve();
          return;
        }

        setIsTerminatingRuntime(true);
        setRuntimeError(null);

        try {
          console.info(
            `Terminating runtime for notebook ${notebookId}:`,
            notebookRuntime.runtime.uid
          );

          // CRITICAL: Clear cached creation promise for this notebook
          // This ensures new requests create fresh runtimes instead of reusing terminated ones
          if (globalThis.__runtimeCreationPromises) {
            if (globalThis.__runtimeCreationPromises.has(notebookId)) {
              console.info(
                `🔄 [Race Condition Protection] Clearing cached promise for terminated runtime ${notebookId}`
              );
              globalThis.__runtimeCreationPromises.delete(notebookId);
            }
          }

          // STEP 1: First shut down all sessions and kernels cleanly
          if (
            notebookRuntime.serviceManager &&
            !notebookRuntime.serviceManager.isDisposed
          ) {
            console.info('📋 [Step 1] Shutting down sessions and kernels...');

            try {
              const serviceManager = notebookRuntime.serviceManager;

              // Shut down all sessions for this notebook
              if (serviceManager.sessions) {
                await serviceManager.sessions.refreshRunning();
                const runningSessions = Array.from(
                  serviceManager.sessions.running()
                );
                for (const session of runningSessions) {
                  try {
                    console.info(`  Shutting down session: ${session.id}`);
                    await serviceManager.sessions.shutdown(session.id);
                  } catch (err) {
                    console.warn('  Error shutting down session:', err);
                  }
                }
              }

              // Shut down all kernels
              if (serviceManager.kernels) {
                await serviceManager.kernels.refreshRunning();
                const runningKernels = Array.from(
                  serviceManager.kernels.running()
                );
                for (const kernel of runningKernels) {
                  try {
                    console.info(`  Shutting down kernel: ${kernel.id}`);
                    await serviceManager.kernels.shutdown(kernel.id);
                  } catch (err) {
                    // Ignore 200 response errors - these are actually successful shutdowns
                    const errStr = String(err);
                    if (
                      errStr.includes('Invalid response: 200') ||
                      errStr.includes('ResponseError')
                    ) {
                      console.info(
                        `  Kernel ${kernel.id} shutdown completed (200 response)`
                      );
                    } else {
                      console.warn('  Error shutting down kernel:', err);
                    }
                  }
                }
              }
            } catch (error) {
              console.warn('Error during session/kernel shutdown:', error);
            }
          }

          // STEP 2: Clean up collaboration provider
          try {
            console.info(
              `🤝 [Step 2] Cleaning up collaboration provider for runtime: ${notebookRuntime.runtime.uid}`
            );

            // Emit a global event that NotebookView components can listen to
            const collaborationCleanupEvent = new CustomEvent(
              'runtime-collaboration-cleanup',
              {
                detail: {
                  runtimeId: notebookRuntime.runtime.uid,
                  notebookId: notebookId,
                },
              }
            );
            window.dispatchEvent(collaborationCleanupEvent);

            console.info(
              `🤝 Collaboration cleanup event dispatched for runtime: ${notebookRuntime.runtime.uid}`
            );
          } catch (error) {
            console.error(
              '🤝 Failed to dispatch collaboration cleanup event:',
              error
            );
          }

          // STEP 3: Close WebSocket connections for this runtime
          try {
            console.info(
              `🔴 [Step 3] Closing WebSocket connections for runtime: ${notebookRuntime.runtime.uid}`
            );
            const result = await (window as any).proxyAPI.websocketCloseRuntime(
              {
                runtimeId: notebookRuntime.runtime.uid,
              }
            );
            console.info(`🔴 WebSocket cleanup result:`, result);
          } catch (error) {
            console.error('🔴 Failed to close WebSocket connections:', error);
          }

          // STEP 4: Dispose service manager
          if (
            notebookRuntime.serviceManager &&
            !notebookRuntime.serviceManager.isDisposed
          ) {
            console.info('♻️ [Step 4] Disposing service manager...');

            // Aggressive cleanup: Force stop any kernel polling/requests
            try {
              const serviceManager = notebookRuntime.serviceManager as any;

              // Stop kernel manager polling if it exists
              if (
                serviceManager.kernels &&
                typeof serviceManager.kernels.dispose === 'function' &&
                !serviceManager.kernels.isDisposed
              ) {
                console.info(
                  '🛑 [Aggressive Cleanup] Disposing kernel manager'
                );
                try {
                  const disposeResult = serviceManager.kernels.dispose();
                  // Handle both sync and async disposal
                  if (
                    disposeResult &&
                    typeof disposeResult.catch === 'function'
                  ) {
                    disposeResult.catch((err: any) => {
                      // Ignore Poll disposal errors - these are expected during cleanup
                      if (
                        !String(err).includes('Poll') &&
                        !String(err).includes('disposed')
                      ) {
                        console.warn(
                          'Error disposing kernel manager (async):',
                          err
                        );
                      }
                    });
                  }
                } catch (err) {
                  // Ignore Poll disposal errors - these are expected during cleanup
                  if (
                    !String(err).includes('Poll') &&
                    !String(err).includes('disposed')
                  ) {
                    console.warn('Error disposing kernel manager (sync):', err);
                  }
                }
              }

              // Stop session manager polling if it exists
              if (
                serviceManager.sessions &&
                typeof serviceManager.sessions.dispose === 'function' &&
                !serviceManager.sessions.isDisposed
              ) {
                console.info(
                  '🛑 [Aggressive Cleanup] Disposing session manager'
                );
                try {
                  const disposeResult = serviceManager.sessions.dispose();
                  // Handle both sync and async disposal
                  if (
                    disposeResult &&
                    typeof disposeResult.catch === 'function'
                  ) {
                    disposeResult.catch((err: any) => {
                      // Ignore Poll disposal errors - these are expected during cleanup
                      if (
                        !String(err).includes('Poll') &&
                        !String(err).includes('disposed')
                      ) {
                        console.warn(
                          'Error disposing session manager (async):',
                          err
                        );
                      }
                    });
                  }
                } catch (err) {
                  // Ignore Poll disposal errors - these are expected during cleanup
                  if (
                    !String(err).includes('Poll') &&
                    !String(err).includes('disposed')
                  ) {
                    console.warn(
                      'Error disposing session manager (sync):',
                      err
                    );
                  }
                }
              }

              // Clear any pending timers/intervals
              if (
                serviceManager._kernelManager &&
                serviceManager._kernelManager._models
              ) {
                console.info('🛑 [Aggressive Cleanup] Clearing kernel models');
                serviceManager._kernelManager._models.clear();
              }

              if (
                serviceManager._sessionManager &&
                serviceManager._sessionManager._models
              ) {
                console.info('🛑 [Aggressive Cleanup] Clearing session models');
                serviceManager._sessionManager._models.clear();
              }
            } catch (error) {
              console.warn(
                '🛑 [Aggressive Cleanup] Error during aggressive cleanup:',
                error
              );
            }

            try {
              notebookRuntime.serviceManager.dispose();
            } catch (err) {
              // Ignore Poll disposal errors - these are expected during cleanup
              if (
                !String(err).includes('Poll') &&
                !String(err).includes('disposed')
              ) {
                console.warn('Error disposing service manager:', err);
              }
            }
          }

          // Additional cleanup: Stop any kernel/session polling specifically for this runtime
          try {
            console.info(
              '🛑 [Targeted Cleanup] Stopping polling for runtime:',
              notebookRuntime.runtime.uid
            );

            // Instead of clearing ALL timers, let's be more targeted
            // Force abort any pending fetch requests to this specific runtime
            const runtimeUrl = `${notebookRuntime.runtime.jupyter_server_url}`;
            console.info(
              '🛑 [Targeted Cleanup] Runtime URL to clean:',
              runtimeUrl
            );

            // Store reference to track and clean up runtime-specific timers
            // We'll use a global registry for runtime-specific cleanup
            if (!(window as any).__datalayerRuntimeCleanup) {
              (window as any).__datalayerRuntimeCleanup = new Map();
            }

            const cleanupRegistry = (window as any).__datalayerRuntimeCleanup;
            const runtimeId = notebookRuntime.runtime.uid;

            // Mark this runtime as terminated to prevent new timers
            cleanupRegistry.set(runtimeId, { terminated: true });

            console.info(
              '🛑 [Targeted Cleanup] Marked runtime as terminated:',
              runtimeId
            );

            // Notify main process to update its cleanup registry for WebSocket blocking
            try {
              (window as any).electronAPI?.notifyRuntimeTerminated?.(runtimeId);
            } catch (error) {
              console.warn(
                '🛑 [Targeted Cleanup] Error notifying main process:',
                error
              );
            }
          } catch (error) {
            console.warn(
              '🛑 [Targeted Cleanup] Error during targeted cleanup:',
              error
            );
          }

          // Clear cached service manager if any
          const cacheKey = `serviceManager-${notebookRuntime.runtime.uid}`;
          if ((window as Record<string, any>)[cacheKey]) {
            delete (window as Record<string, any>)[cacheKey];
          }

          // Call API to delete runtime on server
          console.info(
            `🗑️  Attempting to delete runtime: ${notebookRuntime.runtime.uid}`
          );
          console.info(
            `🗑️  Complete runtime object for deletion:`,
            JSON.stringify(notebookRuntime.runtime, null, 2)
          );

          // Use pod_name for deletion (API requires pod name, not UID)
          const podNameToDelete = notebookRuntime.runtime.pod_name;

          if (!podNameToDelete) {
            console.error(
              `🗑️  ERROR: No pod_name found in runtime object! Cannot delete runtime.`
            );
            setRuntimeError('Cannot delete runtime - no pod name available');
            resolved = true;
            resolve();
            return;
          }

          console.info(`🗑️  Using pod name for deletion: ${podNameToDelete}`);

          const deleteResult = await (window as any).datalayerAPI.deleteRuntime(
            podNameToDelete
          );

          console.info(`🗑️  Delete API response:`, deleteResult);

          if (!deleteResult.success) {
            console.error(
              'Failed to delete runtime on server:',
              deleteResult.error
            );
          } else {
            console.info(
              `✅ Successfully deleted runtime: ${notebookRuntime.runtime.uid}`
            );
          }

          // Remove from map
          const newRuntimes = new Map(notebookRuntimes);
          newRuntimes.delete(notebookId);

          // Clear active notebook if it was this one
          const { activeNotebookId } = get();
          if (activeNotebookId === notebookId) {
            set({
              notebookRuntimes: newRuntimes,
              activeNotebookId: null,
            });
          } else {
            set({ notebookRuntimes: newRuntimes });
          }

          // Update storage
          get().saveRuntimesToStorage();

          console.info(
            `Runtime terminated successfully for notebook ${notebookId}`
          );
          resolved = true;
          resolve();
        } catch (error) {
          const errorMessage =
            error instanceof Error
              ? error.message
              : 'Failed to terminate runtime';

          // Filter out expected Poll disposal errors
          if (
            String(error).includes('Poll') &&
            String(error).includes('disposed')
          ) {
            console.debug(
              'Ignoring expected Poll disposal error during cleanup'
            );
            resolved = true;
            resolve(); // Don't treat Poll disposal as a real error
          } else {
            console.error('Error terminating runtime:', errorMessage);
            setRuntimeError(errorMessage);
            resolved = true;
            reject(error); // Reject with the error for real failures
          }
        } finally {
          setIsTerminatingRuntime(false);
          // Ensure promise resolves even if not handled in catch
          if (!resolved) {
            resolved = true;
            resolve();
          }
        }
      })(); // Execute the async IIFE
    });
  },

  // Terminate all runtimes
  terminateAllRuntimes: async () => {
    const { notebookRuntimes } = get();

    for (const [notebookId] of notebookRuntimes) {
      await get().terminateRuntimeForNotebook(notebookId);
    }

    // Clear all state and storage
    set({
      notebookRuntimes: new Map(),
      activeNotebookId: null,
    });
    sessionStorage.removeItem('datalayer-runtimes');
  },

  // Helper getters
  getCurrentRuntime: () => {
    const { activeNotebookId, notebookRuntimes } = get();
    if (!activeNotebookId) return null;

    const notebookRuntime = notebookRuntimes.get(activeNotebookId);
    return notebookRuntime?.runtime || null;
  },

  getCurrentServiceManager: () => {
    const { activeNotebookId, notebookRuntimes } = get();
    if (!activeNotebookId) return null;

    const notebookRuntime = notebookRuntimes.get(activeNotebookId);
    return notebookRuntime?.serviceManager || null;
  },

  getActiveNotebook: () => {
    const { activeNotebookId, notebookRuntimes } = get();
    if (!activeNotebookId) return null;

    return notebookRuntimes.get(activeNotebookId) || null;
  },

  hasActiveRuntime: () => {
    const { notebookRuntimes } = get();
    return notebookRuntimes.size > 0;
  },

  getActiveNotebookWithRuntime: () => {
    const { notebookRuntimes, activeNotebookId } = get();

    // Try to get the active notebook first
    if (activeNotebookId && notebookRuntimes.has(activeNotebookId)) {
      const runtime = notebookRuntimes.get(activeNotebookId)!;
      return {
        notebookId: runtime.notebookId,
        notebookPath: runtime.notebookPath,
      };
    }

    // Otherwise return the first notebook with a runtime
    if (notebookRuntimes.size > 0) {
      const firstRuntime = notebookRuntimes.values().next().value;
      if (firstRuntime) {
        return {
          notebookId: firstRuntime.notebookId,
          notebookPath: firstRuntime.notebookPath,
        };
      }
    }

    return null;
  },

  // Persistence methods
  saveRuntimesToStorage: () => {
    const { notebookRuntimes } = get();
    const runtimesData: Array<{
      notebookId: string;
      notebookPath?: string;
      runtime: Runtime;
    }> = [];

    notebookRuntimes.forEach((value, key) => {
      runtimesData.push({
        notebookId: key,
        notebookPath: value.notebookPath,
        runtime: value.runtime,
      });
    });

    sessionStorage.setItem('datalayer-runtimes', JSON.stringify(runtimesData));
  },

  // Reconnect to existing active runtimes on startup
  reconnectToExistingRuntimes: async () => {
    console.info('[RuntimeStore] Checking for existing active runtimes...');

    try {
      // Get stored runtime info
      const storedData = sessionStorage.getItem('datalayer-runtimes');
      if (!storedData) {
        console.info('[RuntimeStore] No stored runtime data found');
        return;
      }

      const parsedData = JSON.parse(storedData);
      const storedRuntimes = parsedData.notebookRuntimes || {};

      // Check each stored runtime to see if it's still active
      for (const [notebookId, runtimeInfo] of Object.entries(storedRuntimes)) {
        const info = runtimeInfo as Record<string, any>;
        const podName = (info.runtime as any)?.pod_name as string;

        if (podName) {
          console.info(
            `[RuntimeStore] Checking runtime ${podName} for notebook ${notebookId}`
          );

          // Check if runtime is still active
          const statusResponse = await (
            window as any
          ).datalayerAPI.isRuntimeActive(podName);

          if (
            statusResponse.success &&
            statusResponse.isActive &&
            statusResponse.runtime
          ) {
            console.info(
              `[RuntimeStore] Runtime ${podName} is still active, attempting reconnection`
            );

            try {
              // Recreate the service manager with existing runtime
              const serviceManager =
                await get().createServiceManagerFromRuntime(
                  statusResponse.runtime,
                  notebookId,
                  info.notebookPath as string
                );

              if (serviceManager) {
                // Store the reconnected runtime
                const notebookRuntime: NotebookRuntime = {
                  notebookId,
                  notebookPath: info.notebookPath as string,
                  runtime: statusResponse.runtime,
                  serviceManager,
                };

                set(state => ({
                  notebookRuntimes: new Map(state.notebookRuntimes).set(
                    notebookId,
                    notebookRuntime
                  ),
                  activeNotebookId: notebookId, // Set as active if successfully reconnected
                }));

                console.info(
                  `[RuntimeStore] Successfully reconnected to runtime ${podName}`
                );
                get().saveRuntimesToStorage();
              }
            } catch (error) {
              console.error(
                `[RuntimeStore] Failed to reconnect to runtime ${podName}:`,
                error
              );
              // Remove invalid runtime from storage
              get().removeRuntimeFromStorage(notebookId);
            }
          } else {
            console.info(
              `[RuntimeStore] Runtime ${podName} is no longer active, removing from storage`
            );
            get().removeRuntimeFromStorage(notebookId);
          }
        }
      }
    } catch (error) {
      console.error('[RuntimeStore] Error during runtime reconnection:', error);
    }
  },

  // Create service manager from existing runtime data
  createServiceManagerFromRuntime: async (
    runtime: Record<string, unknown>,
    _notebookId: string,
    _notebookPath: string
  ): Promise<ServiceManager.IManager | null> => {
    try {
      // RACE CONDITION PREVENTION: Check if runtime is terminated before creating ServiceManager
      const runtimeUid = runtime.uid as string;
      const cleanupRegistry = (window as any).__datalayerRuntimeCleanup;
      if (cleanupRegistry && runtimeUid) {
        if (
          cleanupRegistry.has(runtimeUid) &&
          cleanupRegistry.get(runtimeUid).terminated
        ) {
          console.info(
            '[RuntimeStore] 🛑 RACE CONDITION PREVENTION: Blocking ServiceManager creation for terminated runtime:',
            runtimeUid
          );
          return null;
        }
      }

      // Check if we're currently terminating any runtime
      const { isTerminatingRuntime } = get();
      if (isTerminatingRuntime) {
        console.info(
          '[RuntimeStore] 🛑 RACE CONDITION PREVENTION: Blocking ServiceManager creation during termination'
        );
        return null;
      }

      const { createProxyServiceManager } = await import(
        '../services/proxyServiceManager'
      );

      const runtimeData = {
        pod_name: runtime.pod_name as string,
        ingress: runtime.ingress as string,
        token: runtime.token as string,
        uid: runtime.uid as string,
      };

      console.info(
        `[RuntimeStore] Creating service manager for existing runtime:`,
        runtimeData
      );

      const serviceManager = await createProxyServiceManager(
        runtimeData.ingress,
        runtimeData.token,
        runtimeData.uid
      );

      return serviceManager;
    } catch (error) {
      console.error(
        '[RuntimeStore] Failed to create service manager from runtime:',
        error
      );
      return null;
    }
  },

  // Remove runtime from storage
  removeRuntimeFromStorage: (notebookId: string) => {
    const storedData = sessionStorage.getItem('datalayer-runtimes');
    if (storedData) {
      try {
        const parsedData = JSON.parse(storedData);
        if (
          parsedData.notebookRuntimes &&
          parsedData.notebookRuntimes[notebookId]
        ) {
          delete parsedData.notebookRuntimes[notebookId];
          sessionStorage.setItem(
            'datalayer-runtimes',
            JSON.stringify(parsedData)
          );
        }
      } catch (error) {
        console.error(
          '[RuntimeStore] Error removing runtime from storage:',
          error
        );
      }
    }
  },

  loadRuntimesFromStorage: () => {
    const stored = sessionStorage.getItem('datalayer-runtimes');
    if (!stored) return;

    try {
      const runtimesData = JSON.parse(stored);
      const newRuntimes = new Map<string, NotebookRuntime>();

      runtimesData.forEach((item: Record<string, any>) => {
        newRuntimes.set(item.notebookId as string, {
          notebookId: item.notebookId as string,
          notebookPath: item.notebookPath as string | undefined,
          runtime: item.runtime as Runtime,
        });
      });

      set({ notebookRuntimes: newRuntimes });
    } catch (error) {
      console.error('Failed to load runtimes from storage:', error);
    }
  },

  // Single notebook enforcement
  canOpenNotebook: notebookId => {
    const { notebookRuntimes, activeNotebookId } = get();

    // If this notebook already has a runtime, allow opening it
    if (notebookRuntimes.has(notebookId)) {
      return { allowed: true };
    }

    // If there's an active notebook that's different, deny
    if (activeNotebookId && activeNotebookId !== notebookId) {
      return {
        allowed: false,
        message:
          'You can only have one notebook open at a time. Please close the current notebook first.',
      };
    }

    // If any other runtime exists, deny
    if (notebookRuntimes.size > 0) {
      return {
        allowed: false,
        message:
          'You can only have one notebook open at a time. Please close the current notebook first.',
      };
    }

    return { allowed: true };
  },
}));
