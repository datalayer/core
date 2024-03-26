import { createStore } from 'zustand/vanilla';
import { useStore } from 'zustand';
import type { IDatalayerConfig } from '../jupyterlab/tokens';

export type DatalayerState = {
  tab: number;
  getIntTab: () => number;
  setTab: (tab: number) => void;

  /**
   * Global Datalayer configuration
   */
  configuration?: IDatalayerConfig;
  /**
   * Set the global datalayer configuration
   */
  setConfiguration: (configuration?: IDatalayerConfig) => void;
  /**
   * Package version
   */
  version: string;
  setVersion: (version: string) => void;
};

export const datalayerStore = createStore<DatalayerState>((set, get) => ({
  tab: 0.0,
  getIntTab: () => Math.floor(get().tab),
  setTab: (tab: number) => set((state: DatalayerState) => ({ tab })),
  configuration: undefined,
  setConfiguration: (configuration?: IDatalayerConfig) => {
    set(state => ({ configuration }));
  },
  version: '',
  setVersion: version => {
    if (version && !get().version) {
      set(state => ({ version }));
    }
  }
}));

export function useDatalayerStore(): DatalayerState;
export function useDatalayerStore<T>(selector: (state: DatalayerState) => T): T;
export function useDatalayerStore<T>(selector?: (state: DatalayerState) => T) {
  return useStore(datalayerStore, selector!);
}

export default useDatalayerStore;
