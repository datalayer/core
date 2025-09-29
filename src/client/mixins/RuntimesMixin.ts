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
     * @param environmentName - Optional name of the environment to use
     * @param creditsLimit - Optional maximum credits to allocate
     * @param waitForReady - Whether to wait for runtime to be ready (defaults to true)
     * @param maxWaitTime - Maximum time to wait for ready state in ms (defaults to 60000)
     * @param reuseExisting - Whether to reuse existing suitable runtime (defaults to true)
     * @param snapshotId - Optional snapshot ID to create runtime from
     * @returns Runtime instance
     */
    async ensureRuntime(
      environmentName?: string,
      creditsLimit?: number,
      waitForReady: boolean = true,
      maxWaitTime: number = 60000,
      reuseExisting: boolean = true,
      snapshotId?: string,
    ): Promise<Runtime> {
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
        const runtime = await this.createRuntime(
          environmentName || snapshot.environment,
          'notebook', // type
          `Runtime from ${snapshotId}`, // givenName
          creditsLimit || 10, // default credits limit
        );

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

      const runtime = await this.createRuntime(
        targetEnvironment,
        'notebook', // type
        `Runtime for ${targetEnvironment}`, // givenName
        creditsLimit || 10, // default credits limit
      );

      // 4. Wait for ready state if requested
      if (waitForReady) {
        await runtime.waitUntilReady(maxWaitTime);
      }

      // 5. Return Runtime model instance
      return runtime;
    }

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
      creditsLimit: number,
    ): Promise<Runtime> {
      const token = (this as any).getToken();
      const runtimesRunUrl = (this as any).getRuntimesRunUrl();

      const data: CreateRuntimeRequest = {
        environment_name: environmentName,
        type,
        given_name: givenName,
        credits_limit: creditsLimit,
      };

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
