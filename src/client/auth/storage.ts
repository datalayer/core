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
 * Resolve a real Node `require` function that survives bundling.
 *
 * `module.createRequire()` is the documented Node API for obtaining a
 * require function that resolves modules against `node_modules`. Three
 * runtimes need to be supported:
 *
 *   1. **Native Node ESM** (this package is `"type": "module"`). The
 *      global `require` is undefined here, so we resolve `module` via
 *      `process.getBuiltinModule('module')` (added in Node 22.3 / 20.16).
 *   2. **Native Node CommonJS** and **bundler-injected CJS shims**
 *      (e.g. webpack with `target: 'node'`). These expose a working
 *      global `require`, and `require('module')` resolves to the real
 *      Node builtin even after bundling.
 *   3. **Native browser**. None of the above is available; we return
 *      `null`.
 *
 * @returns A real Node `require`, or `null` outside Node, or
 *   `undefined` if Node is detected but no `createRequire` source is
 *   reachable (extremely old Node, or a hostile sandbox).
 */
function resolveNodeRequire(): ((id: string) => unknown) | null | undefined {
  if (typeof process === 'undefined' || !process.versions?.node) {
    return null;
  }

  type NodeModuleApi = {
    createRequire?: (filename: string) => (id: string) => unknown;
  };

  const fname =
    typeof __filename !== 'undefined'
      ? __filename
      : process.cwd() + '/__datalayer_keytar_loader__.js';

  // 1. ESM-safe path: process.getBuiltinModule (Node 22.3+ / 20.16+).
  //    Lets a `"type": "module"` package reach into `module` without a
  //    CommonJS-only `require`.
  const nodeProcess = process as typeof process & {
    getBuiltinModule?: (id: string) => NodeModuleApi | undefined;
  };
  try {
    const mod = nodeProcess.getBuiltinModule?.('module');
    if (typeof mod?.createRequire === 'function') {
      return mod.createRequire(fname);
    }
  } catch {
    // Fall through to the CommonJS / bundler path.
  }

  // 2. CommonJS path: `require('module')` is left intact by webpack
  //    when target: 'node'. Also covers older Node CJS where
  //    getBuiltinModule does not exist.
  try {
    if (typeof require === 'function') {
      const mod = require('module') as NodeModuleApi;
      if (typeof mod?.createRequire === 'function') {
        return mod.createRequire(fname);
      }
    }
  } catch {
    // Fall through to globalThis.require.
  }

  // 3. Last-ditch: a globalThis.require shim from some host environments.
  const g = globalThis as { require?: (id: string) => unknown };
  if (typeof g.require === 'function') {
    return g.require;
  }
  return undefined;
}

/**
 * Browser localStorage-based token storage
 */
export class BrowserStorage implements TokenStorage {
  private _available: boolean | undefined;

  /**
   * Get token from browser localStorage
   */
  get(key: string): string | null {
    if (!this.isAvailable()) {
      return null;
    }
    return window.localStorage.getItem(key);
  }

  /**
   * Set token in browser localStorage
   */
  set(key: string, value: string): void {
    if (!this.isAvailable()) {
      return;
    }
    window.localStorage.setItem(key, value);
  }

  /**
   * Delete token from browser localStorage
   */
  delete(key: string): void {
    if (!this.isAvailable()) {
      return;
    }
    window.localStorage.removeItem(key);
  }

  /**
   * Check if browser localStorage is available and functional.
   * Result is cached after the first probe to avoid repeated writes.
   */
  isAvailable(): boolean {
    if (this._available !== undefined) {
      return this._available;
    }
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        this._available = false;
        return false;
      }
      const testKey = '__datalayer_storage_test__';
      window.localStorage.setItem(testKey, 'test');
      window.localStorage.removeItem(testKey);
      this._available = true;
      return true;
    } catch {
      this._available = false;
      return false;
    }
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
    // Only load keytar in Node.js environment, never in browser
    if (
      typeof window === 'undefined' &&
      typeof process !== 'undefined' &&
      process.versions?.node
    ) {
      try {
        // Resolve a real Node `require` even when this module ends up
        // inside a webpack bundle.
        //
        // Why not the previous `string-evaluated require` pattern? Webpack
        // rewrites that pattern to its own loader (`__webpack_require__`),
        // which has no entry for these runtime-only keyring modules
        // (`@github/keytar`, `@vscode/keytar`, or legacy `keytar`)
        // because the require call is hidden behind a string and is
        // therefore invisible to webpack's static analysis — even when
        // consumers declare those package IDs as commonjs/runtime
        // externals. The result was that `this.keytar` silently stayed
        // `null` in any webpacked host (e.g. the VS Code extension), so
        // tokens written via `setAsync()` only landed in the in-memory
        // `Map` and never made it to the OS keyring. They appeared to
        // "save" within a session, but vanished on reload.
        //
        // `module.createRequire(...)` is the documented Node API for
        // obtaining the real require, and webpack/Vite/Rollup all leave
        // it intact when the host targets Node.
        const nodeRequire = resolveNodeRequire();
        if (nodeRequire) {
          // Try variants in order of preference:
          //   1. @github/keytar — actively maintained, ships prebuilt
          //      binaries for every platform in the npm tarball, so a
          //      single multi-platform VSIX / Electron build can ship
          //      it without per-OS rebuilds.
          //   2. @vscode/keytar — historically bundled with VS Code,
          //      no longer published to npm but still resolvable in
          //      some host environments.
          //   3. keytar — the original, deprecated upstream. Kept as a
          //      fallback so existing CLI installs that still depend
          //      on it keep working.
          for (const id of ['@github/keytar', '@vscode/keytar', 'keytar']) {
            try {
              this.keytar = nodeRequire(id);
              break;
            } catch {
              // Try next variant.
            }
          }
        }
      } catch {
        // Keyring not available, tokens will not persist across sessions
        console.warn('keytar not available, tokens will not persist');
      }
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
    const browserStorage = new BrowserStorage();
    if (browserStorage.isAvailable()) {
      return browserStorage;
    }
    // window exists but localStorage is not functional (e.g., Node 22 with --localstorage-file)
    // Fall through to Node.js storage
  }
  if (typeof process !== 'undefined') {
    // Node.js environment
    return new NodeStorage();
  }
  // Unknown environment, use in-memory storage
  console.warn(
    'Unknown environment, using in-memory storage (data will not persist)',
  );
  return new NodeStorage(); // NodeStorage has in-memory fallback
}
