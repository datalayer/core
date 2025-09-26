/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * @module sdk/client/state/RuntimesState
 * @description Runtimes state management with caching and persistence.
 *
 * Handles runtime instances, environments, and compute resource state.
 */

import {
  PlatformStorage,
  StorageKeys,
  parseStoredData,
  stringifyForStorage,
} from '../storage';

/**
 * Runtime status enumeration.
 */
export enum RuntimeStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  TERMINATING = 'terminating',
  TERMINATED = 'terminated',
  FAILED = 'failed',
  UNKNOWN = 'unknown',
}

/**
 * Stored runtime data structure.
 */
export interface StoredRuntime {
  pod_name: string;
  status: RuntimeStatus;
  environment: string;
  created_at: string;
  updated_at?: string;
  credits_used?: number;
  max_credits?: number;
  snapshot_id?: string;
  kernel_url?: string;
  websocket_url?: string;
  // Metadata
  cached_at?: number;
}

/**
 * Stored environment data structure.
 */
export interface StoredEnvironment {
  name: string;
  display_name?: string;
  description?: string;
  image?: string;
  cpu?: number;
  memory?: string;
  gpu?: number;
  cost_per_hour?: number;
  available?: boolean;
  // Metadata
  cached_at?: number;
}

/**
 * Stored snapshot data structure.
 */
export interface StoredSnapshot {
  id: string;
  name: string;
  runtime_id: string;
  environment: string;
  created_at: string;
  size_bytes?: number;
  status?: string;
  // Metadata
  cached_at?: number;
}

/**
 * Runtimes state manager for compute resources.
 *
 * Features:
 * - Runtime instance caching with TTL
 * - Environment configuration caching
 * - Snapshot management
 * - Active runtime tracking
 * - Resource usage tracking
 *
 * @example
 * ```typescript
 * const storage = new BrowserStorage();
 * const runtimesState = new RuntimesState(storage);
 *
 * // Cache runtime data
 * await runtimesState.cacheRuntime(runtimeData);
 *
 * // Get cached runtimes
 * const runtimes = await runtimesState.getCachedRuntimes();
 *
 * // Track active runtime
 * await runtimesState.setActiveRuntime('pod-123');
 * ```
 */
export class RuntimesState {
  constructor(private storage: PlatformStorage) {}

  // ========================================================================
  // Runtime Management
  // ========================================================================

  /**
   * Get all cached runtimes.
   *
   * @param includeExpired - Include expired cache entries
   * @returns Array of cached runtimes
   */
  async getCachedRuntimes(includeExpired = false): Promise<StoredRuntime[]> {
    // Get the list of tracked runtime keys
    const keysList = await this.storage.get('runtime_keys');
    if (!keysList) {
      return [];
    }

    const runtimeKeys = parseStoredData<string[]>(keysList);
    if (!runtimeKeys || !Array.isArray(runtimeKeys)) {
      return [];
    }

    // Fetch all runtimes
    const runtimes: StoredRuntime[] = [];
    for (const podName of runtimeKeys) {
      const runtime = await this.getCachedRuntime(podName);
      if (runtime) {
        runtimes.push(runtime);
      }
    }

    if (!includeExpired) {
      return this.filterExpiredRuntimes(runtimes);
    }

    return runtimes;
  }

  /**
   * Get a specific cached runtime.
   *
   * @param podName - Runtime pod name
   * @returns Runtime data or null if not cached/expired
   */
  async getCachedRuntime(podName: string): Promise<StoredRuntime | null> {
    const key = `${StorageKeys.RUNTIME_PREFIX}${podName}`;
    const data = await this.storage.get(key);
    if (!data) return null;

    const runtime = parseStoredData<StoredRuntime>(data);
    if (!runtime) return null;

    // Check if cache is expired (5 minutes for runtime state)
    if (runtime.cached_at) {
      const now = Date.now();
      const maxAge = 5 * 60 * 1000; // 5 minutes
      if (now - runtime.cached_at > maxAge) {
        await this.storage.remove(key);
        return null;
      }
    }

    return runtime;
  }

  /**
   * Cache runtime data.
   *
   * @param runtime - Runtime data to cache
   */
  async cacheRuntime(runtime: StoredRuntime): Promise<void> {
    const key = `${StorageKeys.RUNTIME_PREFIX}${runtime.pod_name}`;
    const dataToCache = {
      ...runtime,
      cached_at: Date.now(),
    };
    await this.storage.set(key, stringifyForStorage(dataToCache));

    // Track the runtime key
    const keysList = await this.storage.get('runtime_keys');
    const runtimeKeys = keysList
      ? parseStoredData<string[]>(keysList) || []
      : [];

    if (!runtimeKeys.includes(runtime.pod_name)) {
      runtimeKeys.push(runtime.pod_name);
      await this.storage.set('runtime_keys', stringifyForStorage(runtimeKeys));
    }
  }

  /**
   * Remove cached runtime.
   *
   * @param podName - Runtime pod name
   */
  async removeCachedRuntime(podName: string): Promise<void> {
    const key = `${StorageKeys.RUNTIME_PREFIX}${podName}`;
    await this.storage.remove(key);

    // Remove from tracked keys
    const keysList = await this.storage.get('runtime_keys');
    if (keysList) {
      const runtimeKeys = parseStoredData<string[]>(keysList) || [];
      const filtered = runtimeKeys.filter(k => k !== podName);
      if (filtered.length !== runtimeKeys.length) {
        await this.storage.set('runtime_keys', stringifyForStorage(filtered));
      }
    }
  }

