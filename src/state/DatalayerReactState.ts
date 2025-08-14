/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { StoreApi } from 'zustand/vanilla';
import { useStore } from 'zustand';
import { jupyterReactStore, JupyterReactState } from '@datalayer/jupyter-react';
import type { IDatalayerConfig } from './IDatalayerConfig';

/**
 * Extended state interface for Datalayer-specific functionality
 * This adds Datalayer-specific configuration to the base JupyterReactState
 */
export interface DatalayerReactState extends JupyterReactState {
  datalayerConfig?: IDatalayerConfig;
  setDatalayerConfig: (configuration?: IDatalayerConfig) => void;
}

// Try to load initial Datalayer configuration from DOM
let initialDatalayerConfig: IDatalayerConfig | undefined = undefined;

try {
  const pageConfig = document.getElementById('datalayer-config-data');
  if (pageConfig?.innerText) {
    initialDatalayerConfig = JSON.parse(pageConfig.innerText) as IDatalayerConfig;
    console.debug('Loaded Datalayer configuration from page', initialDatalayerConfig);
  }
} catch (error) {
  console.debug('Issue loading Datalayer configuration from page', error);
}

/**
 * Creates a Datalayer-enhanced Jupyter React store
 * This extends the base JupyterReactStore with typed Datalayer configuration
 */
export const datalayerReactStore: StoreApi<DatalayerReactState> = (() => {
  // Get the base store state and actions
  const baseStore = jupyterReactStore as StoreApi<DatalayerReactState>;
  
  // Set initial Datalayer configuration if found
  if (initialDatalayerConfig) {
    baseStore.setState({
      datalayerConfig: initialDatalayerConfig,
      setDatalayerConfig: (datalayerConfig?: IDatalayerConfig) => {
        baseStore.setState({ datalayerConfig });
      }
    });
  } else {
    // Ensure setDatalayerConfig is typed correctly even if no initial config
    baseStore.setState({
      setDatalayerConfig: (datalayerConfig?: IDatalayerConfig) => {
        baseStore.setState({ datalayerConfig });
      }
    });
  }
  
  return baseStore;
})();

/**
 * Hook to use the Datalayer React store
 */
export function useDatalayerReactStore(): DatalayerReactState;
export function useDatalayerReactStore<T>(selector: (state: DatalayerReactState) => T): T;
export function useDatalayerReactStore<T>(selector?: (state: DatalayerReactState) => T) {
  return useStore(datalayerReactStore, selector!);
}

/**
 * For backwards compatibility and consistency with jupyterReactStore naming
 */
export { datalayerReactStore as jupyterReactStoreWithDatalayer };

export default useDatalayerReactStore;