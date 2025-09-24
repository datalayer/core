/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * @module sdk/client/models/Runtime
 * @description Runtime domain model for the Datalayer SDK.
 *
 * This model provides a rich, object-oriented interface for working with
 * computational runtimes, including state management and lifecycle operations.
 */

import { updateRuntime } from '../../../api/runtimes/runtimes';
import type {
  Runtime as RuntimeData,
  CreateRuntimeSnapshotRequest,
} from '../../../api/types/runtimes';
import type { DatalayerSDK } from '../index';
import { Snapshot } from './Snapshot';

/**
 * Runtime domain model that wraps API responses with convenient methods.
 *
 * Provides a rich, object-oriented interface for managing computational runtimes
 * with automatic state refresh and lifecycle operations.
 *
 * @example
 * ```typescript
 * const runtime = await sdk.createRuntime({
 *   environment_name: 'python-cpu'
 * });
 *
 * // Static properties - instant access
 * console.log(runtime.podName);
 * console.log(runtime.jupyterUrl);
 *
 * // Dynamic state - always fresh from API
 * if (await runtime.isRunning()) {
 *   console.log('Runtime is ready!');
 * }
 *
 * // Wait for runtime to be ready
 * await runtime.waitUntilReady();
 *
 * // Create snapshot
 * const snapshot = await runtime.createSnapshot('my-snapshot');
 * ```
 */
export class Runtime {
  protected _data: RuntimeData;
  private _sdk: DatalayerSDK;
  private _deleted: boolean = false;

  /**
   * Create a Runtime instance.
   *
   * @param data - Raw runtime data from API
   * @param sdk - DatalayerSDK instance for making API calls
   */
  constructor(data: RuntimeData, sdk: DatalayerSDK) {
    this._data = data;
    this._sdk = sdk;
  }

  // ========================================================================
  // Helper Methods
  // ========================================================================

  /**
   * Check if this runtime has been deleted and throw error if so.
   * @throws Error if the runtime has been deleted
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

  /**
   * Kubernetes pod name for the runtime instance.
   */
  get podName(): string {
    this._checkDeleted();
    return this._data.pod_name;
  }

  /**
   * Unique identifier for the runtime.
   */
  get uid(): string {
    this._checkDeleted();
    return this._data.uid;
  }

  /**
   * Name of the environment this runtime is based on.
   */
  get environmentName(): string {
    this._checkDeleted();
    return this._data.environment_name;
  }

  /**
   * URL for accessing Jupyter server.
   */
  get jupyterUrl(): string {
    this._checkDeleted();
    return this._data.jupyter_url || '';
  }

  /**
   * Token for Jupyter server authentication.
   */
  get jupyterToken(): string {
    this._checkDeleted();
    return this._data.jupyter_token || '';
  }

  /**
   * Credits consumed per hour.
   */
  get burningRate(): number {
    this._checkDeleted();
    return this._data.burning_rate;
  }

  /**
   * User-friendly name for the runtime.
   */
  get givenName(): string {
    this._checkDeleted();
    return this._data.given_name || '';
  }

  /**
   * Type of runtime (notebook, terminal, or job).
   */
  get type(): string {
    this._checkDeleted();
    return this._data.type || 'notebook';
  }

  /**
   * When the runtime was created.
   */
  get createdAt(): Date {
    this._checkDeleted();
    return new Date(this._data.created_at || '');
  }

  /**
   * When the runtime started.
   */
  get startedAt(): Date {
    this._checkDeleted();
    return new Date(this._data.started_at || '');
  }

  /**
   * When the runtime will expire.
   */
  get expiredAt(): Date {
    this._checkDeleted();
    return new Date(this._data.expired_at || '');
  }

  // ========================================================================
  // Dynamic State (always fetches fresh and updates internal data)
  // ========================================================================

  /**
   * Get the current state of the runtime.
   *
   * This method always fetches fresh data from the API and updates
   * the internal data to keep everything in sync.
   *
   * @returns Promise resolving to current runtime state
   * @throws Error if the runtime has been deleted
   */
  async getState(): Promise<string> {
    this._checkDeleted();
    const freshRuntime = await this._sdk.getRuntime(this.podName);
    // Update internal data with fresh runtime data
    this._data = freshRuntime._data;
    return this._data.state || 'unknown';
  }

  // ========================================================================
  // State Checking Methods (always fresh)
  // ========================================================================

