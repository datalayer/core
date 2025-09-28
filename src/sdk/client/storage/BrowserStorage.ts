/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * @module sdk/client/storage/BrowserStorage
 * @description Browser storage implementation using localStorage with sessionStorage fallback.
 */

import { PlatformStorage, STORAGE_NAMESPACE } from './PlatformStorage';

/**
 * Browser storage options.
 */
export interface BrowserStorageOptions {
  /**
   * Use sessionStorage instead of localStorage.
   * @default false
   */
  useSessionStorage?: boolean;

  /**
   * Custom storage prefix (overrides default namespace).
   */
  prefix?: string;

  /**
   * Enable encryption for sensitive data.
   * @default false
   */
  encrypt?: boolean;
}

/**
 * Browser storage implementation using localStorage/sessionStorage.
 */
export class BrowserStorage implements PlatformStorage {
  private storage: Storage;
  private prefix: string;
  private encrypt: boolean;

  constructor(options: BrowserStorageOptions = {}) {
    this.prefix = options.prefix || STORAGE_NAMESPACE;
    this.encrypt = options.encrypt || false;

    // Determine which storage to use
    if (options.useSessionStorage) {
      this.storage = this.getSessionStorage();
    } else {
      this.storage = this.getLocalStorage();
    }
  }

  /**
   * Get localStorage with fallback to sessionStorage.
   */
  private getLocalStorage(): Storage {
    try {
      // Test if localStorage is available and working
      const testKey = `${this.prefix}:test`;
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return localStorage;
    } catch {
      // Fall back to sessionStorage
      console.warn('localStorage unavailable, falling back to sessionStorage');
      return this.getSessionStorage();
    }
  }

  /**
   * Get sessionStorage with fallback to in-memory storage.
   */
  private getSessionStorage(): Storage {
    try {
      // Test if sessionStorage is available
      const testKey = `${this.prefix}:test`;
      sessionStorage.setItem(testKey, 'test');
      sessionStorage.removeItem(testKey);
      return sessionStorage;
    } catch {
      // Fall back to in-memory storage
      console.warn('sessionStorage unavailable, using in-memory storage');
      return new InMemoryStorage();
    }
  }

  /**
   * Create a prefixed key.
   */
  private createKey(key: string): string {
    return `${this.prefix}:${key}`;
  }

  /**
   * Encrypt value if encryption is enabled.
   */
  private async encryptValue(value: string): Promise<string> {
    if (!this.encrypt || !globalThis.crypto?.subtle) {
      return value;
    }

    // Handle empty strings - no need to encrypt
    if (value === '') {
      return value;
    }

    try {
      // Simple encryption using Web Crypto API
      const encoder = new TextEncoder();
      const data = encoder.encode(value);

      // Derive a key from the prefix (not secure, just obfuscation)
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(this.prefix.padEnd(32, '0')),
        { name: 'PBKDF2' },
        false,
        ['deriveBits', 'deriveKey'],
      );

      const key = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: encoder.encode('datalayer'),
          iterations: 100,
          hash: 'SHA-256',
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt'],
      );

      const iv = crypto.getRandomValues(new Uint8Array(12));
      const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        data,
      );

      // Combine iv and encrypted data
      const combined = new Uint8Array(iv.length + encrypted.byteLength);
      combined.set(iv, 0);
      combined.set(new Uint8Array(encrypted), iv.length);

      // Convert to base64
      return btoa(String.fromCharCode(...combined));
    } catch (error) {
      console.warn('Encryption failed, storing unencrypted', error);
      return value;
    }
  }

  /**
   * Decrypt value if encryption is enabled.
   */
  private async decryptValue(value: string): Promise<string> {
    if (!this.encrypt || !globalThis.crypto?.subtle) {
      return value;
    }

    try {
      // Decode from base64
      const combined = Uint8Array.from(atob(value), c => c.charCodeAt(0));

      // Extract iv and encrypted data
      const iv = combined.slice(0, 12);
      const encrypted = combined.slice(12);

      // Derive the same key
      const encoder = new TextEncoder();
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(this.prefix.padEnd(32, '0')),
        { name: 'PBKDF2' },
        false,
        ['deriveBits', 'deriveKey'],
      );

      const key = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: encoder.encode('datalayer'),
          iterations: 100,
          hash: 'SHA-256',
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt'],
      );

      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        encrypted,
      );

      const decoder = new TextDecoder();
      return decoder.decode(decrypted);
    } catch (error) {
      console.warn('Decryption failed, returning original', error);
      return value;
    }
  }

  async get(key: string): Promise<string | null> {
    try {
      const storedValue = this.storage.getItem(this.createKey(key));
      if (storedValue === null) return null;

      return await this.decryptValue(storedValue);
    } catch (error) {
      console.error('Failed to get from storage', error);
      return null;
    }
  }

  async set(key: string, value: string): Promise<void> {
    try {
      const encryptedValue = await this.encryptValue(value);
      this.storage.setItem(this.createKey(key), encryptedValue);
    } catch (error) {
      if (
        error instanceof DOMException &&
        error.name === 'QuotaExceededError'
      ) {
        // Try to clear old cache entries
        this.clearOldCache();
        // Retry once
        try {
          const encryptedValue = await this.encryptValue(value);
          this.storage.setItem(this.createKey(key), encryptedValue);
        } catch {
          throw new Error('Storage quota exceeded');
        }
      } else {
        throw error;
      }
    }
  }

  async remove(key: string): Promise<void> {
    try {
      this.storage.removeItem(this.createKey(key));
    } catch (error) {
      console.error('Failed to remove from storage', error);
    }
  }

  async clear(): Promise<void> {
    try {
      // Only clear keys with our prefix
      const keysToRemove: string[] = [];
      for (let i = 0; i < this.storage.length; i++) {
        const key = this.storage.key(i);
        if (key?.startsWith(this.prefix)) {
          keysToRemove.push(key);
        }
      }

      keysToRemove.forEach(key => this.storage.removeItem(key));
    } catch (error) {
      console.error('Failed to clear storage', error);
    }
  }

  async has(key: string): Promise<boolean> {
    try {
      return this.storage.getItem(this.createKey(key)) !== null;
    } catch {
      return false;
    }
  }

  /**
   * Clear old cache entries to free up space.
   */
  private clearOldCache(): void {
    try {
      const cacheKeys: string[] = [];

      for (let i = 0; i < this.storage.length; i++) {
        const key = this.storage.key(i);
        if (key?.startsWith(this.prefix) && key.includes('_cache_')) {
          cacheKeys.push(key);
        }
      }

      // Remove oldest cache entries (keep last 50)
      if (cacheKeys.length > 50) {
        cacheKeys
          .slice(0, cacheKeys.length - 50)
          .forEach(key => this.storage.removeItem(key));
      }
    } catch (error) {
      console.error('Failed to clear old cache', error);
    }
  }
}

/**
 * In-memory storage fallback for environments without any storage.
 */
class InMemoryStorage implements Storage {
  private data = new Map<string, string>();

  get length(): number {
    return this.data.size;
  }

  clear(): void {
    this.data.clear();
  }

  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }

  key(index: number): string | null {
    return Array.from(this.data.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.data.delete(key);
  }

  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }
}
