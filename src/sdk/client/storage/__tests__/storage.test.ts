/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  BrowserStorage,
  createStorageKey,
  parseStoredData,
  stringifyForStorage,
} from '../index';
import type { PlatformStorage } from '../PlatformStorage';

/**
 * Storage Contract Tests
 *
 * These tests ensure all storage implementations behave identically
 * and correctly implement the PlatformStorage interface.
 */

// Mock localStorage for browser tests
const localStorageMock = {
  data: new Map<string, string>(),
  getItem: vi.fn((key: string) => {
    const value = localStorageMock.data.get(key);
    return value !== undefined ? value : null;
  }),
  setItem: vi.fn((key: string, value: string) =>
    localStorageMock.data.set(key, value),
  ),
  removeItem: vi.fn((key: string) => localStorageMock.data.delete(key)),
  clear: vi.fn(() => localStorageMock.data.clear()),
  get length() {
    return localStorageMock.data.size;
  },
  key: vi.fn(
    (index: number) => Array.from(localStorageMock.data.keys())[index] || null,
  ),
};

// Replace global localStorage
Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

describe('Storage Implementations', () => {
  // Test each storage implementation
  describe.each([
    ['BrowserStorage', () => new BrowserStorage()],
    // Note: NodeStorage and ElectronStorage would need more complex mocking
    // For now, we'll focus on BrowserStorage as the reference implementation
  ])('%s', (name, createStorage) => {
    let storage: PlatformStorage;

    beforeEach(() => {
      localStorageMock.data.clear();
      vi.clearAllMocks();
      storage = createStorage();
    });

    describe('Basic Operations', () => {
      it('should store and retrieve string values', async () => {
        await storage.set('test-key', 'test-value');
        const value = await storage.get('test-key');
        expect(value).toBe('test-value');
      });

      it('should return null for non-existent keys', async () => {
        const value = await storage.get('non-existent');
        expect(value).toBeNull();
      });

      it('should remove values', async () => {
        await storage.set('test-key', 'test-value');
        await storage.remove('test-key');
        const value = await storage.get('test-key');
        expect(value).toBeNull();
      });

      it('should check key existence', async () => {
        await storage.set('test-key', 'test-value');
        expect(await storage.has('test-key')).toBe(true);
        expect(await storage.has('non-existent')).toBe(false);
      });

      it('should clear namespaced values only', async () => {
        await storage.set('keep-key', 'keep-value');
        // Set a non-namespaced key directly
        localStorageMock.setItem('other-app-key', 'other-value');

        await storage.clear();

        // Our key should be gone
        expect(await storage.get('keep-key')).toBeNull();
        // Other app's key should remain
        expect(localStorageMock.getItem('other-app-key')).toBe('other-value');
      });
    });

    describe('JSON Data Handling', () => {
      it('should store and retrieve JSON objects', async () => {
        const testObj = { name: 'test', value: 123, nested: { data: true } };
        await storage.set('json-key', stringifyForStorage(testObj));

        const retrieved = await storage.get('json-key');
        expect(retrieved).not.toBeNull();
        const parsed = parseStoredData<typeof testObj>(retrieved);
        expect(parsed).toEqual(testObj);
      });

      it('should handle arrays', async () => {
        const testArray = [1, 2, 3, { id: 'test' }];
        await storage.set('array-key', stringifyForStorage(testArray));

        const retrieved = await storage.get('array-key');
        const parsed = parseStoredData<typeof testArray>(retrieved);
        expect(parsed).toEqual(testArray);
      });

      it('should return null for invalid JSON', async () => {
        await storage.set('bad-json', 'not-json{');
        const retrieved = await storage.get('bad-json');
        const parsed = parseStoredData<any>(retrieved);
        expect(parsed).toBeNull();
      });
    });

    describe('Namespacing', () => {
      it('should use namespaced keys', async () => {
        await storage.set('my-key', 'my-value');

        // Check that the actual stored key is namespaced
        const keys = Array.from(localStorageMock.data.keys());
        expect(keys.some(k => k.includes('@datalayer/core'))).toBe(true);
        expect(keys.some(k => k.includes('my-key'))).toBe(true);
      });

      it('should not conflict with other namespaces', async () => {
        // Create two storage instances with different prefixes
        const storage1 = new BrowserStorage({ prefix: 'app1' });
        const storage2 = new BrowserStorage({ prefix: 'app2' });

        await storage1.set('same-key', 'value1');
        await storage2.set('same-key', 'value2');

        expect(await storage1.get('same-key')).toBe('value1');
        expect(await storage2.get('same-key')).toBe('value2');
      });
    });

    describe('Edge Cases', () => {
      it('should handle empty strings', async () => {
        await storage.set('empty', '');

        const result = await storage.get('empty');
        // Empty strings should be preserved
        expect(result).toBe('');
      });

      it('should handle very long values', async () => {
        const longValue = 'x'.repeat(10000);
        await storage.set('long', longValue);
        expect(await storage.get('long')).toBe(longValue);
      });

      it('should handle special characters in keys', async () => {
        const specialKey = 'key:with/special-chars_123';
        await storage.set(specialKey, 'value');
        expect(await storage.get(specialKey)).toBe('value');
      });

      it('should handle concurrent operations', async () => {
        const promises: Promise<void>[] = [];
        for (let i = 0; i < 10; i++) {
          promises.push(storage.set(`key-${i}`, `value-${i}`));
        }
        await Promise.all(promises);

        for (let i = 0; i < 10; i++) {
          expect(await storage.get(`key-${i}`)).toBe(`value-${i}`);
        }
      });
    });

    describe('Error Handling', () => {
      it('should handle storage quota exceeded gracefully', async () => {
        // Mock quota exceeded error
        const originalSetItem = localStorageMock.setItem;
        let callCount = 0;
        localStorageMock.setItem = vi.fn((key: string, value: string) => {
          callCount++;
          if (callCount === 1) {
            // Create error that looks like a real QuotaExceededError
            const error: any = new Error('QuotaExceededError');
            error.name = 'QuotaExceededError';
            error.constructor = DOMException;
            Object.setPrototypeOf(error, DOMException.prototype);
            throw error;
          }
          return originalSetItem(key, value);
        });

        // Should retry after clearing old cache
        await storage.set('test-key', 'test-value');
        expect(await storage.get('test-key')).toBe('test-value');

        // Restore original
        localStorageMock.setItem = originalSetItem;
      });

      it('should handle corrupted storage gracefully', async () => {
        // Directly set corrupted data
        const key = createStorageKey('corrupted');
        localStorageMock.setItem(key, undefined as any);

        // Should return null instead of throwing
        expect(await storage.get('corrupted')).toBeNull();
      });
    });
  });

  describe('Storage Helpers', () => {
    it('should create namespaced keys', () => {
      const key = createStorageKey('test');
      expect(key).toBe('@datalayer/core:test');
    });

    it('should stringify data for storage', () => {
      const data = { test: true, value: 123 };
      const stringified = stringifyForStorage(data);
      expect(typeof stringified).toBe('string');
      expect(JSON.parse(stringified)).toEqual(data);
    });

    it('should parse stored data', () => {
      const data = { test: true, value: 123 };
      const stringified = JSON.stringify(data);
      const parsed = parseStoredData<typeof data>(stringified);
      expect(parsed).toEqual(data);
    });

    it('should return null for invalid JSON when parsing', () => {
      expect(parseStoredData('not-json')).toBeNull();
      expect(parseStoredData(null)).toBeNull();
      expect(parseStoredData('')).toBeNull();
    });
  });

  describe('BrowserStorage Specific', () => {
    it('should fallback to sessionStorage if localStorage unavailable', () => {
      const originalLocalStorage = global.localStorage;

      // Mock localStorage to throw
      Object.defineProperty(global, 'localStorage', {
        get: () => {
          throw new Error('localStorage disabled');
        },
      });

      // Create new instance - should fallback to sessionStorage
      // Just creating the instance is enough to test the fallback
      new BrowserStorage();

      // Restore
      Object.defineProperty(global, 'localStorage', {
        value: originalLocalStorage,
      });
    });

    it('should support session storage option', async () => {
      const storage: PlatformStorage = new BrowserStorage({
        useSessionStorage: true,
      });
      await storage.set('session-key', 'session-value');

      // Value should not be in localStorage
      expect(
        localStorageMock.getItem(createStorageKey('session-key')),
      ).toBeNull();
    });
  });
});

describe('Cross-Storage Compatibility', () => {
  it('should maintain data format compatibility', async () => {
    const storage = new BrowserStorage();

    // Store data that would be used across platforms
    const userData = {
      uid: 'user-123',
      email: 'test@example.com',
      githubUsername: 'testuser',
    };

    await storage.set('user', stringifyForStorage(userData));

    // Verify the stored format is JSON
    const raw = localStorageMock.getItem(createStorageKey('user'));
    expect(raw).not.toBeNull();
    expect(() => JSON.parse(raw!)).not.toThrow();
    expect(JSON.parse(raw!)).toEqual(userData);
  });
});
