/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * @module sdk/client/storage/PlatformStorage
 * @description Platform-agnostic storage interface for the Datalayer SDK.
 *
 * This interface provides a consistent API for storage across different platforms:
 * - Browser (localStorage/sessionStorage)
 * - Node.js (file system, keytar)
 * - Electron (electron-store)
 *
 * The interface is intentionally minimal with only 5 methods to maintain
 * clean separation of concerns. Service-specific state management is handled
 * by State Managers (IAMState, RuntimesState, SpacerState).
 */

/**
 * Platform-agnostic storage interface.
 *
 * Implementations handle platform-specific storage mechanisms while providing
 * a consistent async API. All methods are async to support various storage
 * backends (filesystem, keychain, IndexedDB, etc.).
 *
 * @example
 * ```typescript
 * // Browser implementation
 * const storage = new BrowserStorage();
 * await storage.set('token', 'abc123');
 * const token = await storage.get('token');
 *
 * // VS Code implementation
 * const storage = new NodeStorage();
 * await storage.set('token', 'abc123'); // Uses keytar
 * ```
 */
export interface PlatformStorage {
  /**
   * Get a value from storage.
   *
   * @param key - Storage key
   * @returns The stored value or null if not found
   */
  get(key: string): Promise<string | null>;

  /**
   * Set a value in storage.
   *
   * @param key - Storage key
   * @param value - Value to store (will be serialized as string)
   */
  set(key: string, value: string): Promise<void>;

  /**
   * Remove a value from storage.
   *
   * @param key - Storage key to remove
   */
  remove(key: string): Promise<void>;

  /**
   * Clear all values from storage.
   *
   * Should only clear values related to this SDK, not all storage.
   */
  clear(): Promise<void>;

  /**
   * Check if a key exists in storage.
   *
   * @param key - Storage key to check
   * @returns True if the key exists
   */
  has(key: string): Promise<boolean>;
}

/**
 * Storage key namespace to avoid collisions.
 */
export const STORAGE_NAMESPACE = '@datalayer/core';

/**
 * Standard storage keys used by the SDK.
 */
export enum StorageKeys {
  // Authentication
  TOKEN = 'token',
  REFRESH_TOKEN = 'refresh_token',
  USER = 'user',

  // Service URLs
  IAM_URL = 'iam_url',
  RUNTIMES_URL = 'runtimes_url',
  SPACER_URL = 'spacer_url',

  // Cache prefixes
  GITHUB_USER_PREFIX = 'github_user:',
  RUNTIME_PREFIX = 'runtime:',
  ENVIRONMENT_PREFIX = 'env:',
  SPACE_PREFIX = 'space:',
  NOTEBOOK_PREFIX = 'notebook:',
  LEXICAL_PREFIX = 'lexical:',

  // Cache metadata
  CACHE_VERSION = 'cache_version',
  CACHE_TIMESTAMP = 'cache_timestamp',
}

/**
 * Helper to create namespaced storage keys.
 *
 * @param key - Key to namespace
 * @returns Namespaced key
 */
export function createStorageKey(key: string): string {
  return `${STORAGE_NAMESPACE}:${key}`;
}

/**
 * Helper to parse stored JSON data.
 *
 * @param value - JSON string to parse
 * @returns Parsed object or null if invalid
 */
export function parseStoredData<T>(value: string | null): T | null {
  if (!value) return null;

  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

/**
 * Helper to stringify data for storage.
 *
 * @param data - Data to stringify
 * @returns JSON string
 */
export function stringifyForStorage(data: unknown): string {
  return JSON.stringify(data);
}
