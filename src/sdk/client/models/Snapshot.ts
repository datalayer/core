/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * @module sdk/client/models/Snapshot
 * @description Snapshot domain model for the Datalayer SDK.
 *
 * This model provides a rich, object-oriented interface for working with
 * runtime snapshots, including fresh data fetching and lifecycle operations.
 */

import type { RuntimeSnapshot } from '../../../api/types/runtimes';
import type { DatalayerSDK } from '../index';
import { snapshots } from '../../../api/runtimes';

/**
 * Snapshot domain model that wraps API responses with convenient methods.
 *
 * Provides a rich, object-oriented interface for managing runtime snapshots
 * with automatic data refresh and lifecycle operations.
 *
 * @example
 * ```typescript
 * const snapshot = await runtime.createSnapshot('my-checkpoint', 'Before changes');
 *
 * // Static properties - instant access
 * console.log(snapshot.uid);
 * console.log(snapshot.environment);
 *
 * // Dynamic data - always fresh from API
 * const currentStatus = await snapshot.getStatus();
 * const size = await snapshot.getSize();
 *
 * // Delete snapshot
 * await snapshot.delete();
 *
 * // Restore runtime from snapshot
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
   * @param data - Raw snapshot data from API
   * @param sdk - DatalayerSDK instance for making API calls
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
   * @throws Error if the snapshot has been deleted
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

  /**
   * Unique identifier for the snapshot.
   */
  get uid(): string {
    this._checkDeleted();
    return this._data.uid;
  }

  /**
   * Name of the snapshot.
   */
  get name(): string {
    this._checkDeleted();
    return this._data.name;
  }

  /**
   * Description of the snapshot.
   */
  get description(): string {
    this._checkDeleted();
    return this._data.description || '';
  }

  /**
   * Name of the environment used by the runtime.
   */
  get environment(): string {
    this._checkDeleted();
    return this._data.environment;
  }

  /**
   * Format of the snapshot.
   */
  get format(): string {
    this._checkDeleted();
    return this._data.format || '';
  }

  /**
   * Format version of the snapshot.
   */
  get formatVersion(): string {
    this._checkDeleted();
    return this._data.format_version || '';
  }

  /**
   * Snapshot metadata.
   */
  get metadata(): Record<string, any> {
    this._checkDeleted();
    return this._data.metadata || {};
  }

  /**
   * When the snapshot was last updated.
   */
  get updatedAt(): Date {
    this._checkDeleted();
    return new Date(this._data.updated_at);
  }

  // ========================================================================
  // Dynamic Methods (always fetch fresh data and update internal state)
  // ========================================================================

  /**
   * Get the current status of the snapshot.
   *
   * This method always fetches fresh data from the API and updates
   * the internal data to keep everything in sync.
   *
   * @returns Promise resolving to current snapshot status
   * @throws Error if the snapshot has been deleted
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
   * @returns Promise resolving to snapshot size in bytes
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
   * @returns Promise resolving to snapshot metadata
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
   *
   * After deletion, this object will be marked as deleted and subsequent
   * calls to dynamic methods will throw errors.
   *
   * @example
   * ```typescript
   * await snapshot.delete();
   * console.log('Snapshot deleted');
   * // snapshot.getStatus() will now throw an error
   * ```
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
   * @returns Promise resolving to created Runtime instance
   *
   * @example
   * ```typescript
   * const runtime = await snapshot.restore({
   *   credits_limit: 200
   * });
   * await runtime.waitUntilReady();
   * ```
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
   *
   * This method ensures the returned data includes the most recent information
   * by refreshing from the API before returning.
   *
   * @returns Promise resolving to raw snapshot data
   *
   * @example
   * ```typescript
   * const latestData = await snapshot.toJSON();
   * console.log('Current status:', latestData.status);
   * ```
   */
  async toJSON(): Promise<RuntimeSnapshot> {
    this._checkDeleted();
    await this.getStatus(); // This updates internal data
    return this._data;
  }

  /**
   * String representation of the snapshot.
   *
   * @returns String representation for logging/debugging
   */
  toString(): string {
    this._checkDeleted();
    return `Snapshot(${this.uid}, ${this.name})`;
  }
}

// Re-export the RuntimeSnapshot type for convenience
export type { RuntimeSnapshot };