  /**
   * Check if runtime is in running state.
   *
   * @returns Promise resolving to true if runtime is running
   *
   * @example
   * ```typescript
   * if (await runtime.isRunning()) {
   *   console.log('Runtime is ready for use');
   * }
   * ```
   */
  async isRunning(): Promise<boolean> {
    return (await this.getState()) === 'running';
  }

  /**
   * Check if runtime is in starting state.
   *
   * @returns Promise resolving to true if runtime is starting
   */
  async isStarting(): Promise<boolean> {
    return (await this.getState()) === 'starting';
  }

  /**
   * Check if runtime is in stopping state.
   *
   * @returns Promise resolving to true if runtime is stopping
   */
  async isStopping(): Promise<boolean> {
    return (await this.getState()) === 'stopping';
  }

  /**
   * Check if runtime is in stopped state.
   *
   * @returns Promise resolving to true if runtime is stopped
   */
  async isStopped(): Promise<boolean> {
    return (await this.getState()) === 'stopped';
  }

  /**
   * Check if runtime is in error state.
   *
   * @returns Promise resolving to true if runtime has error
   */
  async hasError(): Promise<boolean> {
    return (await this.getState()) === 'error';
  }

  // ========================================================================
  // Action Methods
  // ========================================================================

  /**
   * Delete this runtime permanently.
   *
   * After deletion, this object will be marked as deleted and subsequent
   * calls to dynamic methods will throw errors.
   *
   * @example
   * ```typescript
   * await runtime.delete();
   * console.log('Runtime deleted');
   * // runtime.getState() will now throw an error
   * ```
   */
  async delete(): Promise<void> {
    await this._sdk.deleteRuntime(this.podName);
    this._deleted = true;
  }

  /**
   * Update runtime from a snapshot.
   *
   * @param from - Snapshot identifier to restore from
   * @returns Promise resolving to updated Runtime instance
   *
   * @example
   * ```typescript
   * const updatedRuntime = await runtime.update('snapshot-uid');
   * ```
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
   * @param description - Optional description for the snapshot
   * @param stop - Whether to stop the runtime after snapshotting
   * @returns Promise resolving to created Snapshot instance
   *
   * @example
   * ```typescript
   * const snapshot = await runtime.createSnapshot(
   *   'my-checkpoint',
   *   'Before major changes'
   * );
   * ```
   */
  async createSnapshot(
    name: string,
    description?: string,
    stop?: boolean,
  ): Promise<Snapshot> {
    this._checkDeleted();
    const request: CreateRuntimeSnapshotRequest = {
      pod_name: this.podName,
      name,
      description: description || '',
      stop: stop || false,
    };

    // The SDK's createSnapshot already returns a Snapshot instance
    return await (this._sdk as any).createSnapshot(request);
  }

  /**
   * Wait for runtime to reach running state.
   *
   * Polls the runtime state until it becomes 'running' or throws on error/timeout.
   *
   * @param timeoutMs - Maximum time to wait in milliseconds (default: 60000)
   * @returns Promise resolving to this Runtime instance when ready
   * @throws Error if runtime enters error state or timeout is reached
   *
   * @example
   * ```typescript
   * const runtime = await sdk.createRuntime(config);
   * await runtime.waitUntilReady();
   * console.log('Runtime is ready to use!');
   * ```
   */
  async waitUntilReady(timeoutMs = 60000): Promise<Runtime> {
    this._checkDeleted();
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      if (await this.isRunning()) {
        return this;
      }

      if (await this.hasError()) {
        throw new Error(`Runtime ${this.podName} entered error state`);
      }

      // Wait 2 seconds before checking again
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    throw new Error(`Timeout waiting for runtime ${this.podName} to be ready`);
  }

  // ========================================================================
  // Utility Methods
  // ========================================================================

  /**
   * Get raw runtime data object with latest state.
   *
   * This method ensures the returned data includes the most recent state
   * by refreshing from the API before returning.
   *
   * @returns Promise resolving to raw runtime data
   *
   * @example
   * ```typescript
   * const latestData = await runtime.toJSON();
   * console.log('Current state:', latestData.state);
   * ```
   */
  async toJSON(): Promise<RuntimeData> {
    this._checkDeleted();
    await this.getState(); // This updates internal data
    return this._data;
  }

  /**
   * String representation of the runtime.
   *
   * @returns String representation for logging/debugging
   */
  toString(): string {
    this._checkDeleted();
    return `Runtime(${this.podName}, ${this.environmentName})`;
  }
}

// Re-export the RuntimeData type for convenience
export type { RuntimeData };
