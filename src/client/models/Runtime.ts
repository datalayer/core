/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Runtime domain model for the Datalayer SDK.
 *
 * @module client/models/Runtime
 */

import { updateRuntime } from '../../api/runtimes/runtimes';
import type { Runtime as RuntimeData } from '../../api/types/runtimes';
import type { DatalayerClient } from '../index';
import { Snapshot } from './Snapshot';
import { validateJSON } from '../../api/utils/validation';

/**
 * Stable public interface for Runtime data.
 * This is the contract that SDK consumers can rely on.
 * The raw API may change, but this interface remains stable.
 */
export interface RuntimeJSON {
  /** ulid for the runtime */
  uid: string;
  /** Kubernetes pod name for the runtime instance */
  podName: string;
  /** User-friendly name for the runtime */
  givenName: string;
  /** Name of the environment this runtime is based on */
  environmentName: string;
  /** Title of the environment for display */
  environmentTitle: string;
  /** Type of runtime - notebook, terminal, or job */
  type: string;
  /** Credits consumed per second */
  burningRate: number;
  /** Credits allocated/available to this runtime */
  ingress: string;
  /** Authentication token for accessing the runtime */
  token: string;
  /** When the runtime was started */
  startedAt: string;
  /** When the runtime will expire */
  expiredAt: string;
}

/**
 * Runtime domain model that wraps API responses with convenient methods.
 * Provides state management and lifecycle operations for computational runtimes.
 *
 * @example
 * ```typescript
 * const runtime = await sdk.createRuntime({ environment_name: 'python-cpu' });
 * await runtime.waitUntilReady();
 * ```
 */
export class Runtime {
  /** @internal */
  _data: RuntimeData;
  private _sdk: DatalayerClient;
  private _deleted: boolean = false;

  /**
   * Create a Runtime instance.
   *
   * @param data - Runtime data from API
   * @param sdk - SDK instance
   */
  constructor(data: RuntimeData, sdk: DatalayerClient) {
    this._data = data;
    this._sdk = sdk;
  }

  // ========================================================================
  // Helper Methods
  // ========================================================================

  /**
   * Check if this runtime has been deleted and throw error if so.
   * @throws Error if deleted
   */
  private _checkDeleted(): void {
    if (this._deleted) {
      throw new Error(
        `Runtime ${this._data.pod_name} has been deleted and no longer exists`,
      );
    }
  }

  // ========================================================================
  // Static Properties (set at creation, never change)
  // ========================================================================

  /** Kubernetes pod name for the runtime instance. */
  get podName(): string {
    this._checkDeleted();
    return this._data.pod_name;
  }

  /** Unique identifier for the runtime. */
  get uid(): string {
    this._checkDeleted();
    return this._data.uid;
  }

  /** Name of the environment this runtime is based on. */
  get environmentName(): string {
    this._checkDeleted();
    return this._data.environment_name;
  }

  /** Ingress URL for accessing the runtime. */
  get ingress(): string {
    this._checkDeleted();
    return this._data.ingress;
  }

  /** Authentication token for accessing the runtime. */
  get token(): string {
    this._checkDeleted();
    return this._data.token;
  }

  /** Credits consumed per second. */
  get burningRate(): number {
    this._checkDeleted();
    return this._data.burning_rate;
  }

  /** User-friendly name for the runtime. */
  get givenName(): string {
    this._checkDeleted();
    return this._data.given_name;
  }

  /** Type of runtime (notebook, terminal, or job). */
  get type(): string {
    this._checkDeleted();
    return this._data.type;
  }

  /** When the runtime started. */
  get startedAt(): Date {
    this._checkDeleted();
    return new Date(Number(this._data.started_at) * 1000);
  }

  /** When the runtime will expire. */
  get expiredAt(): Date {
    this._checkDeleted();
    return new Date(Number(this._data.expired_at) * 1000);
  }

  /** Environment title for display. */
  get environmentTitle(): string {
    this._checkDeleted();
    return this._data.environment_title || '';
  }

  // ========================================================================
  // Action Methods
  // ========================================================================

  /**
   * Delete this runtime permanently.
   * After deletion, subsequent calls to dynamic methods will throw errors.
   */
  async delete(): Promise<void> {
    await this._sdk.deleteRuntime(this.podName);
    this._deleted = true;
  }

  /**
   * Update runtime from a snapshot.
   *
   * @param from - Snapshot identifier to restore from
   * @returns Updated Runtime instance
   */
  async update(from: string): Promise<Runtime> {
    this._checkDeleted();
    const updated = await updateRuntime(
      (this._sdk as any).getToken(),
      this.podName,
      from,
      (this._sdk as any).getRuntimesRunUrl(),
    );
    return new Runtime(updated, this._sdk);
  }

  /**
   * Create a snapshot of this runtime.
   *
   * @param name - Name for the snapshot
   * @param description - Optional description
   * @param stop - Whether to stop runtime after snapshotting
   * @returns Created Snapshot instance
   */
  async createSnapshot(
    name: string,
    description?: string,
    stop?: boolean,
  ): Promise<Snapshot> {
    this._checkDeleted();
    return await (this._sdk as any).createSnapshot(
      this.podName,
      name,
      description,
      stop,
    );
  }

  // ========================================================================
  // Utility Methods
  // ========================================================================

  /**
   * Get runtime data in camelCase format.
   * Returns only the core fields that consumers need.
   * This provides a stable interface regardless of API changes.
   * Returns the current cached state - call getState() first if you need fresh data.
   *
   * @returns Core runtime data with camelCase properties
   */
  toJSON(): RuntimeJSON {
    this._checkDeleted();
    const obj = {
      // Core identifiers
      uid: this.uid,
      podName: this.podName,
      givenName: this.givenName,

      // Environment info
      environmentName: this.environmentName,
      environmentTitle: this.environmentTitle,

      // State and type
      type: this.type,

      // Burning
      burningRate: this.burningRate,

      // URLs and tokens
      // FIXME: Consider renaming? jupyterServerUrl and jupyterServerToken
      ingress: this.ingress,
      token: this.token,

      // Timing
      startedAt: this.startedAt.toISOString(),
      expiredAt: this.expiredAt.toISOString(),
    };
    validateJSON(obj, 'Runtime');
    return obj;
  }

  /**
   * Get the raw runtime data exactly as received from the API.
   * This preserves the original snake_case naming from the API response.
   * Returns the current cached state - call getState() first if you need fresh data.
   *
   * @returns Raw runtime data from API
   */
  rawData(): RuntimeData {
    this._checkDeleted();
    return this._data;
  }

  /** String representation of the runtime. */
  toString(): string {
    this._checkDeleted();
    return `Runtime(${this.podName}, ${this.environmentName})`;
  }
}
