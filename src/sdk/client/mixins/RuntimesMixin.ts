/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * @module sdk/client/mixins/RuntimesMixin
 * @description Runtimes mixin for the Datalayer SDK.
 *
 * This mixin provides intuitive methods for managing computational environments,
 * runtimes, and snapshots that are mixed into the main DatalayerSDK class.
 */

import { environments, runtimes } from '../../../api/runtimes';
import type {
  Environment,
  Runtime,
  CreateRuntimeRequest,
} from '../../../api/types/runtimes';
import type { Constructor } from '../utils/mixins';

/**
 * Runtimes mixin that provides computational environment and runtime management.
 *
 * This mixin is applied to the DatalayerSDK class to provide clean, intuitive
 * methods for managing environments and runtimes.
 */
export function RuntimesMixin<TBase extends Constructor>(Base: TBase) {
  return class extends Base {
    // ========================================================================
    // Environments
    // ========================================================================

    /**
     * List all available computational environments.
     *
     * @returns Promise resolving to array of environments
     *
     * @example
     * ```typescript
     * const environments = await sdk.listEnvironments();
     * console.log('Available environments:', environments.length);
     * ```
     */
    async listEnvironments(): Promise<Environment[]> {
      const token = (this as any).getToken();
      const runtimesRunUrl = (this as any).getRuntimesRunUrl();
      const response = await environments.listEnvironments(
        token,
        runtimesRunUrl,
      );
      return response.environments;
    }

    // ========================================================================
    // Runtimes
    // ========================================================================

    /**
     * Create a new computational runtime.
     *
     * @param data - Runtime creation parameters
     * @returns Promise resolving to created runtime
     *
     * @example
     * ```typescript
     * const runtime = await sdk.createRuntime({
     *   environment_name: 'python-cpu-env',
     *   credits_limit: 100
     * });
     * console.log('Runtime created:', runtime.pod_name);
     * ```
     */
    async createRuntime(data: CreateRuntimeRequest): Promise<Runtime> {
      const token = (this as any).getToken();
      const runtimesRunUrl = (this as any).getRuntimesRunUrl();
      const response = await runtimes.createRuntime(
        token,
        data,
        runtimesRunUrl,
      );
      return response.runtime;
    }

    /**
     * List all runtimes.
     *
     * @returns Promise resolving to array of runtimes
     *
     * @example
     * ```typescript
     * const allRuntimes = await sdk.listRuntimes();
     * console.log('Total runtimes:', allRuntimes.length);
     * ```
     */
    async listRuntimes(): Promise<Runtime[]> {
      const token = (this as any).getToken();
      const runtimesRunUrl = (this as any).getRuntimesRunUrl();
      const response = await runtimes.listRuntimes(token, runtimesRunUrl);
      return response.runtimes;
    }

    /**
     * Get details for a specific runtime by pod name.
     *
     * @param podName - Runtime pod name
     * @returns Promise resolving to runtime details
     *
     * @example
     * ```typescript
     * const runtime = await sdk.getRuntime('runtime-abc123');
     * console.log('Runtime state:', runtime.state);
     * ```
     */
    async getRuntime(podName: string): Promise<Runtime> {
      const token = (this as any).getToken();
      const runtimesRunUrl = (this as any).getRuntimesRunUrl();
      return await runtimes.getRuntime(token, podName, runtimesRunUrl);
    }

    /**
     * Delete a runtime permanently.
     *
     * @param podName - Runtime pod name
     *
     * @example
     * ```typescript
     * await sdk.deleteRuntime('runtime-abc123');
     * console.log('Runtime deleted');
     * ```
     */
    async deleteRuntime(podName: string): Promise<void> {
      const token = (this as any).getToken();
      const runtimesRunUrl = (this as any).getRuntimesRunUrl();
      await runtimes.deleteRuntime(token, podName, runtimesRunUrl);
    }
  };
}
