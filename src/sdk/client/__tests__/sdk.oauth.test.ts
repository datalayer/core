/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DatalayerSDK } from '../index';
import type { OAuthConfig } from '../mixins/IAMMixin';

/**
 * OAuth Flow Integration Tests
 *
 * These tests verify the OAuth authentication flows for GitHub and LinkedIn,
 * which are the only two providers supported by the Datalayer SAAS platform.
 */

describe('OAuth Authentication Flows', () => {
  let sdk: DatalayerSDK;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Mock fetch for API calls
    mockFetch = vi.fn();
    global.fetch = mockFetch;

    // Mock localStorage
    const mockStorage = new Map<string, string>();
    global.localStorage = {
      getItem: (key: string) => mockStorage.get(key) || null,
      setItem: (key: string, value: string) => mockStorage.set(key, value),
      removeItem: (key: string) => mockStorage.delete(key),
      clear: () => mockStorage.clear(),
      length: mockStorage.size,
      key: (index: number) => Array.from(mockStorage.keys())[index] || null,
    } as Storage;

    sdk = new DatalayerSDK({
      iamRunUrl: 'https://api.example.com/iam',
      runtimesRunUrl: 'https://api.example.com/runtimes',
      spacerRunUrl: 'https://api.example.com/spacer',
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('GitHub OAuth', () => {
    const githubConfig: OAuthConfig = {
      provider: 'github',
      redirectUri: 'http://localhost:3000/auth/callback',
      scope: 'user:email',
      state: 'random-state-123',
    };

    it('should generate correct GitHub OAuth URL', () => {
      const url = sdk.getOAuthUrl(githubConfig);

      expect(url).toContain('https://api.example.com/iam/auth/github');
      expect(url).toContain(
        'redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fauth%2Fcallback',
      );
      expect(url).toContain('scope=user%3Aemail');
      expect(url).toContain('state=random-state-123');
    });

    it('should exchange GitHub OAuth code for token', async () => {
      const code = 'github-auth-code-456';
      const expectedToken = 'github-access-token-789';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          token: expectedToken,
          refresh_token: null,
        }),
      });

      const result = await sdk.exchangeOAuthCode(
        'github',
        code,
        githubConfig.redirectUri!,
      );

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/iam/auth/github/callback',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify({
            code,
            redirect_uri: githubConfig.redirectUri,
          }),
        }),
      );

      expect(result.token).toBe(expectedToken);
    });

    it('should link GitHub provider to user account', async () => {
      await sdk.updateToken('user-token-123');

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      await sdk.linkProvider('github');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/iam/auth/github/link',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer user-token-123',
          }),
        }),
      );
    });

    it('should unlink GitHub provider from user account', async () => {
      await sdk.updateToken('user-token-123');

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      await sdk.unlinkProvider('github');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/iam/auth/github/unlink',
        expect.objectContaining({
          method: 'DELETE',
          headers: expect.objectContaining({
            Authorization: 'Bearer user-token-123',
          }),
        }),
      );
    });
  });

  describe('LinkedIn OAuth', () => {
    const linkedinConfig: OAuthConfig = {
      provider: 'linkedin',
      redirectUri: 'http://localhost:3000/auth/callback',
      scope: 'openid profile email',
      state: 'linkedin-state-456',
    };

    it('should generate correct LinkedIn OAuth URL', () => {
      const url = sdk.getOAuthUrl(linkedinConfig);

      expect(url).toContain('https://api.example.com/iam/auth/linkedin');
      expect(url).toContain(
        'redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fauth%2Fcallback',
      );
      expect(url).toContain('scope=openid+profile+email');
      expect(url).toContain('state=linkedin-state-456');
    });

    it('should exchange LinkedIn OAuth code for token', async () => {
      const code = 'linkedin-auth-code-789';
      const expectedToken = 'linkedin-access-token-321';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          token: expectedToken,
          refresh_token: null,
        }),
      });

      const result = await sdk.exchangeOAuthCode(
        'linkedin',
        code,
        linkedinConfig.redirectUri!,
      );

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/iam/auth/linkedin/callback',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify({
            code,
            redirect_uri: linkedinConfig.redirectUri,
          }),
        }),
      );

      expect(result.token).toBe(expectedToken);
    });

    it('should link LinkedIn provider to user account', async () => {
      await sdk.updateToken('user-token-456');

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      await sdk.linkProvider('linkedin');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/iam/auth/linkedin/link',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer user-token-456',
          }),
        }),
      );
    });
  });

  describe('OAuth Error Scenarios', () => {
    it('should handle network errors during OAuth flow', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(
        sdk.exchangeOAuthCode('github', 'code', 'http://localhost:3000'),
      ).rejects.toThrow('Network error');
    });

    it('should handle expired OAuth codes', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => ({
          error: 'invalid_grant',
          error_description: 'Code expired',
        }),
      });

      await expect(
        sdk.exchangeOAuthCode(
          'github',
          'expired-code',
          'http://localhost:3000',
        ),
      ).rejects.toThrow();
    });

    it('should require authentication for link/unlink operations', async () => {
      // No token set
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => ({ error: 'Unauthorized' }),
      });

      await expect(sdk.linkProvider('github')).rejects.toThrow();
    });
  });

  describe('OAuth Flow Integration', () => {
    it('should complete full GitHub OAuth flow', async () => {
      // Step 1: Get OAuth URL
      const authUrl = sdk.getOAuthUrl({
        provider: 'github',
        redirectUri: 'http://localhost:3000/auth/callback',
      });

      expect(authUrl).toContain('github');

      // Step 2: Exchange code for token
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          token: 'datalayer-token-123',
          refresh_token: null,
        }),
      });

      const tokenResponse = await sdk.exchangeOAuthCode(
        'github',
        'auth-code-from-callback',
        'http://localhost:3000/auth/callback',
      );

      expect(tokenResponse.token).toBe('datalayer-token-123');

      // Step 3: Use token to authenticate
      await sdk.updateToken(tokenResponse.token);
      expect(sdk.getToken()).toBe('datalayer-token-123');
    });

    it('should complete full LinkedIn OAuth flow', async () => {
      // Step 1: Get OAuth URL
      const authUrl = sdk.getOAuthUrl({
        provider: 'linkedin',
        redirectUri: 'http://localhost:3000/auth/callback',
        scope: 'openid profile email',
      });

      expect(authUrl).toContain('linkedin');

      // Step 2: Exchange code for token
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          token: 'linkedin-token-456',
          refresh_token: null,
        }),
      });

      const tokenResponse = await sdk.exchangeOAuthCode(
        'linkedin',
        'linkedin-auth-code',
        'http://localhost:3000/auth/callback',
      );

      expect(tokenResponse.token).toBe('linkedin-token-456');

      // Step 3: Use token
      await sdk.updateToken(tokenResponse.token);
      expect(sdk.getToken()).toBe('linkedin-token-456');
    });
  });
});
