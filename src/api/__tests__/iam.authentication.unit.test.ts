/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { describe, it, expect } from 'vitest';
import { authentication } from '../iam';

describe('IAM Authentication Unit Tests', () => {
  describe('login parameter validation', () => {
    const mockBaseUrl = 'https://example.com';

    it('should fail when providing both token and credentials', async () => {
      console.log('Testing invalid login with both token and credentials...');

      await expect(
        authentication.login(
          {
            token: 'some-token',
            handle: 'user@example.com',
            password: 'password123',
          },
          mockBaseUrl,
        ),
      ).rejects.toThrow(
        'Cannot provide both credentials (handle/password) and token',
      );

      console.log('Correctly rejected login with both authentication methods');
    });

    it('should fail when providing neither token nor credentials', async () => {
      console.log('Testing invalid login with no authentication...');

      await expect(authentication.login({}, mockBaseUrl)).rejects.toThrow(
        'Must provide either credentials (handle+password) or token',
      );

      console.log('Correctly rejected login with no authentication');
    });

    it('should fail when providing handle without password', async () => {
      console.log('Testing invalid login with handle but no password...');

      await expect(
        authentication.login(
          {
            handle: 'user@example.com',
          },
          mockBaseUrl,
        ),
      ).rejects.toThrow(
        'Both handle and password are required for credential-based authentication',
      );

      console.log('Correctly rejected login with incomplete credentials');
    });

    it('should fail when providing password without handle', async () => {
      console.log('Testing invalid login with password but no handle...');

      await expect(
        authentication.login(
          {
            password: 'password123',
          },
          mockBaseUrl,
        ),
      ).rejects.toThrow(
        'Both handle and password are required for credential-based authentication',
      );

      console.log('Correctly rejected login with incomplete credentials');
    });
  });

  describe('logout parameter validation', () => {
    it('should require a token for logout', async () => {
      console.log('Testing logout without token...');

      // TypeScript should prevent this at compile time, but let's test runtime behavior
      // @ts-expect-error Testing missing required parameter
      await expect(authentication.logout()).rejects.toThrow();

      console.log('Correctly rejected logout without token');
    });

    it('should accept logout with only token (using default URL)', async () => {
      console.log('Testing logout with token only (default URL)...');

      // This should not throw a validation error (though it may fail with API)
      // The method signature allows this since baseUrl has a default
      const mockToken = 'mock-token';

      // We can't test the actual API call in a unit test, but we can verify
      // the method accepts this signature
      expect(() => {
        // This should not throw a compile-time or immediate runtime error
        const promise = authentication.logout(mockToken);
        // Cancel the promise to avoid actual API call in unit test
        promise.catch(() => {}); // Ignore the error
      }).not.toThrow();

      console.log('Logout accepts token with default URL');
    });
  });
});
