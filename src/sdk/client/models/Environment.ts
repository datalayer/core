/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Environment domain model for the Datalayer SDK.
 *
 * @module sdk/client/models/Environment
 */

import type { Environment as EnvironmentData } from '../../../api/types/runtimes';
import type { DatalayerSDK } from '../index';

/**
 * Environment domain model that wraps API responses with convenient methods.
 * Provides information about available computational environments.
 *
 * @example
 * ```typescript
 * const environments = await sdk.listEnvironments();
 * const aiEnv = environments.find(env => env.name === 'ai-env');
 * console.log(aiEnv.title); // "AI Environment"
 * ```
 */
export class Environment {
  /** @internal */
  _data: EnvironmentData;

  /**
   * Create an Environment instance.
   *
   * @param data - Environment data from API
   * @param _sdk - SDK instance (not currently used but kept for consistency)
   */
  constructor(data: EnvironmentData, _sdk: DatalayerSDK) {
    this._data = data;
    // SDK instance not currently used but kept for future extensibility
  }

  // ========================================================================
  // Properties
  // ========================================================================

  /** Human-readable title for the environment (e.g., 'AI Environment', 'Python CPU Environment'). */
  get title(): string {
    return this._data.title;
  }

  /** Unique name identifier for the environment (e.g., 'ai-env', 'python-cpu-env'). */
  get name(): string {
    return this._data.name || '';
  }

  /** Credits consumed per hour for this environment. */
  get burningRate(): number {
    return this._data.burning_rate;
  }

  /** Rich description of the environment (contains HTML markup). */
  get richDescription(): string {
    return this._data.description;
  }

  /** Clean description without HTML tags. */
  get description(): string {
    // Simple HTML tag removal
    return this._data.description.replace(/<[^>]*>/g, '').trim();
  }

  // ========================================================================
  // Utility Methods
  // ========================================================================

  /**
   * Get raw environment data object.
   *
   * @returns Raw environment data
   */
  toJSON(): EnvironmentData {
    return this._data;
  }

  /** String representation of the environment. */
  toString(): string {
    return `Environment(${this.name}, ${this.title})`;
  }
}

// Re-export the EnvironmentData type for convenience
export type { EnvironmentData };
