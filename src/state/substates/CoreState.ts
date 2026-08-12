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
  datalayerUrl: 'https://prod1.datalayer.run',
  token: '',
  credits: 0,
  cpuEnvironment: 'ai-agents-env"',
  gpuEnvironment: 'ai-env',
  useMock: false,
  whiteLabel: true,
  loadConfigurationFromServer: true,
  jupyterServerless: false,
  iamUrl: 'https://prod1.datalayer.run',
  managerUrl: 'https://prod1.datalayer.run',
  runtimesUrl: 'https://r1.datalayer.run',
  schedulerUrl: 'https://prod1.datalayer.run',
  libraryUrl: 'https://prod1.datalayer.run',
  spacerUrl: 'https://prod1.datalayer.run',
  aiAgentsUrl: 'https://prod1.datalayer.run',
  aiInferenceUrl: 'https://prod1.datalayer.run',
  mcpServersUrl: 'https://prod1.datalayer.run',
  otelUrl: 'https://prod1.datalayer.run',
  // Defaults to prod so telemetry is consumed from the production OTEL service
  // even when runtimes export elsewhere (see `getOtelConsumeUrl` and the
  // `DATALAYER_OTEL_IN_URL` env var). Override to '' to consume from `otelUrl`.
  otelInUrl: 'https://prod1.datalayer.run',
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
 * Resolve the OTEL base URL used to *consume* (read/query) telemetry.
 *
 * Prefers `otelInUrl` when set, otherwise falls back to `otelUrl`. This allows
 * local development to fetch telemetry from a remote (e.g. production) OTEL
 * service even when the local runtime exports telemetry to a different endpoint.
 *
 * Mirrors the `DATALAYER_OTEL_IN_URL` (consume) / `DATALAYER_OTEL_URL` (export)
 * split on the backend/build side.
 */
export const getOtelConsumeUrl = (): string => {
  const cfg = coreStore.getState().configuration;
  return cfg.otelInUrl || cfg.otelUrl;
};

export default useCoreStore;
