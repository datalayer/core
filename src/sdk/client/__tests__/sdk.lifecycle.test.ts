/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DatalayerSDK } from '../index';
import { BrowserStorage } from '../storage';

/**
 * SDK Lifecycle Integration Tests
 *
 * These tests verify the SDK initialization, configuration updates,
 * and lifecycle management across different platforms.
 */

describe('SDK Lifecycle', () => {
  beforeEach(() => {
    // Mock localStorage for browser environment
    const mockStorage = new Map<string, string>();
    global.localStorage = {
      getItem: (key: string) => mockStorage.get(key) || null,
      setItem: (key: string, value: string) => mockStorage.set(key, value),
      removeItem: (key: string) => mockStorage.delete(key),
      clear: () => mockStorage.clear(),
      length: mockStorage.size,
      key: (index: number) => Array.from(mockStorage.keys())[index] || null,
    } as Storage;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('SDK Initialization', () => {
    it('should initialize with minimal configuration', () => {
      const sdk = new DatalayerSDK({
        iamRunUrl: 'https://api.example.com/iam',
        runtimesRunUrl: 'https://api.example.com/runtimes',
        spacerRunUrl: 'https://api.example.com/spacer',
      });

      expect(sdk.getIamRunUrl()).toBe('https://api.example.com/iam');
      expect(sdk.getRuntimesRunUrl()).toBe('https://api.example.com/runtimes');
      expect(sdk.getSpacerRunUrl()).toBe('https://api.example.com/spacer');
      expect(sdk.getToken()).toBeUndefined();
    });

    it('should initialize with token', () => {
      const sdk = new DatalayerSDK({
        iamRunUrl: 'https://api.example.com/iam',
        runtimesRunUrl: 'https://api.example.com/runtimes',
        spacerRunUrl: 'https://api.example.com/spacer',
        token: 'test-token-123',
      });

      expect(sdk.getToken()).toBe('test-token-123');
    });

    it('should initialize with custom storage', () => {
      const customStorage = new BrowserStorage({ prefix: 'custom-app' });
      const sdk = new DatalayerSDK({
        iamRunUrl: 'https://api.example.com/iam',
        runtimesRunUrl: 'https://api.example.com/runtimes',
        spacerRunUrl: 'https://api.example.com/spacer',
        storage: customStorage,
      });

      expect(sdk.getStorage()).toBe(customStorage);
    });

    it('should initialize with cache and offline options', () => {
      const sdk = new DatalayerSDK({
        iamRunUrl: 'https://api.example.com/iam',
        runtimesRunUrl: 'https://api.example.com/runtimes',
        spacerRunUrl: 'https://api.example.com/spacer',
        cacheEnabled: false,
        offlineMode: true,
      });

      expect(sdk.cacheEnabled).toBe(false);
      expect(sdk.offlineMode).toBe(true);
    });

    it('should use default storage (BrowserStorage) when not specified', () => {
      const sdk = new DatalayerSDK({
        iamRunUrl: 'https://api.example.com/iam',
        runtimesRunUrl: 'https://api.example.com/runtimes',
        spacerRunUrl: 'https://api.example.com/spacer',
      });

      expect(sdk.getStorage()).toBeInstanceOf(BrowserStorage);
    });
  });

  describe('State Initialization', () => {
    it('should initialize state managers', async () => {
      const sdk = new DatalayerSDK({
        iamRunUrl: 'https://api.example.com/iam',
        runtimesRunUrl: 'https://api.example.com/runtimes',
        spacerRunUrl: 'https://api.example.com/spacer',
      });

      // Wait for async initialization
      await sdk.initializeState();

      expect(sdk.getIAMState()).toBeDefined();
      expect(sdk.getRuntimesState()).toBeDefined();
      expect(sdk.getSpacerState()).toBeDefined();
    });

    it('should store service URLs in state', async () => {
      const sdk = new DatalayerSDK({
        iamRunUrl: 'https://api.example.com/iam',
        runtimesRunUrl: 'https://api.example.com/runtimes',
        spacerRunUrl: 'https://api.example.com/spacer',
      });

      await sdk.initializeState();

      const iamState = sdk.getIAMState();
      const runtimesState = sdk.getRuntimesState();
      const spacerState = sdk.getSpacerState();

      expect(await iamState.getIamUrl()).toBe('https://api.example.com/iam');
      expect(await runtimesState.getRuntimesUrl()).toBe(
        'https://api.example.com/runtimes',
      );
      expect(await spacerState.getSpacerUrl()).toBe(
        'https://api.example.com/spacer',
      );
    });

    it('should persist token during initialization', async () => {
      const sdk = new DatalayerSDK({
        iamRunUrl: 'https://api.example.com/iam',
        runtimesRunUrl: 'https://api.example.com/runtimes',
        spacerRunUrl: 'https://api.example.com/spacer',
        token: 'initial-token',
      });

      await sdk.initializeState();

      const iamState = sdk.getIAMState();
      expect(await iamState.getToken()).toBe('initial-token');
    });

    it('should load existing token from storage', async () => {
      const storage = new BrowserStorage();
      const iamState = new (await import('../state/IAMState')).IAMState(
        storage,
      );

      // Pre-store a token
      await iamState.setToken('existing-token');

      // Create SDK with same storage
      const sdk = new DatalayerSDK({
        iamRunUrl: 'https://api.example.com/iam',
        runtimesRunUrl: 'https://api.example.com/runtimes',
        spacerRunUrl: 'https://api.example.com/spacer',
        storage,
      });

      await sdk.initializeState();

      expect(sdk.getToken()).toBe('existing-token');
    });
  });

  describe('Token Management', () => {
    it('should update token and persist to storage', async () => {
      const sdk = new DatalayerSDK({
        iamRunUrl: 'https://api.example.com/iam',
        runtimesRunUrl: 'https://api.example.com/runtimes',
        spacerRunUrl: 'https://api.example.com/spacer',
      });

      await sdk.initializeState();
      await sdk.updateToken('new-token-456');

      expect(sdk.getToken()).toBe('new-token-456');

      // Verify persisted to storage
      const iamState = sdk.getIAMState();
      expect(await iamState.getToken()).toBe('new-token-456');
    });

    it('should update configuration with token', async () => {
      const sdk = new DatalayerSDK({
        iamRunUrl: 'https://api.example.com/iam',
        runtimesRunUrl: 'https://api.example.com/runtimes',
        spacerRunUrl: 'https://api.example.com/spacer',
      });

      await sdk.updateConfig({ token: 'config-token' });

      expect(sdk.getToken()).toBe('config-token');
    });

    it('should clear token on empty string', async () => {
      const sdk = new DatalayerSDK({
        iamRunUrl: 'https://api.example.com/iam',
        runtimesRunUrl: 'https://api.example.com/runtimes',
        spacerRunUrl: 'https://api.example.com/spacer',
        token: 'initial-token',
      });

      await sdk.updateToken('');

      expect(sdk.getToken()).toBe('');
    });
  });

  describe('Cache Management', () => {
    it('should clear all caches', async () => {
      const sdk = new DatalayerSDK({
        iamRunUrl: 'https://api.example.com/iam',
        runtimesRunUrl: 'https://api.example.com/runtimes',
        spacerRunUrl: 'https://api.example.com/spacer',
        token: 'test-token',
      });

      await sdk.initializeState();

      // Store some data
      const iamState = sdk.getIAMState();
      await iamState.setUser({
        uid: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
      } as any);

      // Clear all caches
      await sdk.clearCache();

      // Verify cleared
      expect(await iamState.getUser()).toBeNull();
    });
  });

  describe('Cross-Platform Support', () => {
    it.each([
      ['Browser', () => new BrowserStorage()],
      // Note: NodeStorage and ElectronStorage require more setup
    ])('should work with %s storage', async (_name, createStorage) => {
      const storage = createStorage();
      const sdk = new DatalayerSDK({
        iamRunUrl: 'https://api.example.com/iam',
        runtimesRunUrl: 'https://api.example.com/runtimes',
        spacerRunUrl: 'https://api.example.com/spacer',
        storage,
      });

      await sdk.initializeState();
      await sdk.updateToken('platform-token');

      expect(sdk.getToken()).toBe('platform-token');
    });
  });

  describe('Configuration', () => {
    it('should return current configuration', () => {
      const sdk = new DatalayerSDK({
        iamRunUrl: 'https://api.example.com/iam',
        runtimesRunUrl: 'https://api.example.com/runtimes',
        spacerRunUrl: 'https://api.example.com/spacer',
        token: 'test-token',
      });

      const config = sdk.getConfig();

      expect(config).toEqual({
        iamRunUrl: 'https://api.example.com/iam',
        runtimesRunUrl: 'https://api.example.com/runtimes',
        spacerRunUrl: 'https://api.example.com/spacer',
        token: 'test-token',
      });
    });

    it('should not allow changing service URLs after initialization', async () => {
      const sdk = new DatalayerSDK({
        iamRunUrl: 'https://api.example.com/iam',
        runtimesRunUrl: 'https://api.example.com/runtimes',
        spacerRunUrl: 'https://api.example.com/spacer',
      });

      await sdk.updateConfig({
        token: 'new-token',
        // These should be ignored
        iamRunUrl: 'https://different.com/iam',
        runtimesRunUrl: 'https://different.com/runtimes',
        spacerRunUrl: 'https://different.com/spacer',
      } as any);

      expect(sdk.getIamRunUrl()).toBe('https://api.example.com/iam');
      expect(sdk.getRuntimesRunUrl()).toBe('https://api.example.com/runtimes');
      expect(sdk.getSpacerRunUrl()).toBe('https://api.example.com/spacer');
      expect(sdk.getToken()).toBe('new-token'); // Token should update
    });
  });

  describe('Mixin Integration', () => {
    it('should have all mixin methods available', () => {
      const sdk = new DatalayerSDK({
        iamRunUrl: 'https://api.example.com/iam',
        runtimesRunUrl: 'https://api.example.com/runtimes',
        spacerRunUrl: 'https://api.example.com/spacer',
      });

      // IAM methods
      expect(typeof sdk.whoami).toBe('function');
      expect(typeof sdk.login).toBe('function');
      expect(typeof sdk.logout).toBe('function');
      expect(typeof sdk.getGitHubUser).toBe('function');
      expect(typeof sdk.getOAuthUrl).toBe('function');
      expect(typeof sdk.exchangeOAuthCode).toBe('function');
      expect(typeof sdk.linkProvider).toBe('function');
      expect(typeof sdk.unlinkProvider).toBe('function');

      // Spacer methods
      expect(typeof sdk.getMySpaces).toBe('function');
      expect(typeof sdk.createSpace).toBe('function');
      expect(typeof sdk.createNotebook).toBe('function');
      expect(typeof sdk.getNotebook).toBe('function');
      expect(typeof sdk.updateNotebook).toBe('function');
      expect(typeof sdk.createLexical).toBe('function');
      expect(typeof sdk.getLexical).toBe('function');
      expect(typeof sdk.updateLexical).toBe('function');
      expect(typeof sdk.getSpaceItems).toBe('function');
      expect(typeof sdk.deleteSpaceItem).toBe('function');

      // Runtime methods (if implemented)
      // expect(typeof sdk.listRuntimes).toBe('function');
      // expect(typeof sdk.createRuntime).toBe('function');
    });
  });

  describe('SDK Instance Lifecycle', () => {
    it('should maintain separate state for different instances', async () => {
      const storage1 = new BrowserStorage({ prefix: 'app1' });
      const storage2 = new BrowserStorage({ prefix: 'app2' });

      const sdk1 = new DatalayerSDK({
        iamRunUrl: 'https://api1.example.com/iam',
        runtimesRunUrl: 'https://api1.example.com/runtimes',
        spacerRunUrl: 'https://api1.example.com/spacer',
        token: 'token1',
        storage: storage1,
      });

      const sdk2 = new DatalayerSDK({
        iamRunUrl: 'https://api2.example.com/iam',
        runtimesRunUrl: 'https://api2.example.com/runtimes',
        spacerRunUrl: 'https://api2.example.com/spacer',
        token: 'token2',
        storage: storage2,
      });

      await sdk1.initializeState();
      await sdk2.initializeState();

      expect(sdk1.getToken()).toBe('token1');
      expect(sdk2.getToken()).toBe('token2');

      // Update one shouldn't affect the other
      await sdk1.updateToken('new-token1');

      expect(sdk1.getToken()).toBe('new-token1');
      expect(sdk2.getToken()).toBe('token2'); // Unchanged
    });

    it('should share state with same storage', async () => {
      const sharedStorage = new BrowserStorage();

      const sdk1 = new DatalayerSDK({
        iamRunUrl: 'https://api.example.com/iam',
        runtimesRunUrl: 'https://api.example.com/runtimes',
        spacerRunUrl: 'https://api.example.com/spacer',
        storage: sharedStorage,
      });

      await sdk1.initializeState();
      await sdk1.updateToken('shared-token');

      // Second SDK with same storage
      const sdk2 = new DatalayerSDK({
        iamRunUrl: 'https://api.example.com/iam',
        runtimesRunUrl: 'https://api.example.com/runtimes',
        spacerRunUrl: 'https://api.example.com/spacer',
        storage: sharedStorage,
      });

      await sdk2.initializeState();

      // Should load token from shared storage
      expect(sdk2.getToken()).toBe('shared-token');
    });
  });
});
