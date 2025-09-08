/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Runtime Store
 * Manages the state of compute runtimes
 */

import { create } from 'zustand';
import { ServiceManager } from '@jupyterlab/services';

interface Runtime {
  uid: string;
  given_name?: string;
  pod_name: string;
  ingress?: string;
  token?: string;
  environment_name?: string;
  environment_title?: string;
  type?: string;
  burning_rate?: number;
  reservation_id?: string;
  started_at?: string;
  expired_at?: string;
  status?: string;
  [key: string]: unknown;
}

interface NotebookRuntime {
  notebookId: string;
  notebookPath?: string;
  runtime: Runtime;
  serviceManager?: ServiceManager.IManager;
}

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
    const { notebookRuntimes, setIsCreatingRuntime, setRuntimeError } = get();

    // Check if this notebook already has a runtime
    const existingRuntime = notebookRuntimes.get(notebookId);
    if (existingRuntime) {
      console.info(
        `Reusing existing runtime for notebook ${notebookId}:`,
        existingRuntime.runtime.uid
      );
      return existingRuntime.runtime;
    }

    setIsCreatingRuntime(true);
    setRuntimeError(null);

    try {
      console.info(
        `Creating new runtime for notebook ${notebookId} with options:`,
        options
      );

      // Add timestamp to ensure unique runtime names
      const timestamp = Date.now().toString(36); // Convert to base36 for shorter string
      const result = await (window as any).datalayerAPI.createRuntime({
        environment: options?.environment || 'python-cpu-env',
        name: `electron-example-${notebookId}-${timestamp}`,
        credits: options?.credits || 10,
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
    const { notebookRuntimes, setIsTerminatingRuntime, setRuntimeError } =
      get();
    const notebookRuntime = notebookRuntimes.get(notebookId);

    if (!notebookRuntime) {
      console.info(`No runtime to terminate for notebook ${notebookId}`);
      return;
    }

    setIsTerminatingRuntime(true);
    setRuntimeError(null);

    try {
      console.info(
        `Terminating runtime for notebook ${notebookId}:`,
        notebookRuntime.runtime.uid
      );

      // Close WebSocket connections for this runtime first
      try {
        console.info(
          `🔴 [WebSocket Cleanup] Attempting to close connections for runtime: ${notebookRuntime.runtime.uid}`
        );
        const result = await (window as any).proxyAPI.websocketCloseRuntime({
          runtimeId: notebookRuntime.runtime.uid,
        });
        console.info(`🔴 [WebSocket Cleanup] Cleanup result:`, result);
      } catch (error) {
        console.error(
          '🔴 [WebSocket Cleanup] Failed to close WebSocket connections:',
          error
        );
      }

      // Clean up collaboration provider WebSocket connections
      try {
        console.info(
          `🤝 [Collaboration Cleanup] Attempting to clean up collaboration provider for runtime: ${notebookRuntime.runtime.uid}`
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
          `🤝 [Collaboration Cleanup] Cleanup event dispatched for runtime: ${notebookRuntime.runtime.uid}`
        );
      } catch (error) {
        console.error(
          '🤝 [Collaboration Cleanup] Failed to dispatch cleanup event:',
          error
        );
      }

      // Dispose service manager after WebSocket cleanup
      if (
        notebookRuntime.serviceManager &&
        !notebookRuntime.serviceManager.isDisposed
      ) {
        console.info('Disposing service manager...');

        // Aggressive cleanup: Force stop any kernel polling/requests
        try {
          const serviceManager = notebookRuntime.serviceManager as any;

          // Stop kernel manager polling if it exists
          if (
            serviceManager.kernels &&
            typeof serviceManager.kernels.dispose === 'function'
          ) {
            console.info('🛑 [Aggressive Cleanup] Disposing kernel manager');
            serviceManager.kernels.dispose();
          }

          // Stop session manager polling if it exists
          if (
            serviceManager.sessions &&
            typeof serviceManager.sessions.dispose === 'function'
          ) {
            console.info('🛑 [Aggressive Cleanup] Disposing session manager');
            serviceManager.sessions.dispose();
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

        notebookRuntime.serviceManager.dispose();
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
        console.info('🛑 [Targeted Cleanup] Runtime URL to clean:', runtimeUrl);

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
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to terminate runtime';
      console.error('Error terminating runtime:', errorMessage);
      setRuntimeError(errorMessage);
    } finally {
      setIsTerminatingRuntime(false);
    }
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
