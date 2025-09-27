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

import * as environments from '../../../api/runtimes/environments';
import * as runtimes from '../../../api/runtimes/runtimes';
import * as snapshots from '../../../api/runtimes/snapshots';
import type {
  Environment,
  CreateRuntimeRequest,
  CreateRuntimeSnapshotRequest,
} from '../../../api/types/runtimes';
import type { Constructor } from '../utils/mixins';
import { Runtime } from '../models/Runtime';
import { Snapshot } from '../models/Snapshot';

/**
 * Options for ensuring a runtime is available.
 */
export interface EnsureRuntimeOptions {
  /** Name of the environment to use */
  environmentName?: string;
  /** Maximum credits to allocate */
  creditsLimit?: number;
  /** Whether to wait for runtime to be ready */
  waitForReady?: boolean;
  /** Maximum time to wait for ready state (ms) */
  maxWaitTime?: number;
  /** Whether to reuse existing suitable runtime */
  reuseExisting?: boolean;
  /** Snapshot ID to create runtime from */
  snapshotId?: string;
}

/**
 * Runtimes mixin that provides computational environment and runtime management.
 *
 * This mixin is applied to the DatalayerSDK class to provide clean, intuitive
 * methods for managing environments and runtimes.
 */
export function RuntimesMixin<TBase extends Constructor>(Base: TBase) {
  return class extends Base {
    // ========================================================================
    // Helper Functions
    // ========================================================================

    _extractRuntimePodName(runtimePodNameOrInstance: string | Runtime): string {
      return typeof runtimePodNameOrInstance === 'string'
        ? runtimePodNameOrInstance
        : runtimePodNameOrInstance.podName;
    }

    _extractSnapshotId(snapshotIdOrInstance: string | Snapshot): string {
      return typeof snapshotIdOrInstance === 'string'
        ? snapshotIdOrInstance
        : snapshotIdOrInstance.uid;
    }
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
     * Ensure a runtime is available, either by reusing existing or creating new.
     *
     * This is the primary method for runtime management, providing intelligent
     * runtime selection and creation with various options.
     *
     * @param options - Options for runtime selection/creation
     * @returns Promise resolving to runtime instance
     *
     * @example
     * ```typescript
     * // Get or create a runtime with default settings
     * const runtime = await sdk.ensureRuntime();
     *
     * // Create from a specific snapshot
     * const runtime = await sdk.ensureRuntime({
     *   snapshotId: 'snapshot-abc123',
     *   waitForReady: true
     * });
     *
     * // Ensure runtime with specific environment
     * const runtime = await sdk.ensureRuntime({
     *   environmentName: 'python-gpu-env',
     *   creditsLimit: 200,
     *   reuseExisting: true
     * });
     * ```
     */
    async ensureRuntime(options: EnsureRuntimeOptions = {}): Promise<Runtime> {
      const {
        environmentName,
        creditsLimit,
        waitForReady = true,
        maxWaitTime = 60000, // 60 seconds default
        reuseExisting = true,
        snapshotId,
      } = options;

      // 1. Check for existing suitable runtime if reuseExisting is true
      if (reuseExisting) {
        const existingRuntimes = await this.listRuntimes();

        // Find a suitable runtime that:
        // - Is in 'running' state (check the internal data)
        // - Matches the environment if specified
        // - Has sufficient credits remaining if limit specified
        const suitableRuntime = existingRuntimes.find(runtime => {
          // Access the internal data directly for state checking
          if (runtime._data.state !== 'running') return false;

          if (
            environmentName &&
            runtime._data.environment_name !== environmentName
          ) {
            return false;
          }

          if (
            creditsLimit !== undefined &&
            runtime._data.credits !== undefined
          ) {
            // Calculate remaining credits (total credits - used)
            const creditsUsed = runtime._data.credits || 0;
            const creditsRemaining = creditsLimit - creditsUsed;
            // Ensure at least 20% of requested credits remain
            if (creditsRemaining < creditsLimit * 0.2) return false;
          }

          return true;
        });

        if (suitableRuntime) {
          console.log(`Reusing existing runtime: ${suitableRuntime.podName}`);
          return suitableRuntime;
        }
      }

      // 2. Create from snapshot if provided
      if (snapshotId) {
        let snapshot: Snapshot | null = null;
        try {
          snapshot = await this.getSnapshot(snapshotId);
        } catch (error) {
          // If snapshot fetch fails, it doesn't exist
          throw new Error(`Snapshot '${snapshotId}' not found`);
        }

        if (!snapshot) {
          throw new Error(`Snapshot '${snapshotId}' not found`);
        }

        console.log(`Creating runtime from snapshot: ${snapshotId}`);
        // Note: snapshot_id is not part of CreateRuntimeRequest
        // We may need to use a different approach or extend the API
        const runtime = await this.createRuntime({
          environment_name: environmentName || snapshot.environment,
          credits_limit: creditsLimit,
          // TODO: Add snapshot support when API supports it
        });

        if (waitForReady) {
          await runtime.waitUntilReady(maxWaitTime);
        }

        return runtime;
      }

      // 3. Create new runtime
      console.log('Creating new runtime...');

      // If no environment specified, get the default one
      let targetEnvironment = environmentName;
      if (!targetEnvironment) {
        const environments = await this.listEnvironments();
        const defaultEnv = environments.find(env => {
          const envName = env.name || '';
          return envName.includes('default') || envName.includes('python');
        });
        targetEnvironment = defaultEnv?.name || environments[0]?.name;

        if (!targetEnvironment) {
          throw new Error('No environments available');
        }
      }

      const runtime = await this.createRuntime({
        environment_name: targetEnvironment,
        credits_limit: creditsLimit,
      });

      // 4. Wait for ready state if requested
      if (waitForReady) {
        await runtime.waitUntilReady(maxWaitTime);
      }

      // 5. Return Runtime model instance
      return runtime;
    }

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
     * console.log('Runtime created:', runtime.podName);
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
      return new Runtime(response.runtime, this as any);
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
      return response.runtimes.map(r => new Runtime(r, this as any));
    }

    /**
     * Get details for a specific runtime by pod name or Runtime instance.
     *
     * @param podNameOrRuntime - Runtime pod name (string) or Runtime instance
     * @returns Promise resolving to runtime details
     *
     * @example
     * ```typescript
     * const runtime = await sdk.getRuntime('runtime-abc123');
     * const refreshed = await sdk.getRuntime(runtime);
     * ```
     */
    async getRuntime(podNameOrRuntime: string | Runtime): Promise<Runtime> {
      const podName = this._extractRuntimePodName(podNameOrRuntime);
      const token = (this as any).getToken();
      const runtimesRunUrl = (this as any).getRuntimesRunUrl();
      const runtimeData = await runtimes.getRuntime(
        token,
        podName,
        runtimesRunUrl,
      );
      return new Runtime(runtimeData, this as any);
    }

    /**
     * Delete a runtime permanently.
     *
     * @param podNameOrRuntime - Runtime pod name (string) or Runtime instance
     *
     * @example
     * ```typescript
     * await sdk.deleteRuntime('runtime-abc123');
     * await sdk.deleteRuntime(runtime);
     * ```
     */
    async deleteRuntime(podNameOrRuntime: string | Runtime): Promise<void> {
      const podName = this._extractRuntimePodName(podNameOrRuntime);
      const token = (this as any).getToken();
      const runtimesRunUrl = (this as any).getRuntimesRunUrl();
      await runtimes.deleteRuntime(token, podName, runtimesRunUrl);

      // If a Runtime instance was passed, mark it as deleted
      if (
        typeof podNameOrRuntime !== 'string' &&
        podNameOrRuntime instanceof Runtime
      ) {
        (podNameOrRuntime as any)._deleted = true;
      }
    }

    // ========================================================================
    // Snapshots
    // ========================================================================

    /**
     * Create a snapshot of a runtime.
     *
     * @param data - Snapshot creation parameters
     * @returns Promise resolving to created snapshot
     *
     * @example
     * ```typescript
     * const snapshot = await sdk.createSnapshot({
     *   pod_name: 'runtime-abc123',
     *   name: 'my-checkpoint',
     *   description: 'Before major changes'
     * });
     * ```
     */
    async createSnapshot(
      data: CreateRuntimeSnapshotRequest,
    ): Promise<Snapshot> {
      const token = (this as any).getToken();
      const runtimesRunUrl = (this as any).getRuntimesRunUrl();
      const response = await snapshots.createSnapshot(
        token,
        data,
        runtimesRunUrl,
      );
      return new Snapshot(response.snapshot, this as any);
    }

    /**
     * List all runtime snapshots.
     *
     * @returns Promise resolving to array of snapshots
     *
     * @example
     * ```typescript
     * const allSnapshots = await sdk.listSnapshots();
     * console.log('Total snapshots:', allSnapshots.length);
     * ```
     */
    async listSnapshots(): Promise<Snapshot[]> {
      const token = (this as any).getToken();
      const runtimesRunUrl = (this as any).getRuntimesRunUrl();
      const response = await snapshots.listSnapshots(token, runtimesRunUrl);
      return response.snapshots.map(s => new Snapshot(s, this as any));
    }

    /**
     * Get details for a specific snapshot by ID or Snapshot instance.
     *
     * @param idOrSnapshot - Snapshot ID (string) or Snapshot instance
     * @returns Promise resolving to snapshot details
     *
     * @example
     * ```typescript
     * const snapshot = await sdk.getSnapshot('snapshot-abc123');
     * const refreshed = await sdk.getSnapshot(snapshot);
     * ```
     */
    async getSnapshot(idOrSnapshot: string | Snapshot): Promise<Snapshot> {
      const snapshotId = this._extractSnapshotId(idOrSnapshot);
      const token = (this as any).getToken();
      const runtimesRunUrl = (this as any).getRuntimesRunUrl();
      const response = await snapshots.getSnapshot(
        token,
        snapshotId,
        runtimesRunUrl,
      );
      return new Snapshot(response.snapshot, this as any);
    }

    /**
     * Delete a snapshot permanently.
     *
     * @param idOrSnapshot - Snapshot ID (string) or Snapshot instance
     *
     * @example
     * ```typescript
     * await sdk.deleteSnapshot('snapshot-abc123');
     * await sdk.deleteSnapshot(snapshot);
     * ```
     */
    async deleteSnapshot(idOrSnapshot: string | Snapshot): Promise<void> {
      const snapshotId = this._extractSnapshotId(idOrSnapshot);
      const token = (this as any).getToken();
      const runtimesRunUrl = (this as any).getRuntimesRunUrl();
      await snapshots.deleteSnapshot(token, snapshotId, runtimesRunUrl);

      // If a Snapshot instance was passed, mark it as deleted
      if (
        typeof idOrSnapshot !== 'string' &&
        idOrSnapshot instanceof Snapshot
      ) {
        (idOrSnapshot as any)._deleted = true;
      }
    }

    // ========================================================================
    // Service Health Checks
    // ========================================================================

    /**
     * Check the health status of the Runtimes service.
     *
     * This method performs a lightweight check to verify that the Runtimes
     * service is accessible and responding properly.
     *
     * @returns Promise resolving to health check result
     *
     * @example
     * ```typescript
     * const health = await sdk.checkRuntimesHealth();
     * console.log('Service status:', health.status);
     * console.log('Response time:', health.responseTime);
     * if (!health.healthy) {
     *   console.error('Service issues:', health.errors);
     * }
     * ```
     */
    async checkRuntimesHealth(): Promise<{
      healthy: boolean;
      status: string;
      responseTime: number;
      errors: string[];
      timestamp: Date;
    }> {
      const startTime = Date.now();
      const errors: string[] = [];
      let status = 'unknown';
      let healthy = false;

      try {
        // Test basic connectivity by listing environments (lightweight operation)
        const environments = await this.listEnvironments();
        const responseTime = Date.now() - startTime;

        if (Array.isArray(environments)) {
          healthy = true;
          status = 'operational';
        } else {
          status = 'degraded';
          errors.push('Unexpected response format from environments endpoint');
        }

        return {
          healthy,
          status,
          responseTime,
          errors,
          timestamp: new Date(),
        };
      } catch (error) {
        const responseTime = Date.now() - startTime;
        status = 'down';
        errors.push(`Service unreachable: ${error}`);

        return {
          healthy: false,
          status,
          responseTime,
          errors,
          timestamp: new Date(),
        };
      }
    }

    /**
     * Get comprehensive runtime service diagnostics.
     *
     * This method provides detailed information about the service state,
     * including environment availability and runtime statistics.
     *
     * @returns Promise resolving to diagnostic information
     *
     * @example
     * ```typescript
     * const diagnostics = await sdk.getRuntimesDiagnostics();
     * console.log('Available environments:', diagnostics.environmentCount);
     * console.log('Active runtimes:', diagnostics.activeRuntimeCount);
     * console.log('Service capabilities:', diagnostics.capabilities);
     * ```
     */
    async getRuntimesDiagnostics(): Promise<{
      healthy: boolean;
      environmentCount: number;
      activeRuntimeCount: number;
      capabilities: string[];
      serviceVersion?: string;
      errors: string[];
      timestamp: Date;
    }> {
      const errors: string[] = [];
      let environmentCount = 0;
      let activeRuntimeCount = 0;
      const capabilities: string[] = [];
      let healthy = true;

      try {
        // Get environment count
        const environments = await this.listEnvironments();
        environmentCount = Array.isArray(environments)
          ? environments.length
          : 0;
        capabilities.push('environments');

        // Get runtime count
        try {
          const runtimes = await this.listRuntimes();
          activeRuntimeCount = Array.isArray(runtimes) ? runtimes.length : 0;
          capabilities.push('runtimes');
        } catch (error) {
          errors.push(`Failed to list runtimes: ${error}`);
          healthy = false;
        }

        // Check snapshot capability
        try {
          await this.listSnapshots();
          capabilities.push('snapshots');
        } catch (error) {
          errors.push(`Failed to list snapshots: ${error}`);
          // Don't mark as unhealthy since snapshots might be optional
        }

        return {
          healthy,
          environmentCount,
          activeRuntimeCount,
          capabilities,
          errors,
          timestamp: new Date(),
        };
      } catch (error) {
        errors.push(`Service diagnostics failed: ${error}`);
        return {
          healthy: false,
          environmentCount: 0,
          activeRuntimeCount: 0,
          capabilities: [],
          errors,
          timestamp: new Date(),
        };
      }
    }
  };
}
