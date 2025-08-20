/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { create } from 'zustand';
import type { IDatalayerConfig } from '../config/DatalayerRuntimeConfig';
import { mergeConfigWithDefaults } from '../config/DatalayerRuntimeConfig';

export interface DatalayerState {
  datalayerConfig?: IDatalayerConfig;
  setDatalayerConfig: (config?: IDatalayerConfig) => void;
}

// Load initial config from page if available
let initialDatalayerConfig: IDatalayerConfig | undefined = undefined;
if (typeof document !== 'undefined') {
  const pageConfig = document.getElementById('datalayer-config-data');
  if (pageConfig) {
    try {
      const parsedConfig = JSON.parse(pageConfig.innerText);
      initialDatalayerConfig = mergeConfigWithDefaults(parsedConfig);
    } catch (error) {
      console.error('Failed to parse initial Datalayer config:', error);
    }
  }
}

export const datalayerStore = create<DatalayerState>(set => ({
  datalayerConfig: initialDatalayerConfig,
  setDatalayerConfig: (config?: IDatalayerConfig) => {
    const mergedConfig = mergeConfigWithDefaults(config);
    set({ datalayerConfig: mergedConfig });
  },
}));

export const useDatalayerStore = datalayerStore;
export const useDatalayerConfig = () =>
  useDatalayerStore(state => state.datalayerConfig);
