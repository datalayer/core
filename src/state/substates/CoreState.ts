/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { createStore } from 'zustand/vanilla';
import { useStore } from 'zustand';
import type { IDatalayerCoreConfig } from '../../config/Configuration';

let loadConfigurationFromServer = true;

let initialConfiguration: IDatalayerCoreConfig = {
  runUrl: 'https://prod1.datalayer.run',
  token: '',
  credits: 0,
  cpuEnvironment: 'python-cpu-env"',
  gpuEnvironment: 'ai-env',
  useMock: false,
  whiteLabel: true,
  loadConfigurationFromServer: true,
  jupyterServerless: false,
  iamRunUrl: 'https://prod1.datalayer.run',
  runtimesRunUrl: 'https://prod1.datalayer.run',
  libraryRunUrl: 'https://prod1.datalayer.run',
  spacerRunUrl: 'https://prod1.datalayer.run',
  aiagentsRunUrl: 'https://prod1.datalayer.run',
  growthRunUrl: 'https://prod1.datalayer.run',
  inboundsRunUrl: 'https://prod1.datalayer.run',
  successRunUrl: 'https://prod1.datalayer.run',
  supportRunUrl: 'https://prod1.datalayer.run',
  launcher: {
    category: 'Datalayer',
    name: 'Datalayer Runtimes',
    icon: 'https://raw.githubusercontent.com/datalayer/icons/main/svg/data1/jupyter-base.svg',
    rank: 1,
  },
  brand: {
    name: 'Datalayer',
    about: 'AI Platform for Data Analysis',
    logoUrl: 'https://assets.datalayer.tech/datalayer-25.svg',
    logoSquareUrl: 'https://assets.datalayer.tech/datalayer-square.png',
    copyright: '© 2025 Datalayer, Inc',
    docsUrl: 'https://docs.datalayer.app',
    supportUrl: 'https://datalayer.app/support',
    termsUrl: 'https://datalayer.app/terms',
    pricingUrl: 'https://datalayer.app/pricing',
    privacyUrl: 'https://datalayer.app/privacy',
  },
};

// Try loading initial state from datalayer-config-data element
try {
  if (typeof document !== 'undefined') {
    const rawConfig = document.getElementById('datalayer-config-data');
    if (rawConfig?.innerText) {
      const htmlOverridingConfiguration = JSON.parse(
        rawConfig?.innerText || '{}',
      ) as IDatalayerCoreConfig;
      if (
        htmlOverridingConfiguration.loadConfigurationFromServer != undefined
      ) {
        loadConfigurationFromServer =
          htmlOverridingConfiguration.loadConfigurationFromServer;
      }
      initialConfiguration = {
        ...initialConfiguration,
        ...htmlOverridingConfiguration,
      };
      console.log(
        'Datalayer configuration loaded from HTML page',
        initialConfiguration,
      );
      window.document.title = `${initialConfiguration.brand.name} Ξ ${initialConfiguration.brand.about}`;
    }
  }
} catch (error) {
  console.debug('No valid configuration found in the webpage.', error);
}

export type DatalayerCoreState = {
  tab: number;
  getIntTab: () => number;
  setTab: (tab: number) => void;
  /**
   * Datalayer configuration
   */
  configuration: IDatalayerCoreConfig;
  /**
   * Set the Datalayer configuration
   */
  setConfiguration: (configuration: Partial<IDatalayerCoreConfig>) => void;
  /**
   * Package version
   */
  version: string;
  setVersion: (version: string) => void;
  loadConfigurationFromServer: boolean;
  setLoadConfigurationFromServer: (
    loadConfigurationFromServer: boolean,
  ) => void;
};

export const coreStore = createStore<DatalayerCoreState>((set, get) => ({
  tab: 0.0,
  getIntTab: () => Math.floor(get().tab),
  setTab: (tab: number) => set((state: DatalayerCoreState) => ({ tab })),
  configuration: initialConfiguration,
  setConfiguration: (configuration?: Partial<IDatalayerCoreConfig>) => {
    console.log('Setting Datalayer configuration', configuration);
    set(state => ({
      configuration: {
        ...state.configuration,
        ...configuration,
      },
    }));
  },
  version: '',
  setVersion: version => {
    if (version && !get().version) {
      set(state => ({ version }));
    }
  },
  loadConfigurationFromServer,
  setLoadConfigurationFromServer: (loadConfigurationFromServer: boolean) => {
    set(state => ({ loadConfigurationFromServer }));
  },
}));

export function useCoreStore(): DatalayerCoreState;
export function useCoreStore<T>(selector: (state: DatalayerCoreState) => T): T;
export function useCoreStore<T>(selector?: (state: DatalayerCoreState) => T) {
  return useStore(coreStore, selector!);
}

export default useCoreStore;
