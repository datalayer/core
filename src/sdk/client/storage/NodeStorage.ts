/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * @module sdk/client/storage/NodeStorage
 * @description Node.js storage implementation for VS Code and CLI environments.
 *
 * Uses file system for general storage and optional keytar for secure credentials.
 * This implementation is designed for Node.js environments like VS Code extensions.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { PlatformStorage, STORAGE_NAMESPACE } from './PlatformStorage';

/**
 * Node.js storage options.
 */
export interface NodeStorageOptions {
  /**
   * Storage directory path.
   * @default ~/.datalayer/storage
   */
  storagePath?: string;

  /**
   * Use keytar for secure credential storage (if available).
   * @default true
   */
  useKeytar?: boolean;

  /**
   * Service name for keytar.
   * @default 'datalayer'
   */
  keytarService?: string;

  /**
   * Custom prefix for storage keys.
   */
  prefix?: string;
}

/**
 * Keytar interface (optional dependency).
 */
interface Keytar {
  getPassword(service: string, account: string): Promise<string | null>;
  setPassword(
    service: string,
    account: string,
    password: string,
  ): Promise<void>;
  deletePassword(service: string, account: string): Promise<boolean>;
  findCredentials(
    service: string,
  ): Promise<Array<{ account: string; password: string }>>;
}

/**
 * Node.js storage implementation using file system and optional keytar.
 *
 * Features:
 * - File-based storage for general data
 * - Optional keytar integration for secure credentials
 * - Atomic writes to prevent corruption
 * - Automatic directory creation
 *
 * @example
 * ```typescript
 * // Basic usage
 * const storage = new NodeStorage();
 *
 * // Custom storage path
 * const storage = new NodeStorage({
 *   storagePath: '/custom/path'
 * });
 *
 * // Disable keytar
 * const storage = new NodeStorage({
 *   useKeytar: false
 * });
 * ```
 */
export class NodeStorage implements PlatformStorage {
  private storagePath: string;
  private useKeytar: boolean;
  private keytarService: string;
  private prefix: string;
  private keytar?: Keytar;
  private storageFile: string;
  private cache: Map<string, string> = new Map();

  constructor(options: NodeStorageOptions = {}) {
    this.prefix = options.prefix || STORAGE_NAMESPACE;
    this.storagePath =
      options.storagePath || path.join(os.homedir(), '.datalayer', 'storage');
    this.useKeytar = options.useKeytar !== false;
    this.keytarService = options.keytarService || 'datalayer';
    this.storageFile = path.join(
      this.storagePath,
      `${this.prefix.replace(/[^a-z0-9]/gi, '_')}.json`,
    );

    // Try to load keytar if requested
    if (this.useKeytar) {
      this.loadKeytar();
    }

    // Initialize storage
    this.initStorage().catch(console.error);
  }

  /**
   * Try to load keytar module.
   */
  private loadKeytar(): void {
    try {
      // Dynamic import to make it optional
      this.keytar = require('keytar') as Keytar;
    } catch {
      console.warn('keytar not available, using file storage for all data');
      this.useKeytar = false;
    }
  }

  /**
   * Initialize storage directory and load cache.
   */
  private async initStorage(): Promise<void> {
    try {
      // Ensure storage directory exists
      await fs.mkdir(this.storagePath, { recursive: true });

      // Load existing data into cache
      await this.loadCache();
    } catch (error) {
      console.error('Failed to initialize storage', error);
    }
  }

  /**
   * Load data from file into cache.
   */
  private async loadCache(): Promise<void> {
    try {
      const data = await fs.readFile(this.storageFile, 'utf-8');
      const parsed = JSON.parse(data) as Record<string, string>;
      this.cache = new Map(Object.entries(parsed));
    } catch {
      // File doesn't exist or is invalid, start fresh
      this.cache = new Map();
    }
  }

