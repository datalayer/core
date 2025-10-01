/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { describe, it, expect } from 'vitest';
import { authentication } from '..';

describe('IAM Authentication', () => {
  const mockBaseUrl = 'https://example.com';

  describe('login validation', () => {
    it('should fail with both token and credentials', async () => {
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
    });

    it('should fail with neither token nor credentials', async () => {
      await expect(authentication.login({}, mockBaseUrl)).rejects.toThrow(
        'Must provide either credentials (handle+password) or token',
      );
    });

    it('should fail with handle but no password', async () => {
      await expect(
        authentication.login({ handle: 'user@example.com' }, mockBaseUrl),
      ).rejects.toThrow(
        'Both handle and password are required for credential-based authentication',
      );
    });

    it('should fail with password but no handle', async () => {
      await expect(
        authentication.login({ password: 'password123' }, mockBaseUrl),
      ).rejects.toThrow(
        'Both handle and password are required for credential-based authentication',
      );
    });
  });

  describe('logout validation', () => {
    it('should require token', async () => {
      // @ts-expect-error Testing missing required parameter
      await expect(authentication.logout()).rejects.toThrow();
    });
  });
});
