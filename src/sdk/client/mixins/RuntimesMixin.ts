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

import { environments, runtimes, snapshots } from '../../../api/runtimes';
import type {
  Environment,
  CreateRuntimeRequest,
  CreateRuntimeSnapshotRequest,
} from '../../../api/types/runtimes';
import type { Constructor } from '../utils/mixins';
import { Runtime } from '../models/Runtime';
import { Snapshot } from '../models/Snapshot';

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
  };
}
