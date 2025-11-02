/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Snapshot domain model for the Datalayer SDK.
 *
 * @module models/Snapshot
 */

import type { RuntimeSnapshot as RuntimeSnapshotData } from './Runtime2';
import type { DatalayerClient } from '../index';
import { snapshots } from '../api/runtimes';
import { Runtime3 } from './Runtime3';
import { validateJSON } from '../api/utils/validation';

/**
 * Stable public interface for Snapshot data.
 * This is the contract that SDK consumers can rely on.
 * The raw API may change, but this interface remains stable.
 */
export interface RuntimeSnapshotJSON {
  /** Unique identifier for the snapshot */
  uid: string;
  /** Name of the snapshot */
  name: string;
  /** Optional description of the snapshot */
  description?: string;
  /** Name of the environment used by the runtime */
  environment: string;
  /** ISO 8601 timestamp when the snapshot was last updated */
  updatedAt: string;
}

/**
 * Snapshot domain model that wraps API responses with convenient methods.
 * Provides runtime snapshot management with data refresh and lifecycle operations.
 *
 * @example
 * ```typescript
 * const snapshot = await runtime.createSnapshot('my-checkpoint');
 * const runtime = await snapshot.restore();
 * ```
 */
export class RuntimeSnapshot2 {
  protected _data: RuntimeSnapshotData;
  private _sdk: DatalayerClient;
  private _deleted: boolean = false;

  /**
   * Create a Snapshot instance.
   *
   * @param data - Snapshot data from API
   * @param sdk - SDK instance
   */
  constructor(data: RuntimeSnapshotData, sdk: DatalayerClient) {
    this._data = data;
    this._sdk = sdk;
  }

  // ========================================================================
  // Helper Methods
  // ========================================================================

  /**
   * Check if this snapshot has been deleted and throw error if so.
   * @throws Error if deleted
   */
  private _checkDeleted(): void {
    if (this._deleted) {
      throw new Error(
        `Snapshot ${this._data.uid} has been deleted and no longer exists`,
      );
    }
  }

  // ========================================================================
  // Static Properties (set at creation, never change)
  // ========================================================================

  /** Unique identifier for the snapshot. */
  get uid(): string {
    this._checkDeleted();
    return this._data.uid;
  }

  /** Name of the snapshot. */
  get name(): string {
    this._checkDeleted();
    return this._data.name;
  }

  /** Description of the snapshot. */
  get description(): string {
    this._checkDeleted();
    return this._data.description || '';
  }

  /** Name of the environment used by the runtime. */
  get environment(): string {
    this._checkDeleted();
    return this._data.environment;
  }

  /** When the snapshot was last updated. */
  get updatedAt(): Date {
    this._checkDeleted();
    return new Date(this._data.updated_at);
  }

  // ========================================================================
  // Action Methods
  // ========================================================================

  /**
   * Delete this snapshot permanently.
   * After deletion, subsequent calls to dynamic methods will throw errors.
   */
  async delete(): Promise<void> {
    this._checkDeleted();
    const token = (this._sdk as any).getToken();
    const runtimesRunUrl = (this._sdk as any).getRuntimesRunUrl();
    await snapshots.deleteSnapshot(token, this.uid, runtimesRunUrl);
    this._deleted = true;
  }

  /**
   * Create a runtime from this snapshot (restore functionality).
   *
   * @param config - Optional runtime configuration to override defaults
   * @returns Created Runtime instance
   */
  async restore(minutesLimit: number): Promise<Runtime3> {
    this._checkDeleted();
    return await (this._sdk as any).createRuntime({
      environmentName: this.environment,
      type: 'notebook',
      givenName: `Restored from ${this.name}`,
      minutesLimit: minutesLimit,
      fromSnapshotId: this.uid,
    });
  }

  // ========================================================================
  // Utility Methods
  // ========================================================================

  /**
   * Get snapshot data in camelCase format.
   * Returns only the core fields that consumers need.
   * This provides a stable interface regardless of API changes.
   * Note: Returns current cached state - call getStatus() first if you need fresh data.
   *
   * @returns Core snapshot data with camelCase properties
   */
  toJSON(): RuntimeSnapshotJSON {
    this._checkDeleted();
    const obj = {
      uid: this.uid,
      name: this.name,
      description: this.description,
      environment: this.environment,
      updatedAt: this.updatedAt.toISOString(),
    };
    validateJSON(obj, 'Snapshot');
    return obj;
  }

  /**
   * Get the raw snapshot data exactly as received from the API.
   * This preserves the original snake_case naming from the API response.
   *
   * @returns Raw snapshot data from API
   */
  rawData(): RuntimeSnapshotData {
    this._checkDeleted();
    return this._data;
  }

  /** String representation of the snapshot. */
  toString(): string {
    this._checkDeleted();
    return `Snapshot(${this.uid}, ${this.name})`;
  }
}
