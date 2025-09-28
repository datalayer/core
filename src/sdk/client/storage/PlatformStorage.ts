/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Platform-agnostic storage interface for the Datalayer SDK.
 * @module sdk/client/storage/PlatformStorage
 */

/** Platform-agnostic storage interface. */
export interface PlatformStorage {
  /**
   * Get a value from storage.
   * @param key - Storage key
   * @returns Stored value or null if not found
   */
  get(key: string): Promise<string | null>;

  /**
   * Set a value in storage.
   * @param key - Storage key
   * @param value - Value to store
   */
  set(key: string, value: string): Promise<void>;

  /**
   * Remove a value from storage.
   * @param key - Storage key to remove
   */
  remove(key: string): Promise<void>;

  /** Clear all values from storage. */
  clear(): Promise<void>;

  /**
   * Check if a key exists in storage.
   * @param key - Storage key to check
   * @returns True if the key exists
   */
  has(key: string): Promise<boolean>;
}

/** Storage key namespace to avoid collisions. */
export const STORAGE_NAMESPACE = '@datalayer/core';

/** Standard storage keys used by the SDK. */
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
 * @param key - Key to namespace
 * @returns Namespaced key
 */
export function createStorageKey(key: string): string {
  return `${STORAGE_NAMESPACE}:${key}`;
}

/**
 * Helper to parse stored JSON data.
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
 * @param data Data to stringify
 * @returns JSON string
 */
export function stringifyForStorage(data: unknown): string {
  return JSON.stringify(data);
}
