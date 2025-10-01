/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Runtimes mixin for managing computational environments and runtime instances.
 * @module client/mixins/RuntimesMixin
 */

import * as environments from '../../api/runtimes/environments';
import * as runtimes from '../../api/runtimes/runtimes';
import * as snapshots from '../../api/runtimes/snapshots';
import type {
  CreateRuntimeRequest,
  CreateRuntimeSnapshotRequest,
} from '../../api/types/runtimes';
import type { Constructor } from '../utils/mixins';
import { Environment } from '../models/Environment';
import { Runtime } from '../models/Runtime';
import { Snapshot } from '../models/Snapshot';
import { HealthCheck } from '../models/HealthCheck';

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
      // Save for later use after first call
      (this as any).environments = response.environments.map(
        env => new Environment(env, this as any),
      );
      return (this as any).environments;
    }

    // ========================================================================
    // Runtimes
    // ========================================================================

    /**
     * Create a new computational runtime.
     * @param environmentName - Name of the environment to use
     * @param type - Type of runtime
     * @param givenName - User-friendly name for the runtime
     * @param creditsLimit - Credits limit
     * @returns Created runtime
     */
    async createRuntime(
      environmentName: string,
      type: 'notebook' | 'terminal' | 'job',
      givenName: string,
      minutesLimit: number,
      fromSnapshotId?: string,
    ): Promise<Runtime> {
      if (!(this as any).environments) {
        await this.listEnvironments();
      }

      if ((this as any).environments) {
        const env = (this as any).environments.find(
          (e: Environment) => e.name === environmentName,
        );
        if (!env) {
          throw new Error(
            `Environment "${environmentName}" not found. Available environments: ${(this as any).environments.map((e: Environment) => e.name).join(', ')}`,
          );
        } else {
          const token = (this as any).getToken();
          const runtimesRunUrl = (this as any).getRuntimesRunUrl();
          const creditsLimit = (this as any).calculateCreditsFromMinutes(
            minutesLimit,
            env.burningRate,
          );

          const data: CreateRuntimeRequest = {
            environment_name: environmentName,
            type,
            given_name: givenName,
            credits_limit: creditsLimit,
            from: fromSnapshotId,
          };

          const response = await runtimes.createRuntime(
            token,
            data,
            runtimesRunUrl,
          );
          return new Runtime(response.runtime, this as any);
        }
      } else {
        throw new Error('Environments not loaded');
      }
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
     * Get details for a specific runtime by pod name.
     * @param podName - Runtime pod name
     * @returns Runtime details
     */
    async getRuntime(podName: string): Promise<Runtime> {
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
     * @param podName - Runtime pod name
     */
    async deleteRuntime(podName: string): Promise<void> {
      const token = (this as any).getToken();
      const runtimesRunUrl = (this as any).getRuntimesRunUrl();
      await runtimes.deleteRuntime(token, podName, runtimesRunUrl);
    }

    // ========================================================================
    // Snapshots
    // ========================================================================

    /**
     * Create a snapshot of a runtime.
     * @param podName - Pod name of the runtime to snapshot
     * @param name - Name for the snapshot
     * @param description - Description of the snapshot
     * @param stop - Whether to stop the runtime after creating snapshot (defaults to false)
     * @returns Created snapshot
     */
    async createSnapshot(
      podName: string,
      name: string,
      description: string,
      stop: boolean = false,
    ): Promise<Snapshot> {
      const token = (this as any).getToken();
      const runtimesRunUrl = (this as any).getRuntimesRunUrl();

      const data: CreateRuntimeSnapshotRequest = {
        pod_name: podName,
        name,
        description,
        stop,
      };

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
     * Get details for a specific snapshot by ID.
     * @param id - Snapshot ID
     * @returns Snapshot details
     */
    async getSnapshot(id: string): Promise<Snapshot> {
      const token = (this as any).getToken();
      const runtimesRunUrl = (this as any).getRuntimesRunUrl();
      const response = await snapshots.getSnapshot(token, id, runtimesRunUrl);
      return new Snapshot(response.snapshot, this as any);
    }

    /**
     * Delete a snapshot permanently.
     * @param id - Snapshot ID
     */
    async deleteSnapshot(id: string): Promise<void> {
      const token = (this as any).getToken();
      const runtimesRunUrl = (this as any).getRuntimesRunUrl();
      await snapshots.deleteSnapshot(token, id, runtimesRunUrl);
    }

    // ========================================================================
    // Service Health Checks
    // ========================================================================

    /**
     * Check the health status of the Runtimes service.
     * @returns Health check result with status and response time
     */
    async checkRuntimesHealth(): Promise<HealthCheck> {
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

        return new HealthCheck(
          {
            healthy,
            status,
            responseTime,
            errors,
            timestamp: new Date(),
          },
          this as any,
        );
      } catch (error) {
        const responseTime = Date.now() - startTime;
        status = 'down';
        errors.push(`Service unreachable: ${error}`);

        return new HealthCheck(
          {
            healthy: false,
            status,
            responseTime,
            errors,
            timestamp: new Date(),
          },
          this as any,
        );
      }
    }
  };
}