  /**
   * Get active runtime.
   *
   * Tracks the currently selected/active runtime.
   */
  async getActiveRuntime(): Promise<string | null> {
    return await this.storage.get('active_runtime');
  }

  /**
   * Set active runtime.
   *
   * @param podName - Runtime pod name to set as active
   */
  async setActiveRuntime(podName: string): Promise<void> {
    await this.storage.set('active_runtime', podName);
  }

  /**
   * Clear active runtime.
   */
  async clearActiveRuntime(): Promise<void> {
    await this.storage.remove('active_runtime');
  }

  // ========================================================================
  // Environment Management
  // ========================================================================

  /**
   * Get cached environments.
   *
   * @returns Array of cached environments
   */
  async getCachedEnvironments(): Promise<StoredEnvironment[]> {
    const data = await this.storage.get('environments_list');
    if (!data) return [];

    const cached = parseStoredData<{
      environments: StoredEnvironment[];
      cached_at: number;
    }>(data);

    if (!cached) return [];

    // Check if cache is expired (1 hour)
    const now = Date.now();
    const maxAge = 60 * 60 * 1000; // 1 hour
    if (now - cached.cached_at > maxAge) {
      await this.storage.remove('environments_list');
      return [];
    }

    return cached.environments;
  }

  /**
   * Cache environments list.
   *
   * @param environments - Environments to cache
   */
  async cacheEnvironments(environments: StoredEnvironment[]): Promise<void> {
    const cacheData = {
      environments,
      cached_at: Date.now(),
    };
    await this.storage.set('environments_list', stringifyForStorage(cacheData));
  }

  /**
   * Get a specific cached environment.
   *
   * @param name - Environment name
   * @returns Environment data or null
   */
  async getCachedEnvironment(name: string): Promise<StoredEnvironment | null> {
    const environments = await this.getCachedEnvironments();
    return environments.find(env => env.name === name) || null;
  }

  // ========================================================================
  // Snapshot Management
  // ========================================================================

  /**
   * Get cached snapshots for a runtime.
   *
   * @param runtimeId - Runtime ID/pod name
   * @returns Array of cached snapshots
   */
  async getCachedSnapshots(runtimeId?: string): Promise<StoredSnapshot[]> {
    // This would iterate through storage keys with snapshot prefix
    // For now, return empty array
    return [];
  }

  /**
   * Cache snapshot data.
   *
   * @param snapshot - Snapshot data to cache
   */
  async cacheSnapshot(snapshot: StoredSnapshot): Promise<void> {
    const key = `snapshot:${snapshot.id}`;
    const dataToCache = {
      ...snapshot,
      cached_at: Date.now(),
    };
    await this.storage.set(key, stringifyForStorage(dataToCache));
  }

  /**
   * Remove cached snapshot.
   *
   * @param snapshotId - Snapshot ID
   */
  async removeCachedSnapshot(snapshotId: string): Promise<void> {
    const key = `snapshot:${snapshotId}`;
    await this.storage.remove(key);
  }

  // ========================================================================
  // Service URLs
  // ========================================================================

  /**
   * Get stored Runtimes service URL.
   */
  async getRuntimesUrl(): Promise<string | null> {
    return await this.storage.get(StorageKeys.RUNTIMES_URL);
  }

  /**
   * Store Runtimes service URL.
   */
  async setRuntimesUrl(url: string): Promise<void> {
    await this.storage.set(StorageKeys.RUNTIMES_URL, url);
  }

  // ========================================================================
  // Helper Methods
  // ========================================================================

  /**
   * Filter expired runtimes from list.
   */
  private filterExpiredRuntimes(runtimes: StoredRuntime[]): StoredRuntime[] {
    const now = Date.now();
    const maxAge = 5 * 60 * 1000; // 5 minutes

    return runtimes.filter(runtime => {
      if (!runtime.cached_at) return true;
      return now - runtime.cached_at <= maxAge;
    });
  }

  /**
   * Clear all runtime-related state.
   */
  async clear(): Promise<void> {
    // Clear active runtime
    await this.clearActiveRuntime();

    // Clear environments cache
    await this.storage.remove('environments_list');

    // Clear tracked runtime keys and all runtime data
    const keysList = await this.storage.get('runtime_keys');
    if (keysList) {
      const runtimeKeys = parseStoredData<string[]>(keysList) || [];
      for (const podName of runtimeKeys) {
        const key = `${StorageKeys.RUNTIME_PREFIX}${podName}`;
        await this.storage.remove(key);
      }
      await this.storage.remove('runtime_keys');
    }
  }

  /**
   * Get runtime statistics.
   *
   * @returns Statistics about cached runtimes
   */
  async getStatistics(): Promise<{
    totalRuntimes: number;
    activeRuntimes: number;
    totalCreditsUsed: number;
  }> {
    const runtimes = await this.getCachedRuntimes();

    const activeRuntimes = runtimes.filter(
      r => r.status === RuntimeStatus.RUNNING,
    ).length;

    const totalCreditsUsed = runtimes.reduce(
      (sum, r) => sum + (r.credits_used || 0),
      0,
    );

    return {
      totalRuntimes: runtimes.length,
      activeRuntimes,
      totalCreditsUsed,
    };
  }
}
