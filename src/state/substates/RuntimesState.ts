/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';
import type { JupyterLabAppAdapter } from '@datalayer/jupyter-react';
import { JSONExt } from '@lumino/coreutils';
import { Poll } from '@lumino/polling';
import type { IMultiServiceManager } from '../../api';
import { getRuntimes } from '../../api';
import type { IRuntimesConfiguration } from '../../config/Configuration';
import type { IRuntimePod, IRuntimeSnapshot, IRuntimeModel } from '../../models';
import { coreStore } from './CoreState';
import { iamStore } from './IAMState';

/**
 * Datalayer Runtimes state.
 */
export type RuntimesState = {
  /**
   * Runtimes configuration
   */
  configuration: IRuntimesConfiguration;
  setConfiguration: (config: IRuntimesConfiguration) => void;
  /**
   * Runtimes RUN URL.
   */
  runtimesRunUrl: string;
  /**
   * JupyterLabApp adapter.
   */
  jupyterLabAdapter?: JupyterLabAppAdapter;
  /**
   * Set the JupyterLabAdapter.
   */
  setJupyterLabAdapter: (jupyterLabAdapter: JupyterLabAppAdapter) => void;
  tab: number;
  getIntTab: () => number;
  setTab: (tab: number) => void;
  /**
   * Runtime pods.
   */
  runtimePods: IRuntimePod[];
  /**
   * Refresh the runtime pods.
   */
  refreshRuntimePods: () => Promise<void>;
  /**
   * Cached runtime models.
   */
  runtimeModels: readonly IRuntimeModel[];
  /**
   * Add a runtime model.
   */
  addRuntimeModel: (model: IRuntimeModel) => void;
  /**
   * Remove a runtime model by ID.
   */
  removeRuntimeModel: (id: string) => void;
  /**
   * Set the runtimes models list.
   */
  setRuntimeModels: (models: readonly IRuntimeModel[]) => void;
  /**
   * Jupyter service manager.
   */
  multiServiceManager?: IMultiServiceManager;
  setMultiServiceManager: (multiServiceManager: IMultiServiceManager) => void;
  showDisclaimer: boolean;
  setShowDisclaimer: (showDisclaimer: boolean) => void;
  /**
   * Runtime snapshots.
   */
  runtimeSnapshots: readonly IRuntimeSnapshot[];
  /**
   * Add a runtime snapshot.
   */
  addRuntimeSnapshot: (snapshot: IRuntimeSnapshot) => void;
  /**
   * Remove a Runtime Snapshot.
   */
  removeRuntimeSnapshot: (id: string) => void;
  /**
   * Set Runtime Snapshots.
   */
  setRuntimeSnapshots: (snapshots: IRuntimeSnapshot[]) => void;
  /**
   * Package version.
   */
  version: string;
  setVersion: (version: string) => void;
};

/**
 * Kernel store
 */
