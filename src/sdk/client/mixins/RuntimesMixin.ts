/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Runtimes mixin for managing computational environments and runtime instances.
 * @module sdk/client/mixins/RuntimesMixin
 */

import * as environments from '../../../api/runtimes/environments';
import * as runtimes from '../../../api/runtimes/runtimes';
import * as snapshots from '../../../api/runtimes/snapshots';
import type {
  CreateRuntimeRequest,
  CreateRuntimeSnapshotRequest,
} from '../../../api/types/runtimes';
import type { Constructor } from '../utils/mixins';
import { Environment } from '../models/Environment';
import { Runtime } from '../models/Runtime';
import { Snapshot } from '../models/Snapshot';

/** Options for ensuring a runtime is available. */
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

/** Runtimes mixin providing computational environment and runtime management. */
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
     * @returns Array of Environment model instances
     */
    async listEnvironments(): Promise<Environment[]> {
      const token = (this as any).getToken();
      const runtimesRunUrl = (this as any).getRuntimesRunUrl();
      const response = await environments.listEnvironments(
        token,
        runtimesRunUrl,
      );
      return response.environments.map(
        env => new Environment(env, this as any),
      );
    }

    // ========================================================================
    // Runtimes
    // ========================================================================

    /**
     * Ensure a runtime is available, either by reusing existing or creating new.
     * @param options - Options for runtime selection/creation
     * @returns Runtime instance
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
     * @param data - Runtime creation parameters
     * @returns Created runtime
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
     * @returns Array of runtimes
     */
    async listRuntimes(): Promise<Runtime[]> {
      const token = (this as any).getToken();
      const runtimesRunUrl = (this as any).getRuntimesRunUrl();
      const response = await runtimes.listRuntimes(token, runtimesRunUrl);
      return response.runtimes.map(r => new Runtime(r, this as any));
    }

    /**
     * Get details for a specific runtime by pod name or Runtime instance.
     * @param podNameOrRuntime - Runtime pod name or Runtime instance
     * @returns Runtime details
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
     * @param podNameOrRuntime - Runtime pod name or Runtime instance
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
     * @param data - Snapshot creation parameters
     * @returns Created snapshot
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
     * @returns Array of snapshots
     */
    async listSnapshots(): Promise<Snapshot[]> {
      const token = (this as any).getToken();
      const runtimesRunUrl = (this as any).getRuntimesRunUrl();
      const response = await snapshots.listSnapshots(token, runtimesRunUrl);
      return response.snapshots.map(s => new Snapshot(s, this as any));
    }

    /**
     * Get details for a specific snapshot by ID or Snapshot instance.
     * @param idOrSnapshot - Snapshot ID or Snapshot instance
     * @returns Snapshot details
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
     * @param idOrSnapshot - Snapshot ID or Snapshot instance
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
     * @returns Health check result with status and response time
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
  };
}
