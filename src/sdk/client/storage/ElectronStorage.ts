/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * @module sdk/client/storage/ElectronStorage
 * @description Electron storage implementation for Desktop applications.
 *
 * Uses electron-store for persistent storage with encryption support.
 * Designed for Electron main and renderer processes.
 */

import { PlatformStorage, STORAGE_NAMESPACE } from './PlatformStorage';

/**
 * Electron storage options.
 */
export interface ElectronStorageOptions {
  /**
   * Storage name (creates separate file).
   * @default 'datalayer'
   */
  name?: string;

  /**
   * Encryption key for secure storage.
   * If provided, data will be encrypted.
   */
  encryptionKey?: string;

  /**
   * Custom storage directory.
   * @default app.getPath('userData')
   */
  cwd?: string;

  /**
   * File extension for storage file.
   * @default 'json'
   */
  fileExtension?: string;

  /**
   * Custom prefix for storage keys.
   */
  prefix?: string;

  /**
   * Clear invalid config instead of throwing error.
   * @default true
   */
  clearInvalidConfig?: boolean;

  /**
   * Watch for external changes to the store file.
   * @default false
   */
  watch?: boolean;
}

/**
 * ElectronStore interface (from electron-store package).
 */
interface ElectronStore {
  get(key: string, defaultValue?: any): any;
  set(key: string, value: any): void;
  has(key: string): boolean;
  delete(key: string): void;
  clear(): void;
  readonly size: number;
  readonly store: Record<string, any>;
  readonly path: string;
}

/**
 * Electron storage implementation using electron-store.
 *
 * Features:
 * - Persistent JSON storage with atomicity
 * - Optional encryption for sensitive data
 * - Schema validation support
 * - Watch for external changes
 * - Works in both main and renderer processes
 *
 * @example
 * ```typescript
 * // Basic usage
 * const storage = new ElectronStorage();
 *
 * // With encryption
 * const storage = new ElectronStorage({
 *   encryptionKey: 'my-secret-key'
 * });
 *
 * // Custom storage location
 * const storage = new ElectronStorage({
 *   name: 'myapp-storage',
 *   cwd: '/custom/path'
 * });
 * ```
 */
export class ElectronStorage implements PlatformStorage {
  private store?: ElectronStore;
  private prefix: string;
  private storeOptions: ElectronStorageOptions;
  private initPromise?: Promise<void>;

  constructor(options: ElectronStorageOptions = {}) {
    this.prefix = options.prefix || STORAGE_NAMESPACE;
    this.storeOptions = {
      name: options.name || 'datalayer',
      fileExtension: options.fileExtension || 'json',
      clearInvalidConfig: options.clearInvalidConfig !== false,
      watch: options.watch || false,
      ...options,
    };

    // Initialize store lazily
    this.initPromise = this.initStore();
  }

  /**
   * Initialize electron-store.
   */
  private async initStore(): Promise<void> {
    try {
      // Dynamic import to make it optional
      const Store = await this.loadElectronStore();

      this.store = new Store({
        name: this.storeOptions.name,
        encryptionKey: this.storeOptions.encryptionKey,
        cwd: this.storeOptions.cwd,
        fileExtension: this.storeOptions.fileExtension,
        clearInvalidConfig: this.storeOptions.clearInvalidConfig,
        watch: this.storeOptions.watch,

        // Schema for validation
        schema: {
          type: 'object',
          additionalProperties: true,
        },

        // Migrations for version updates
        migrations: {
          '1.0.0': (store: any) => {
            // Future migration logic
          },
        },
      }) as unknown as ElectronStore;
    } catch (error) {
      console.error('Failed to initialize electron-store', error);
      // Fall back to in-memory storage
      this.store = new InMemoryElectronStore();
    }
  }

  /**
   * Load electron-store module.
   */
  private async loadElectronStore(): Promise<any> {
    try {
      // Try different import methods
      if (typeof require !== 'undefined') {
        return require('electron-store');
      } else {
        // ES module import
        const module = await import('electron-store');
        return module.default || module;
      }
    } catch (error) {
      throw new Error('electron-store not available');
    }
  }

  /**
   * Ensure store is initialized.
   */
  private async ensureStore(): Promise<ElectronStore> {
    if (!this.store && this.initPromise) {
      await this.initPromise;
    }
    if (!this.store) {
      throw new Error('ElectronStorage not initialized');
    }
    return this.store;
  }

  /**
   * Create a prefixed key.
   */
  private createKey(key: string): string {
    return `${this.prefix}:${key}`;
  }

  async get(key: string): Promise<string | null> {
    try {
      const store = await this.ensureStore();
      const value = store.get(this.createKey(key));

      // Handle different value types
      if (value === undefined || value === null) {
        return null;
      }

      if (typeof value === 'string') {
        return value;
      }

      // Convert to string if needed
      return JSON.stringify(value);
    } catch (error) {
      console.error('Failed to get from ElectronStorage', error);
      return null;
    }
  }

  async set(key: string, value: string): Promise<void> {
    try {
      const store = await this.ensureStore();

      // Try to parse as JSON if it looks like JSON
      let valueToStore: any = value;
      if (value.startsWith('{') || value.startsWith('[')) {
        try {
          valueToStore = JSON.parse(value);
        } catch {
          // Keep as string if not valid JSON
        }
      }

      store.set(this.createKey(key), valueToStore);
    } catch (error) {
      console.error('Failed to set in ElectronStorage', error);
      throw error;
    }
  }

  async remove(key: string): Promise<void> {
    try {
      const store = await this.ensureStore();
      store.delete(this.createKey(key));
    } catch (error) {
      console.error('Failed to remove from ElectronStorage', error);
    }
  }

  async clear(): Promise<void> {
    try {
      const store = await this.ensureStore();

      // Get all keys with our prefix
      const storeData = store.store;
      const keysToRemove: string[] = [];

      for (const key in storeData) {
        if (key.startsWith(this.prefix)) {
          keysToRemove.push(key);
        }
      }

      // Remove each key
      keysToRemove.forEach(key => store.delete(key));
    } catch (error) {
      console.error('Failed to clear ElectronStorage', error);
    }
  }

  async has(key: string): Promise<boolean> {
    try {
      const store = await this.ensureStore();
      return store.has(this.createKey(key));
    } catch {
      return false;
    }
  }

  /**
   * Get the storage file path.
   */
  async getStoragePath(): Promise<string | undefined> {
    try {
      const store = await this.ensureStore();
      return store.path;
    } catch {
      return undefined;
    }
  }

  /**
   * Get storage size (number of entries).
   */
  async getSize(): Promise<number> {
    try {
      const store = await this.ensureStore();
      return store.size;
    } catch {
      return 0;
    }
  }
}

/**
 * In-memory fallback for when electron-store is not available.
 */
class InMemoryElectronStore implements ElectronStore {
  private data = new Map<string, any>();

  get size(): number {
    return this.data.size;
  }

  get store(): Record<string, any> {
    return Object.fromEntries(this.data.entries());
  }

  get path(): string {
    return 'memory://electron-store';
  }

  get(key: string, defaultValue?: any): any {
    return this.data.get(key) ?? defaultValue;
  }

  set(key: string, value: any): void {
    this.data.set(key, value);
  }

  has(key: string): boolean {
    return this.data.has(key);
  }

  delete(key: string): void {
    this.data.delete(key);
  }

  clear(): void {
    this.data.clear();
  }
}
