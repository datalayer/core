/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BrowserStorage, NodeStorage, getDefaultStorage } from '../storage';

describe('BrowserStorage', () => {
  let storage: BrowserStorage;

  beforeEach(() => {
    storage = new BrowserStorage();
    // Clear localStorage before each test
    if (typeof window !== 'undefined') {
      window.localStorage.clear();
    }
  });

  it('should check if storage is available', () => {
    const isAvailable = storage.isAvailable();
    expect(typeof isAvailable).toBe('boolean');
  });

  it('should store and retrieve token', () => {
    if (!storage.isAvailable()) {
      return; // Skip in Node environment
    }

    storage.setToken('test-token');
    expect(storage.getToken()).toBe('test-token');
  });

  it('should delete token', () => {
    if (!storage.isAvailable()) {
      return;
    }

    storage.setToken('test-token');
    storage.deleteToken();
    expect(storage.getToken()).toBeNull();
  });

  it('should clear all data', () => {
    if (!storage.isAvailable()) {
      return;
    }

    storage.setToken('test-token');
    storage.clear();
    expect(storage.getToken()).toBeNull();
  });
});

describe('NodeStorage', () => {
  let storage: NodeStorage;

  beforeEach(() => {
    storage = new NodeStorage();
  });

  it('should always be available in Node environment', () => {
    expect(storage.isAvailable()).toBe(true);
  });

  it('should store and retrieve token from memory', async () => {
    storage.setToken('test-token');
    // Wait for async storage operations
    await new Promise(resolve => setTimeout(resolve, 100));
    expect(storage.getToken()).toBe('test-token');
  });

  it('should delete token from memory', () => {
    storage.setToken('test-token');
    storage.deleteToken();
    expect(storage.getToken()).toBeNull();
  });

  it('should clear all memory storage', async () => {
    storage.setToken('test-token');
    storage.set('other-key', 'other-value');
    await storage.clear();
    expect(storage.getToken()).toBeNull();
    expect(storage.get('other-key')).toBeNull();
  });

  it('should read from environment variables', () => {
    // Set an env var
    process.env.TEST_KEY = 'env-value';
    expect(storage.get('TEST_KEY')).toBe('env-value');
    delete process.env.TEST_KEY;
  });
});

describe('getDefaultStorage', () => {
  it('should return appropriate storage for environment', () => {
    const storage = getDefaultStorage();
    expect(storage).toBeDefined();
    expect(storage.isAvailable()).toBe(true);
  });
});
