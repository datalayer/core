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
import type {
  Runtime as RuntimeData,
  CreateRuntimeSnapshotRequest,
} from '../../api/types/runtimes';
import type { DatalayerClient } from '../index';
import { Snapshot } from './Snapshot';

/**
 * Stable public interface for Runtime data.
 * This is the contract that SDK consumers can rely on.
 * The raw API may change, but this interface remains stable.
 */
export interface RuntimeJSON {
  /** Unique identifier for the runtime */
  uid: string;
  /** Kubernetes pod name for the runtime instance */
  podName: string;
  /** User-friendly name for the runtime */
  givenName?: string;
  /** Name of the environment this runtime is based on */
  environmentName: string;
  /** Title of the environment for display */
  environmentTitle?: string;
  /** Current state of the runtime */
  state?: 'starting' | 'running' | 'stopping' | 'stopped' | 'error';
  /** Type of runtime - notebook, terminal, or job */
  type?: 'notebook' | 'terminal' | 'job';
  /** Credits consumed per hour */
  burningRate: number;
  /** Ingress URL for accessing the runtime */
  ingress?: string;
  /** Authentication token for accessing the runtime */
  token?: string;
  /** URL for accessing Jupyter server */
  jupyterUrl?: string;
  /** Token for Jupyter server authentication */
  jupyterToken?: string;
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

  /** URL for accessing Jupyter server. */
  get jupyterUrl(): string {
    this._checkDeleted();
    return this._data.jupyter_url || '';
  }

  /** Token for Jupyter server authentication. */
  get jupyterToken(): string {
    this._checkDeleted();
    return this._data.jupyter_token || '';
  }

  /** Ingress URL for accessing the runtime. */
  get ingress(): string {
    this._checkDeleted();
    return this._data.ingress || '';
  }

  /** Authentication token for accessing the runtime. */
  get token(): string {
    this._checkDeleted();
    return this._data.token || '';
  }

  /** Credits consumed per hour. */
  get burningRate(): number {
    this._checkDeleted();
    return this._data.burning_rate;
  }

  /** User-friendly name for the runtime. */
  get givenName(): string {
    this._checkDeleted();
    return this._data.given_name || '';
  }

  /** Type of runtime (notebook, terminal, or job). */
  get type(): string {
    this._checkDeleted();
    return this._data.type || 'notebook';
  }

  /** When the runtime was created. */
  get createdAt(): Date {
    this._checkDeleted();
    return new Date(this._data.created_at || '');
  }

  /** When the runtime started. */
  get startedAt(): Date {
    this._checkDeleted();
    return new Date(this._data.started_at || '');
  }

  /** When the runtime will expire. */
  get expiredAt(): Date {
    this._checkDeleted();
    return new Date(this._data.expired_at || '');
  }

  /** Current state of the runtime (cached). */
  get state(): string {
    this._checkDeleted();
    return this._data.state || 'unknown';
  }

  /** Environment title for display. */
  get environmentTitle(): string {
    this._checkDeleted();
    return this._data.environment_title || '';
  }

  // ========================================================================
  // Dynamic State (always fetches fresh and updates internal data)
  // ========================================================================

  /**
   * Get the current state of the runtime.
   * Always fetches fresh data from the API.
   *
   * @returns Current runtime state
   * @throws Error if deleted
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
   * @returns True if runtime is running
   */
  async isRunning(): Promise<boolean> {
    return (await this.getState()) === 'running';
  }

  /**
   * Check if runtime is in starting state.
   *
   * @returns True if runtime is starting
   */
  async isStarting(): Promise<boolean> {
    return (await this.getState()) === 'starting';
  }

  /**
   * Check if runtime is in stopping state.
   *
   * @returns True if runtime is stopping
   */
  async isStopping(): Promise<boolean> {
    return (await this.getState()) === 'stopping';
  }

  /**
   * Check if runtime is in stopped state.
   *
   * @returns True if runtime is stopped
   */
  async isStopped(): Promise<boolean> {
    return (await this.getState()) === 'stopped';
  }

  /**
   * Check if runtime is in error state.
   *
   * @returns True if runtime has error
   */
  async hasError(): Promise<boolean> {
    return (await this.getState()) === 'error';
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
   * Polls until 'running' state or throws on error/timeout.
   *
   * @param timeoutMs - Maximum wait time in milliseconds (default: 60000)
   * @returns This Runtime instance when ready
   * @throws Error if enters error state or timeout reached
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
   * Get runtime data in camelCase format.
   * Returns only the core fields that consumers need.
   * This provides a stable interface regardless of API changes.
   * Returns the current cached state - call getState() first if you need fresh data.
   *
   * @returns Core runtime data with camelCase properties
   */
  toJSON(): RuntimeJSON {
    this._checkDeleted();

    return {
      // Core identifiers
      uid: this._data.uid,
      podName: this._data.pod_name,
      givenName: this._data.given_name,

      // Environment info
      environmentName: this._data.environment_name,
      environmentTitle: this._data.environment_title,

      // State and type
      state: this._data.state,
      type: this._data.type,

      // Credits and burning
      burningRate: this._data.burning_rate,

      // URLs and tokens
      ingress: this._data.ingress,
      token: this._data.token,
      jupyterUrl: this._data.jupyter_url,
      jupyterToken: this._data.jupyter_token,
    };
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
