/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { ISignal, Signal } from '@lumino/signaling';
import { coreStore } from '../state';

export const FORCE_ACTIVATE_RUNTIMES_PLUGINS = false;

/**
 * Configuration interface for Datalayer platform integration
 *
 * This interface defines the configuration needed to connect to
 * and interact with the Datalayer platform services.
 */
export type IDatalayerCoreConfig = {
  /**
   * Datalayer RUN URL.
   * The base URL for the Datalayer platform API.
   * @example "https://prod1.datalayer.run"
   */
  runUrl: string;

  /**
   * Datalayer API authentication token.
   * Used for authenticating requests to the Datalayer platform.
   */
  token: string;

  /**
   * Credits limit for kernel usage.
   * Determines the maximum credits that can be consumed by kernels.
   */
  credits: number;

  /**
   * CPU environment name.
   * Specifies which CPU-based environment to use for kernels.
   * @example "python-cpu-env"
   */
  cpuEnvironment: string;

  /**
   * GPU environment name.
   * Specifies which GPU-enabled environment to use for kernels.
   * @example "ai-env"
   */
  gpuEnvironment: string;

  /**
   * Use mock model, useful for e.g. storybooks.
   */
  useMock: boolean;
  /**
   * Does the webapp need a jupyter server.
   */
  jupyterServerless: boolean;
  /**
   * IAM API URL.
   */
  iamRunUrl: string;
  /**
   * Runtimes API URL.
   */
  runtimesRunUrl: string;
  /**
   * Spacer API URL.
   */
  spacerRunUrl: string;
  /**
   * Library API URL.
   */
  libraryRunUrl: string;
  /**
   * AI Agents API URL.
   */
  aiagentsRunUrl: string;
  /**
   * AI Inference API URL.
   */
  aiinferenceRunUrl: string;
  /**
   * MCP Servers API URL.
   */
  mcpserversRunUrl: string;
  /**
   * Growth API URL.
   */
  growthRunUrl: string;
  /**
   * Inbounds API URL.
   */
  inboundsRunUrl: string;
  /**
   * Success API URL.
   */
  successRunUrl: string;
  /**
   * Support API URL.
   */
  supportRunUrl: string;
  /**
   * Load configuration from server.
   */
  loadConfigurationFromServer: boolean;
  /**
   * Launcher card customization.
   */
  launcher: {
    /**
     * Card category.
     */
    category: string;
    /**
     * Card name.
     */
    name: string;
    /**
     * Card icon SVG URL.
     */
    icon: string | null;
    /**
     * Card rank.
     */
    rank: number;
  };
  /**
   * Brand customization.
   */
  brand: {
    name: string;
    logoUrl: string;
    logoSquareUrl: string;
    about: string;
    copyright: string;
    docsUrl: string;
    supportUrl: string;
    pricingUrl: string;
    termsUrl: string;
    privacyUrl: string;
  };
  /**
   * Whether to display the white labelled user interface or not.
   */
  whiteLabel: boolean;
};

export interface IRuntimesConfiguration {
  /**
   * Maximal number of notebook remote runtimes per user.
   */
  maxNotebookRuntimes: number;
  /**
   * Maximal number of cell remote runtimes per user.
   */
  maxCellRuntimes: number;
}

export class DatalayerConfiguration {
  private _configuration: IDatalayerCoreConfig =
    coreStore.getState().configuration;
  private _configurationChanged: Signal<
    DatalayerConfiguration,
    IDatalayerCoreConfig
  >;
  constructor() {
    this._configurationChanged = new Signal<
      DatalayerConfiguration,
      IDatalayerCoreConfig
    >(this);
  }
  set configuration(configuration: IDatalayerCoreConfig) {
    this._configuration = configuration;
    this._configurationChanged.emit(configuration);
  }
  get configuration(): IDatalayerCoreConfig {
    return this._configuration;
  }
  get configurationChanged(): ISignal<
    DatalayerConfiguration,
    IDatalayerCoreConfig
  > {
    return this._configurationChanged;
  }
}

/**
 * Default configuration values for Datalayer
 */
export const DEFAULT_DATALAYER_CONFIG: Partial<IDatalayerCoreConfig> = {
  runUrl: 'https://prod1.datalayer.run',
  credits: 100,
  cpuEnvironment: 'python-cpu-env',
  gpuEnvironment: 'ai-env',
};

/**
 * Type guard to check if a config object is a valid IDatalayerConfig
 */
export function isDatalayerConfig(config: any): config is IDatalayerCoreConfig {
  return (
    config &&
    typeof config === 'object' &&
    typeof config.runUrl === 'string' &&
    typeof config.token === 'string' &&
    typeof config.credits === 'number' &&
    typeof config.cpuEnvironment === 'string' &&
    typeof config.gpuEnvironment === 'string'
  );
}

/**
 * Helper function to merge partial config with defaults
 * @param config Partial configuration to merge
 * @returns Complete configuration with defaults applied, or undefined if required fields missing
 */
export function mergeConfigWithDefaults(
  config?: Partial<IDatalayerCoreConfig>,
): Partial<IDatalayerCoreConfig> | undefined {
  if (!config) return undefined;

  // If we have required fields (token and runUrl), merge with defaults for optional fields
  if (config.token && config.runUrl) {
    return {
      runUrl: config.runUrl,
      token: config.token,
      credits: config.credits ?? DEFAULT_DATALAYER_CONFIG.credits!,
      cpuEnvironment:
        config.cpuEnvironment ?? DEFAULT_DATALAYER_CONFIG.cpuEnvironment!,
      gpuEnvironment:
        config.gpuEnvironment ?? DEFAULT_DATALAYER_CONFIG.gpuEnvironment!,
    };
  }

  // If missing required fields, return undefined
  return undefined;
}

export default DatalayerConfiguration;
