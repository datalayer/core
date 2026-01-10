/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 *
 * Datalayer License
 */

/**
 * Token storage backend implementations
 */

import {
  DATALAYER_IAM_TOKEN_KEY,
  DATALAYER_IAM_USER_KEY,
} from '../../state/storage/IAMStorage';
import type { TokenStorage } from './types';
import { UserDTO } from '../../models/UserDTO';

/**
 * Browser localStorage-based token storage
 */
export class BrowserStorage implements TokenStorage {
  /**
   * Get token from browser localStorage
   */
  get(key: string): string | null {
    if (typeof window === 'undefined') {
      return null;
    }
    return window.localStorage.getItem(key);
  }

  /**
   * Set token in browser localStorage
   */
  set(key: string, value: string): void {
    if (typeof window === 'undefined') {
      return;
    }
    window.localStorage.setItem(key, value);
  }

  /**
   * Delete token from browser localStorage
   */
  delete(key: string): void {
    if (typeof window === 'undefined') {
      return;
    }
    window.localStorage.removeItem(key);
  }

  /**
   * Check if browser localStorage is available
   */
  isAvailable(): boolean {
    return typeof window !== 'undefined' && !!window.localStorage;
  }

  /**
   * Get stored authentication token
   */
  getToken(): string | null {
    return this.get(DATALAYER_IAM_TOKEN_KEY);
  }

  /**
   * Store authentication token
   */
  setToken(token: string): void {
    this.set(DATALAYER_IAM_TOKEN_KEY, token);
  }

  /**
   * Delete authentication token
   */
  deleteToken(): void {
    this.delete(DATALAYER_IAM_TOKEN_KEY);
  }

  /**
   * Get stored user data
   */
  getUser(): UserDTO | null {
    const userData = this.get(DATALAYER_IAM_USER_KEY);
    if (!userData) {
      return null;
    }
    try {
      const parsed = JSON.parse(userData);
      return parsed as UserDTO;
    } catch (error) {
      console.error('Failed to parse stored user data:', error);
      return null;
    }
  }

  /**
   * Store user data
   */
  setUser(user: UserDTO): void {
    this.set(DATALAYER_IAM_USER_KEY, JSON.stringify(user));
  }

  /**
   * Delete user data
   */
  deleteUser(): void {
    this.delete(DATALAYER_IAM_USER_KEY);
  }

  /**
   * Clear all authentication data
   */
  clear(): void {
    this.deleteToken();
    this.deleteUser();
  }
}

/**
 * Node.js storage with keyring support using keytar
 */
export class NodeStorage implements TokenStorage {
  private memoryStorage: Map<string, string> = new Map();
  private keytar: any = null;
  private serviceUrl: string;

  constructor(serviceUrl: string = 'https://prod1.datalayer.run') {
    this.serviceUrl = serviceUrl;
    try {
      // Load keytar for system keyring access
      // VS Code bundles keytar, but require path may vary
      // Try multiple possible paths for compatibility
      try {
        this.keytar = require('keytar');
      } catch {
        // Try alternate path for VS Code bundled keytar
        this.keytar = require('@vscode/keytar');
      }
    } catch (e) {
      // Keyring not available, tokens will not persist across sessions
      console.warn('keytar not available, tokens will not persist');
    }
  }

  /**
   * Get token from keyring, environment variable, or memory
   * Supports both sync (getPasswordSync) and async (getPassword) keytar APIs
   */
  get(key: string): string | null {
    // 1. Try keyring first (if available)
    if (this.keytar) {
      try {
        // Try sync API first (CLI keytar)
        if (this.keytar.getPasswordSync) {
          const value = this.keytar.getPasswordSync(this.serviceUrl, key);
          if (value) return value;
        }
      } catch (e) {
        // Fall through to other methods
      }
    }

    // 2. Try environment variables
    const envValue = process.env[key];
    if (envValue) return envValue;

    // 3. Fall back to memory storage
    return this.memoryStorage.get(key) || null;
  }

  /**
   * Set token in keyring or memory storage (sync version)
   */
  set(key: string, value: string): void {
    // Store in keyring if available and has sync API
    if (this.keytar && this.keytar.setPasswordSync) {
      try {
        this.keytar.setPasswordSync(this.serviceUrl, key, value);
        return;
      } catch (e) {
        // Fall through to memory storage
      }
    }
    // Fall back to memory
    this.memoryStorage.set(key, value);
  }

  /**
   * Async version of set - supports VS Code's async keytar API
   */
  async setAsync(key: string, value: string): Promise<void> {
    // Store in keyring if available
    if (this.keytar) {
      try {
        // Try async API (VS Code keytar)
        if (this.keytar.setPassword) {
          await this.keytar.setPassword(this.serviceUrl, key, value);
          // IMPORTANT: Also store in memory so synchronous get() can access it
          this.memoryStorage.set(key, value);
          return;
        }
        // Try sync API (CLI keytar)
        else if (this.keytar.setPasswordSync) {
          this.keytar.setPasswordSync(this.serviceUrl, key, value);
          // Also store in memory for consistency
          this.memoryStorage.set(key, value);
          return;
        }
      } catch (e) {
        // Fall through to memory storage
      }
    }
    // Fall back to memory
    this.memoryStorage.set(key, value);
  }