  /**
   * Save cache to file.
   */
  private async saveCache(): Promise<void> {
    try {
      const data = Object.fromEntries(this.cache.entries());
      const json = JSON.stringify(data, null, 2);

      // Atomic write: write to temp file then rename
      const tempFile = `${this.storageFile}.tmp`;
      await fs.writeFile(tempFile, json, 'utf-8');
      await fs.rename(tempFile, this.storageFile);
    } catch (error) {
      console.error('Failed to save cache', error);
      throw error;
    }
  }

  /**
   * Check if key should be stored securely.
   */
  private isSecureKey(key: string): boolean {
    const secureKeys = ['token', 'password', 'secret', 'key', 'credential'];
    return secureKeys.some(sk => key.toLowerCase().includes(sk));
  }

  /**
   * Create a prefixed key.
   */
  private createKey(key: string): string {
    return `${this.prefix}:${key}`;
  }

  async get(key: string): Promise<string | null> {
    const fullKey = this.createKey(key);

    // Check if this should come from keytar
    if (this.useKeytar && this.keytar && this.isSecureKey(key)) {
      try {
        const value = await this.keytar.getPassword(
          this.keytarService,
          fullKey,
        );
        if (value) return value;
      } catch (error) {
        console.warn('Failed to get from keytar', error);
      }
    }

    // Check cache
    return this.cache.get(fullKey) ?? null;
  }

  async set(key: string, value: string): Promise<void> {
    const fullKey = this.createKey(key);

    // Store in keytar if appropriate
    if (this.useKeytar && this.keytar && this.isSecureKey(key)) {
      try {
        await this.keytar.setPassword(this.keytarService, fullKey, value);
        // Also remove from file storage if it exists
        if (this.cache.has(fullKey)) {
          this.cache.delete(fullKey);
          await this.saveCache();
        }
        return;
      } catch (error) {
        console.warn(
          'Failed to set in keytar, falling back to file storage',
          error,
        );
      }
    }

    // Store in file
    this.cache.set(fullKey, value);
    await this.saveCache();
  }

  async remove(key: string): Promise<void> {
    const fullKey = this.createKey(key);

    // Remove from keytar if appropriate
    if (this.useKeytar && this.keytar && this.isSecureKey(key)) {
      try {
        await this.keytar.deletePassword(this.keytarService, fullKey);
      } catch (error) {
        console.warn('Failed to remove from keytar', error);
      }
    }

    // Remove from cache
    if (this.cache.has(fullKey)) {
      this.cache.delete(fullKey);
      await this.saveCache();
    }
  }

  async clear(): Promise<void> {
    // Clear keytar entries
    if (this.useKeytar && this.keytar) {
      try {
        const credentials = await this.keytar.findCredentials(
          this.keytarService,
        );
        for (const cred of credentials) {
          if (cred.account.startsWith(this.prefix)) {
            await this.keytar.deletePassword(this.keytarService, cred.account);
          }
        }
      } catch (error) {
        console.warn('Failed to clear keytar', error);
      }
    }

    // Clear file storage
    const keysToRemove: string[] = [];
    for (const key of this.cache.keys()) {
      if (key.startsWith(this.prefix)) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach(key => this.cache.delete(key));
    await this.saveCache();
  }

  async has(key: string): Promise<boolean> {
    const fullKey = this.createKey(key);

    // Check keytar first
    if (this.useKeytar && this.keytar && this.isSecureKey(key)) {
      try {
        const value = await this.keytar.getPassword(
          this.keytarService,
          fullKey,
        );
        if (value !== null) return true;
      } catch {
        // Continue to check cache
      }
    }

    return this.cache.has(fullKey);
  }
}

/**
 * Simple file-based storage without keytar dependency.
 * Useful for environments where keytar is not available.
 */
export class SimpleNodeStorage extends NodeStorage {
  constructor(options: NodeStorageOptions = {}) {
    super({ ...options, useKeytar: false });
  }
}
