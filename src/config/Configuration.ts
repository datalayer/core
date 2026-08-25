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
   * @example "ai-agents-env"
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
  iamUrl: string;
  /**
   * Contents API URL.
   */
  contentsUrl: string;
  /**
   * Manager API URL.
   */
  managerUrl: string;
  /**
   * Runtimes API URL.
   */
  runtimesUrl: string;
  /**
   * Scheduler API URL.
   */
  schedulerUrl: string;
  /**
   * Spacer API URL.
   */
  spacerUrl: string;
  /**
   * Library API URL.
   */
  libraryUrl: string;
  /**
   * AI Agents API URL.
   */
  aiAgentsUrl: string;
  /**
   * AI Inference API URL.
   */
  aiInferenceUrl: string;
  /**
   * Jupyter MCP Server URL.
   */
  jupyterMcpServerUrl: string;
  /**
   * OTEL (OpenTelemetry) API URL.
   *
   * This is the endpoint runtimes/agents export telemetry to. In the browser
   * it is also the default endpoint used to *consume* (query) telemetry, unless
   * {@link otelInUrl} is provided.
   */
  otelUrl: string;
  /**
   * OTEL (OpenTelemetry) *consume* (read/query) API URL override.
   *
   * When set, the UI reads telemetry (metrics, traces, logs) from this URL
   * instead of {@link otelUrl}. When empty/undefined, {@link otelUrl} is used.
   *
   * Primary use case: local development. When runtimes run in the cloud and
   * export their telemetry to the production OTEL service, a local UI must fetch
   * telemetry from production rather than from the local OTEL endpoint. Set this
   * to e.g. `https://prod1.datalayer.run` while `otelUrl` stays local.
   *
   * Fed by the `DATALAYER_OTEL_IN_URL` environment variable at build/deploy time.
   */
  otelInUrl?: string;
  /**
   * Growth API URL.
   */
  growthUrl: string;
  /**
   * Inbounds API URL.
   */
  inboundsUrl: string;
  /**
   * Success API URL.
   */
  successUrl: string;
  /**
   * Support API URL.
   */
  supportUrl: string;
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
/**
 * Where a service lives when nothing says otherwise.
 *
 * Each service has a URL of its own — `iamUrl`, `runtimesUrl`, … — and this is
 * what each of them falls back to.
 */
export const DEFAULT_DATALAYER_SERVICE_URL = 'https://prod1.datalayer.run';

/**
 * Where the Contents service lives when nothing says otherwise.
 *
 * Not the generic default: Contents runs on the runtimes plane, where the NFS that backs the Home Folder and Volumes lives.
 */
export const DEFAULT_DATALAYER_CONTENTS_URL = 'https://r1.datalayer.run';

export const DEFAULT_DATALAYER_CONFIG: Partial<IDatalayerCoreConfig> = {
  iamUrl: DEFAULT_DATALAYER_SERVICE_URL,
  contentsUrl: DEFAULT_DATALAYER_CONTENTS_URL,
  credits: 100,
  cpuEnvironment: 'ai-agents-env',
  gpuEnvironment: 'ai-env',
};

/**
 * Type guard to check if a config object is a valid IDatalayerConfig
 */
export function isDatalayerConfig(config: any): config is IDatalayerCoreConfig {
  return (
    config &&
    typeof config === 'object' &&
    typeof config.iamUrl === 'string' &&
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

  // If we have required fields (token and iamUrl), merge with defaults for optional fields
  if (config.token && config.iamUrl) {
    return {
      iamUrl: config.iamUrl,
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