  /**
   * Async version of get - supports VS Code's async keytar API
   */
  async getAsync(key: string): Promise<string | null> {
    // Try keyring first (if available)
    if (this.keytar) {
      try {
        // Try async API (VS Code keytar)
        if (this.keytar.getPassword) {
          const value = await this.keytar.getPassword(this.serviceUrl, key);
          if (value) return value;
        }
        // Try sync API (CLI keytar)
        else if (this.keytar.getPasswordSync) {
          const value = this.keytar.getPasswordSync(this.serviceUrl, key);
          if (value) return value;
        }
      } catch (e) {
        // Fall through to other methods
      }
    }

    // Try environment variables
    const envValue = process.env[key];
    if (envValue) return envValue;

    // Fall back to memory storage
    return this.memoryStorage.get(key) || null;
  }

  /**
   * Delete token from keyring or memory storage (sync version)
   */
  delete(key: string): void {
    if (this.keytar && this.keytar.deletePasswordSync) {
      try {
        this.keytar.deletePasswordSync(this.serviceUrl, key);
      } catch (e) {
        // Fall through to memory deletion
      }
    }
    this.memoryStorage.delete(key);
  }

  /**
   * Async version of delete - supports VS Code's async keytar API
   */
  async deleteAsync(key: string): Promise<void> {
    if (this.keytar) {
      try {
        // Try async API (VS Code keytar)
        if (this.keytar.deletePassword) {
          await this.keytar.deletePassword(this.serviceUrl, key);
        }
        // Try sync API (CLI keytar)
        else if (this.keytar.deletePasswordSync) {
          this.keytar.deletePasswordSync(this.serviceUrl, key);
        }
      } catch (e) {
        // Fall through to memory deletion
      }
    }
    this.memoryStorage.delete(key);
  }

  /**
   * Check if Node.js environment
   */
  isAvailable(): boolean {
    return typeof process !== 'undefined' && !!process.env;
  }

  /**
   * Get stored authentication token (sync version)
   * Checks environment variables and memory, but not async keytar
   */
  getToken(): string | null {
    // Check DATALAYER_API_KEY first
    const apiKey = process.env['DATALAYER_API_KEY'];
    if (apiKey) return apiKey;

    // Use "access_token" key (sync only - won't find tokens stored via async keytar)
    return this.get('access_token');
  }

  /**
   * Get stored authentication token (async version)
   * Properly checks async keytar API (VS Code), then env vars, then memory
   */
  async getTokenAsync(): Promise<string | null> {
    // Check DATALAYER_API_KEY first
    const apiKey = process.env['DATALAYER_API_KEY'];
    if (apiKey) return apiKey;

    // Use async method to check keyring (supports VS Code's async keytar)
    return await this.getAsync('access_token');
  }

  /**
   * Store authentication token (async version - use this in auth strategies)
   */
  async setToken(token: string): Promise<void> {
    // Use async method to support VS Code's keytar
    await this.setAsync('access_token', token);
  }

  /**
   * Delete authentication token (async version - use this in auth manager)
   */
  async deleteToken(): Promise<void> {
    // Use async method to support VS Code's keytar
    await this.deleteAsync('access_token');
  }

  /**
   * Clear all authentication data (async version - use this in auth manager)
   */
  async clear(): Promise<void> {
    await this.deleteToken();
    this.memoryStorage.clear();
  }
}

/**
 * Electron safeStorage-based token storage
 * Falls back to BrowserStorage if Electron safeStorage is not available
 */
export class ElectronStorage implements TokenStorage {
  private browserStorage = new BrowserStorage();

  /**
   * Get token from Electron safeStorage or fall back to localStorage
   */
  get(key: string): string | null {
    // TODO: Implement Electron safeStorage when running in Electron
    // For now, fall back to browser storage
    return this.browserStorage.get(key);
  }

  /**
   * Set token in Electron safeStorage or fall back to localStorage
   */
  set(key: string, value: string): void {
    // TODO: Implement Electron safeStorage when running in Electron
    // For now, fall back to browser storage
    this.browserStorage.set(key, value);
  }

  /**
   * Delete token from Electron safeStorage or localStorage
   */
  delete(key: string): void {
    // TODO: Implement Electron safeStorage when running in Electron
    // For now, fall back to browser storage
    this.browserStorage.delete(key);
  }

  /**
   * Check if Electron safeStorage or browser storage is available
   */
  isAvailable(): boolean {
    // TODO: Check for Electron safeStorage API
    // For now, check browser storage
    return this.browserStorage.isAvailable();
  }

  /**
   * Get stored authentication token
   */
  getToken(): string | null {
    return this.get(DATALAYER_IAM_TOKEN_KEY);
  }

  /**
   * Store authentication token
   */
  setToken(token: string): void {
    this.set(DATALAYER_IAM_TOKEN_KEY, token);
  }

  /**
   * Delete authentication token
   */
  deleteToken(): void {
    this.delete(DATALAYER_IAM_TOKEN_KEY);
  }

  /**
   * Clear all authentication data
   */
  clear(): void {
    this.browserStorage.clear();
  }
}

/**
 * Get the appropriate storage backend for the current environment
 */
export function getDefaultStorage(): TokenStorage {
  if (typeof window !== 'undefined') {
    // Browser environment
    return new BrowserStorage();
  } else if (typeof process !== 'undefined') {
    // Node.js environment
    return new NodeStorage();
  } else {
    // Unknown environment, use in-memory storage
    console.warn(
      'Unknown environment, using in-memory storage (data will not persist)',
    );
    return new NodeStorage(); // NodeStorage has in-memory fallback
  }
}
