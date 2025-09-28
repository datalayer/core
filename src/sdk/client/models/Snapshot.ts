/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Snapshot domain model for the Datalayer SDK.
 *
 * @module sdk/client/models/Snapshot
 */

import type { RuntimeSnapshot } from '../../../api/types/runtimes';
import type { DatalayerSDK } from '../index';
import { snapshots } from '../../../api/runtimes';

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
export class Snapshot {
  protected _data: RuntimeSnapshot;
  private _sdk: DatalayerSDK;
  private _deleted: boolean = false;

  /**
   * Create a Snapshot instance.
   *
   * @param data - Snapshot data from API
   * @param sdk - SDK instance
   */
  constructor(data: RuntimeSnapshot, sdk: DatalayerSDK) {
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

  /** Format of the snapshot. */
  get format(): string {
    this._checkDeleted();
    return this._data.format || '';
  }

  /** Format version of the snapshot. */
  get formatVersion(): string {
    this._checkDeleted();
    return this._data.format_version || '';
  }

  /** Snapshot metadata. */
  get metadata(): Record<string, any> {
    this._checkDeleted();
    return this._data.metadata || {};
  }

  /** When the snapshot was last updated. */
  get updatedAt(): Date {
    this._checkDeleted();
    return new Date(this._data.updated_at);
  }

  // ========================================================================
  // Dynamic Methods (always fetch fresh data and update internal state)
  // ========================================================================

  /**
   * Get the current status of the snapshot.
   * Always fetches fresh data from API.
   *
   * @returns Current snapshot status
   * @throws Error if deleted
   */
  async getStatus(): Promise<string> {
    this._checkDeleted();
    const token = (this._sdk as any).getToken();
    const runtimesRunUrl = (this._sdk as any).getRuntimesRunUrl();
    const response = await snapshots.getSnapshot(
      token,
      this.uid,
      runtimesRunUrl,
    );
    if (response.snapshot) {
      this._data = response.snapshot;
    }
    return this._data.status || 'unknown';
  }

  /**
   * Get the current size of the snapshot.
   *
   * @returns Snapshot size in bytes
   */
  async getSize(): Promise<number> {
    this._checkDeleted();
    const token = (this._sdk as any).getToken();
    const runtimesRunUrl = (this._sdk as any).getRuntimesRunUrl();
    const response = await snapshots.getSnapshot(
      token,
      this.uid,
      runtimesRunUrl,
    );
    if (response.snapshot) {
      this._data = response.snapshot;
    }
    return this._data.size || 0;
  }

  /**
   * Get the latest metadata of the snapshot.
   *
   * @returns Snapshot metadata
   */
  async getLatestMetadata(): Promise<Record<string, any>> {
    this._checkDeleted();
    const token = (this._sdk as any).getToken();
    const runtimesRunUrl = (this._sdk as any).getRuntimesRunUrl();
    const response = await snapshots.getSnapshot(
      token,
      this.uid,
      runtimesRunUrl,
    );
    if (response.snapshot) {
      this._data = response.snapshot;
    }
    return this._data.metadata || {};
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
  async restore(config?: any): Promise<any> {
    this._checkDeleted();
    return await (this._sdk as any).createRuntime({
      environment_name: this.environment,
      from_snapshot: this.uid,
      ...config,
    });
  }

  // ========================================================================
  // Utility Methods
  // ========================================================================

  /**
   * Get raw snapshot data object with latest information.
   * Refreshes from API before returning.
   *
   * @returns Raw snapshot data
   */
  async toJSON(): Promise<RuntimeSnapshot> {
    this._checkDeleted();
    await this.getStatus(); // This updates internal data
    return this._data;
  }

  /** String representation of the snapshot. */
  toString(): string {
    this._checkDeleted();
    return `Snapshot(${this.uid}, ${this.name})`;
  }
}

// Re-export the RuntimeSnapshot type for convenience
export type { RuntimeSnapshot };