export const runtimesStore = createStore<RuntimesState>((set, get) => {
  return {
    configuration: {
      maxNotebookRuntimes: 5,
      maxCellRuntimes: 3
    },
    setConfiguration: (configuration: IRuntimesConfiguration) => {
      set(state =>
        JSONExt.deepEqual(state.configuration as any, configuration as any)
          ? {}
          : { configuration: { ...configuration } }
      );
    },
    runtimesRunUrl: coreStore.getState().configuration?.runtimesRunUrl,
    setJupyterLabAdapter: (jupyterLabAdapter: JupyterLabAppAdapter) => {
      set(state => ({ jupyterLabAdapter }));
    },
    tab: 0.0,
    getIntTab: () => Math.floor(get().tab),
    setTab: (tab: number) => set(state => ({ tab })),
    /**
     * Remote runtime pods.
     */
    runtimePods: [],
    /**
     * Refresh the runtime pods.
     */
    refreshRuntimePods: async () => {
      const servers = await getRuntimes();
      // Update the state with the Remote Kernels.
      if (!JSONExt.deepEqual(get().runtimePods as any, servers as any)) {
        set({ runtimePods: [...servers] });
      }
    },
    /**
     * Cached runtime models.
     */
    runtimeModels: [],
    /**
     * Add a runtime model
     */
    addRuntimeModel: (model: IRuntimeModel) => {
      const kernels = get().runtimeModels;
      const index = kernels.findIndex(m => model.id === m.id) ?? -1;
      if (index < 0) {
        set({ runtimeModels: [...kernels, model] });
      }
    },
    /**
     * Remove a runtime model by ID.
     */
    removeRuntimeModel: (id: string) => {
      const kernels = [...get().runtimeModels];
      const index = kernels?.findIndex(model => id === model.id) ?? -1;
      if (index >= 0) {
        kernels.splice(index, 1);
        set({ runtimeModels: kernels });
      }
    },
    setRuntimeModels: (models: readonly IRuntimeModel[]) => {
      if (!JSONExt.deepEqual(get().runtimeModels as any, models as any)) {
        set({ runtimeModels: [...models] });
      }
    },
    multiServiceManager: undefined,
    setMultiServiceManager: multiServiceManager => {
      set(state => ({ multiServiceManager }));
    },
    showDisclaimer: false,
    setShowDisclaimer: showDisclaimer => {
      set(state => ({ showDisclaimer }));
    },
    /**
     * Kernel Snapshots.
     */
    runtimeSnapshots: [],
    /**
     * Add a Kernel Snapshot
     */
    addRuntimeSnapshot: (snapshot: IRuntimeSnapshot) => {
      const snapshots = get().runtimeSnapshots;
      const index = snapshots.findIndex(s => s.id === snapshot.id);
      if (index < 0) {
        const kernelSnapshots = [...snapshots, snapshot];
        set({ runtimeSnapshots: kernelSnapshots });
      } else if (!JSONExt.deepEqual(snapshots[index] as any, snapshot as any)) {
        const kernelSnapshots = [...snapshots];
        kernelSnapshots.splice(index, 1, snapshot);
        set({ runtimeSnapshots: kernelSnapshots });
      }
    },
    /**
     * Remove a Kernel Snapshot.
     */
    removeRuntimeSnapshot: (id: string) => {
      const snapshots = get().runtimeSnapshots;
      const index = snapshots.findIndex(s => s.id === id);
      if (index >= 0) {
        const kernelSnapshots = [...snapshots];
        kernelSnapshots.splice(index, 1);
        set({ runtimeSnapshots: kernelSnapshots });
      }
    },
    /**
     * Set Kernel Snapshots.
     */
    setRuntimeSnapshots: (snapshots: IRuntimeSnapshot[]) => {
      if (!JSONExt.deepEqual(get().runtimeSnapshots as any, snapshots as any)) {
        set({ runtimeSnapshots: [...snapshots] });
      }
    },
    version: '',
    setVersion: version => {
      if (version && !get().version) {
        set(state => ({ version }));
      }
    }
  };
});

// Poll remote kernels
const kernelsPoll = new Poll({
  auto: true,
  factory: () => runtimesStore.getState().refreshRuntimePods(),
  frequency: {
    interval: 61 * 1000,
    backoff: true,
    max: 300 * 1000
  },
  name: '@datalayer/jupyter-kernels:KernelsManager#kernels',
  standby: () =>
    iamStore.getState().token || runtimesStore.getState().runtimesRunUrl
      ? 'when-hidden'
      : true
});

// Force refresh at expiration date if next tick is after it.
runtimesStore.subscribe(
  (state: RuntimesState, prevState: RuntimesState) => {
    if (
      !JSONExt.deepEqual(
        state.runtimePods as any,
        prevState.runtimePods as any
      )
    ) {
      const now = Date.now();
      const minExpiredAt =
        Math.min(
          ...state.runtimePods.map(kernel =>
            kernel.expired_at ? parseFloat(kernel.expired_at) : Infinity
          )
        ) * 1_000;
      // Refresh 2 sec after the closest expiration time
      // to let some times to the system to dispose the resources.
      if (now + kernelsPoll.frequency.interval > minExpiredAt + 2_000) {
        setTimeout(
          () => {
            kernelsPoll.refresh();
          },
          minExpiredAt + 2_000 - now
        );
      }
    }
  }
);

coreStore.subscribe((state, prevState) => {
  if (
    state.configuration.runtimesRunUrl &&
    state.configuration.runtimesRunUrl !== prevState.configuration.runtimesRunUrl
  ) {
    const runtimesRunUrl = state.configuration.runtimesRunUrl;
    console.log(`Updating runtimesRunUrl with new value ${runtimesRunUrl}`);
    runtimesStore.setState({ runtimesRunUrl });
    kernelsPoll
      .refresh()
      .then(() => kernelsPoll.tick)
      .catch(reason => {
        console.error(
          'Failed to refresh kernel servers list following service URL changed.',
          reason
        );
      });
  }
});

export function useRuntimesStore(): RuntimesState;
export function useRuntimesStore<T>(selector: (state: RuntimesState) => T): T;
export function useRuntimesStore<T>(selector?: (state: RuntimesState) => T) {
  return useStore(runtimesStore, selector!);
}

export default useRuntimesStore;
