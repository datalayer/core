/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Configuration interface for Datalayer platform integration
 * 
 * This interface defines the configuration needed to connect to
 * and interact with the Datalayer platform services.
 */
export interface IDatalayerConfig {
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
}

/**
 * Default configuration values for Datalayer
 */
export const DEFAULT_DATALAYER_CONFIG: Partial<IDatalayerConfig> = {
  runUrl: 'https://prod1.datalayer.run',
  credits: 100,
  cpuEnvironment: 'python-cpu-env',
  gpuEnvironment: 'ai-env',
};

/**
 * Type guard to check if a config object is a valid IDatalayerConfig
 */
export function isDatalayerConfig(config: any): config is IDatalayerConfig {
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
export function mergeConfigWithDefaults(config?: Partial<IDatalayerConfig>): IDatalayerConfig | undefined {
  if (!config) return undefined;
  
  // If we have required fields (token and runUrl), merge with defaults for optional fields
  if (config.token && config.runUrl) {
    return {
      runUrl: config.runUrl,
      token: config.token,
      credits: config.credits ?? DEFAULT_DATALAYER_CONFIG.credits!,
      cpuEnvironment: config.cpuEnvironment ?? DEFAULT_DATALAYER_CONFIG.cpuEnvironment!,
      gpuEnvironment: config.gpuEnvironment ?? DEFAULT_DATALAYER_CONFIG.gpuEnvironment!,
    };
  }
  
  // If missing required fields, return undefined
  return undefined;
}
