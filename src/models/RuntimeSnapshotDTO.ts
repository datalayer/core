/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Snapshot domain model for the Datalayer SDK.
 *
 * @module models/Snapshot
 */

import type { DatalayerClient } from '../index';
import { Runtime3 } from './RuntimeDTO';
import { snapshots } from '../api/runtimes';
import { validateJSON } from '../api/utils/validation';

/**
 * Represents a runthime snapshot of a runtime's state and files.
 * @interface RuntimeSnapshotData
 */
export interface RuntimeSnapshotData {
  /** Unique identifier for the snapshot */
  uid: string;
  /** Name of the snapshot */
  name: string;
  /** Optional description of the snapshot */
  description?: string;
  /** Name of the environment used by the runtime */
  environment: string;
  /** Metadata associated with the snapshot */
  metadata?: {
    version?: string;
    language_info?: any;
    [key: string]: any;
  };
  /** Size of the snapshot in bytes */
  size?: number;
  /** Format of the snapshot */
  format?: string;
  /** Format version of the snapshot */
  format_version?: string;
  /** Status of the snapshot */
  status?: string;
  /** ISO 8601 timestamp when the snapshot was last updated */
  updated_at: string;
  /** List of files included in the snapshot */
  files?: any[]; // Simplified - RuntimeSnapshotFile type removed
}

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
 * Request payload for creating a runtime snapshot
 * @interface CreateRuntimeSnapshotRequest
 */
export interface CreateRuntimeSnapshotRequest {
  /** Pod name of the runtime to snapshot */
  pod_name: string;
  /** Name for the snapshot */
  name: string;
  /** Description of the snapshot */
  description: string;
  /** Whether to stop the runtime after creating snapshot */
  stop: boolean;
}

/**
 * Response for getting a specific runtime snapshot
 * @interface GetRuntimeSnapshotResponse
 */
export interface GetRuntimeSnapshotResponse {
  /** Indicates if the request was successful */
  success: boolean;
  /** Response message */
  message: string;
  /** The snapshot details */
  snapshot: RuntimeSnapshotData;
}

/**
 * Response for creating a runtime snapshot
 * @interface CreateRuntimeSnapshotResponse
 */
export interface CreateRuntimeSnapshotResponse {
  /** Indicates if the request was successful */
  success: boolean;
  /** Response message */
  message: string;
  /** The created snapshot details */
  snapshot: RuntimeSnapshotData;
}

/**
 * Response from listing runtime snapshots
 * @interface RuntimeSnapshotsListResponse
 */
export interface ListRuntimeSnapshotsResponse {
  /** Whether the request was successful */
  success: boolean;
  /** Response message from the server */
  message: string;
  /** Array of runtime snapshots */
  snapshots: RuntimeSnapshotData[];
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
export class RuntimeSnapshotDTO {
  protected _data: RuntimeSnapshotData;
  private _sdk: DatalayerClient;
  private _deleted: boolean = false;

  /**
   * Create a Runtime Snapshot instance.
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
