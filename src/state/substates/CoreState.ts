/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { createStore } from 'zustand/vanilla';
import { useStore } from 'zustand';
import type { IDatalayerCoreConfig } from '../../config/Configuration';
import { configLogger } from '../../utils/Logger';

let loadConfigurationFromServer = true;

let initialConfiguration: IDatalayerCoreConfig = {
  token: '',
  credits: 0,
  cpuEnvironment: 'ai-agents-env"',
  gpuEnvironment: 'ai-env',
  useMock: false,
  whiteLabel: true,
  loadConfigurationFromServer: true,
  jupyterServerless: false,
  iamUrl: 'https://prod1.datalayer.run',
  contentsUrl: 'https://r1.datalayer.run',
  managerUrl: 'https://prod1.datalayer.run',
  runtimesUrl: 'https://r1.datalayer.run',
  schedulerUrl: 'https://prod1.datalayer.run',
  libraryUrl: 'https://prod1.datalayer.run',
  spacerUrl: 'https://prod1.datalayer.run',
  aiAgentsUrl: 'https://prod1.datalayer.run',
  aiInferenceUrl: 'https://prod1.datalayer.run',
  jupyterMcpServerUrl: 'https://mcp.datalayer.run/mcp',
  otelUrl: 'https://prod1.datalayer.run',
  // Defaults to prod so telemetry is consumed from the production OTEL service
  growthUrl: 'https://prod1.datalayer.run',
  inboundsUrl: 'https://prod1.datalayer.run',
  successUrl: 'https://prod1.datalayer.run',
  supportUrl: 'https://prod1.datalayer.run',
  launcher: {
    category: 'Datalayer',
    name: 'Datalayer',
    icon: null,
    rank: 1,
  },
  brand: {
    name: 'Datalayer',
    about: 'AI Agents for Data Analysis',
    logoUrl: 'https://assets.datalayer.tech/datalayer-25.svg',
    logoSquareUrl: 'https://assets.datalayer.tech/datalayer-square.png',
    copyright: '© 2025 Datalayer, Inc',
    docsUrl: 'https://datalayer.ai/docs',
    supportUrl: 'https://datalayer.ai/support',
    termsUrl: 'https://datalayer.ai/terms',
    pricingUrl: 'https://datalayer.ai/pricing',
    privacyUrl: 'https://datalayer.ai/privacy',
  },
};

/**
 * What the page itself stated, as opposed to what this module defaults to.
 *
 * The two cannot be told apart once merged, and they do not carry the same
 * weight: a value written into the page describes the deployment that served
 * it, while a default is only a guess. A consumer that reconciles this
 * configuration with another source — the Jupyter server extension, say —
 * needs to know which keys were actually stated, or it will let a stale
 * answer from elsewhere override a deliberate one from here.
 */
export const pageConfiguration: Partial<IDatalayerCoreConfig> = {};

// Try loading initial state from datalayer-config-data element
try {
  if (typeof document !== 'undefined') {
    const rawConfig = document.getElementById('datalayer-config-data');
    if (rawConfig?.innerText) {
      const htmlOverridingConfiguration = JSON.parse(
        rawConfig?.innerText || '{}',
      ) as IDatalayerCoreConfig;
      Object.assign(pageConfiguration, htmlOverridingConfiguration);
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
      configLogger.info(
        'Datalayer configuration loaded from HTML page',
        initialConfiguration,
      );
      window.document.title = `${initialConfiguration.brand.name} ☰ ${initialConfiguration.brand.about}`;
    }
  }
} catch (error) {
  configLogger.debug('No valid configuration found in the webpage.', error);
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
    configLogger.debug('Setting Datalayer configuration', configuration);
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

/**
 * The OTEL base URL used to *consume* (read/query) telemetry.
 *
 * One address, `otelUrl`. A second one existed so local development could read
 * from a remote service while exporting elsewhere; pointing `otelUrl` at that
 * remote does the same thing without two fields that disagree.
 */
export const getOtelConsumeUrl = (): string =>
  coreStore.getState().configuration.otelUrl;

export default useCoreStore;
