/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { oauth2 } from '..';
import * as DatalayerApi from '../../DatalayerApi';

// Mock the requestDatalayerAPI function
vi.mock('../../DatalayerApi', () => ({
  requestDatalayerAPI: vi.fn(),
}));

describe('IAM OAuth2 Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('OAuth2Provider type', () => {
    it('should only accept valid provider types', () => {
      const validProviders: oauth2.OAuth2Provider[] = [
        'github',
        'linkedin',
        'okta',
      ];

      // This test ensures at compile time that only valid providers are accepted
      expect(validProviders).toHaveLength(3);
      expect(validProviders).toContain('github');
      expect(validProviders).toContain('linkedin');
      expect(validProviders).toContain('okta');

      // TypeScript should prevent invalid providers like 'bluesky' at compile time
      // @ts-expect-error Testing invalid provider
      const invalidProvider: oauth2.OAuth2Provider = 'bluesky';
      expect(invalidProvider).toBe('bluesky'); // This line is just to use the variable
    });
  });

  describe('getOAuth2AuthzUrl', () => {
    const mockBaseUrl = 'https://example.com';
    const mockCallbackUri = 'https://app.example.com/callback';

    it('should generate authorization URL for GitHub', async () => {
      const mockResponse: oauth2.OAuth2AuthzUrlResponse = {
        success: true,
        message: 'Authorization URL generated',
        loginURL: 'https://github.com/login/oauth/authorize?client_id=...',
      };

      vi.mocked(DatalayerApi.requestDatalayerAPI).mockResolvedValueOnce(
        mockResponse,
      );

      const result = await oauth2.getOAuth2AuthzUrl(
        'github',
        mockCallbackUri,
        undefined,
        mockBaseUrl,
      );

      expect(result).toEqual(mockResponse);
      expect(DatalayerApi.requestDatalayerAPI).toHaveBeenCalledWith({
        url: `${mockBaseUrl}/api/iam/v1/oauth2/authz/url?provider=github&callback_uri=${encodeURIComponent(mockCallbackUri)}`,
        method: 'GET',
      });
    });

    it('should generate authorization URL for LinkedIn', async () => {
      const mockResponse: oauth2.OAuth2AuthzUrlResponse = {
        success: true,
        message: 'Authorization URL generated',
        loginURL: 'https://www.linkedin.com/oauth/v2/authorization?...',
      };

      vi.mocked(DatalayerApi.requestDatalayerAPI).mockResolvedValueOnce(
        mockResponse,
      );

      const result = await oauth2.getOAuth2AuthzUrl(
        'linkedin',
        mockCallbackUri,
        undefined,
        mockBaseUrl,
      );

      expect(result).toEqual(mockResponse);
      expect(DatalayerApi.requestDatalayerAPI).toHaveBeenCalledWith({
        url: `${mockBaseUrl}/api/iam/v1/oauth2/authz/url?provider=linkedin&callback_uri=${encodeURIComponent(mockCallbackUri)}`,
        method: 'GET',
      });
    });

    it('should generate authorization URL for Okta', async () => {
      const mockResponse: oauth2.OAuth2AuthzUrlResponse = {
        success: true,
        message: 'Authorization URL generated',
        loginURL: 'https://example.okta.com/oauth2/v1/authorize?...',
      };

      vi.mocked(DatalayerApi.requestDatalayerAPI).mockResolvedValueOnce(
        mockResponse,
      );

      const result = await oauth2.getOAuth2AuthzUrl(
        'okta',
        mockCallbackUri,
        undefined,
        mockBaseUrl,
      );

      expect(result).toEqual(mockResponse);
      expect(DatalayerApi.requestDatalayerAPI).toHaveBeenCalledWith({
        url: `${mockBaseUrl}/api/iam/v1/oauth2/authz/url?provider=okta&callback_uri=${encodeURIComponent(mockCallbackUri)}`,
        method: 'GET',
      });
    });

    it('should include nonce parameter when provided', async () => {
      const mockResponse: oauth2.OAuth2AuthzUrlResponse = {
        success: true,
        message: 'Authorization URL generated',
        loginURL: 'https://github.com/login/oauth/authorize?...',
      };
      const mockNonce = 'random-nonce-123';

      vi.mocked(DatalayerApi.requestDatalayerAPI).mockResolvedValueOnce(
        mockResponse,
      );

      await oauth2.getOAuth2AuthzUrl(
        'github',
        mockCallbackUri,
        mockNonce,
        mockBaseUrl,
      );

      expect(DatalayerApi.requestDatalayerAPI).toHaveBeenCalledWith({
        url: `${mockBaseUrl}/api/iam/v1/oauth2/authz/url?provider=github&callback_uri=${encodeURIComponent(mockCallbackUri)}&nonce=${mockNonce}`,
        method: 'GET',
      });
    });

    it('should throw error when provider is missing', async () => {
      await expect(
        // @ts-expect-error Testing missing provider
        oauth2.getOAuth2AuthzUrl(undefined, mockCallbackUri),
      ).rejects.toThrow('OAuth2 provider is required');
    });

    it('should throw error when callback URI is missing', async () => {
      await expect(
        // @ts-expect-error Testing missing callback URI
        oauth2.getOAuth2AuthzUrl('github', undefined),
      ).rejects.toThrow('Callback URI is required');
    });

    it('should handle 400 Bad Request error', async () => {
      const mockError = {
        response: { status: 400 },
        message: 'Bad request',
      };

      vi.mocked(DatalayerApi.requestDatalayerAPI).mockRejectedValueOnce(
        mockError,
      );

      await expect(
        oauth2.getOAuth2AuthzUrl(
          'github',
          mockCallbackUri,
          undefined,
          mockBaseUrl,
        ),
      ).rejects.toThrow('Invalid OAuth2 parameters: Bad request');
    });

    it('should handle 404 Not Found error', async () => {
      const mockError = {
        response: { status: 404 },
        message: 'Not found',
      };

      vi.mocked(DatalayerApi.requestDatalayerAPI).mockRejectedValueOnce(
        mockError,
      );

      await expect(
        oauth2.getOAuth2AuthzUrl(
          'github',
          mockCallbackUri,
          undefined,
          mockBaseUrl,
        ),
      ).rejects.toThrow("OAuth2 provider 'github' not found or not configured");
    });

    it('should use default base URL when not provided', async () => {
      const mockResponse: oauth2.OAuth2AuthzUrlResponse = {
        success: true,
        message: 'Authorization URL generated',
        loginURL: 'https://github.com/login/oauth/authorize?...',
      };

      vi.mocked(DatalayerApi.requestDatalayerAPI).mockResolvedValueOnce(
        mockResponse,
      );

      await oauth2.getOAuth2AuthzUrl('github', mockCallbackUri);

      expect(DatalayerApi.requestDatalayerAPI).toHaveBeenCalledWith({
        url: expect.stringContaining('https://prod1.datalayer.run'),
        method: 'GET',
      });
    });
  });

  describe('getOAuth2AuthzUrlForLink', () => {
    const mockBaseUrl = 'https://example.com';
    const mockCallbackUri = 'https://app.example.com/callback';

    it('should generate link authorization URL for GitHub', async () => {
      const mockResponse: oauth2.OAuth2AuthzUrlResponse = {
        success: true,
        message: 'Link authorization URL generated',
        loginURL: 'https://github.com/login/oauth/authorize?...',
      };

      vi.mocked(DatalayerApi.requestDatalayerAPI).mockResolvedValueOnce(
        mockResponse,
      );

      const result = await oauth2.getOAuth2AuthzUrlForLink(
        'github',
        mockCallbackUri,
        mockBaseUrl,
      );

      expect(result).toEqual(mockResponse);
      expect(DatalayerApi.requestDatalayerAPI).toHaveBeenCalledWith({
        url: `${mockBaseUrl}/api/iam/v1/oauth2/authz/url/link?provider=github&callback_uri=${encodeURIComponent(mockCallbackUri)}`,
        method: 'GET',
      });
    });

    it('should throw error when provider is missing', async () => {
      await expect(
        // @ts-expect-error Testing missing provider
        oauth2.getOAuth2AuthzUrlForLink(undefined, mockCallbackUri),
      ).rejects.toThrow('OAuth2 provider is required');
    });

    it('should throw error when callback URI is missing', async () => {
      await expect(
        // @ts-expect-error Testing missing callback URI
        oauth2.getOAuth2AuthzUrlForLink('github', undefined),
      ).rejects.toThrow('Callback URI is required');
    });

    it('should handle 400 Bad Request error', async () => {
      const mockError = {
        response: { status: 400 },
        message: 'Bad request',
      };

      vi.mocked(DatalayerApi.requestDatalayerAPI).mockRejectedValueOnce(
        mockError,
      );

      await expect(
        oauth2.getOAuth2AuthzUrlForLink('github', mockCallbackUri, mockBaseUrl),
      ).rejects.toThrow('Invalid OAuth2 link parameters: Bad request');
    });

    it('should handle 404 Not Found error', async () => {
      const mockError = {
        response: { status: 404 },
        message: 'Not found',
      };

      vi.mocked(DatalayerApi.requestDatalayerAPI).mockRejectedValueOnce(
        mockError,
      );

      await expect(
        oauth2.getOAuth2AuthzUrlForLink(
          'linkedin',
          mockCallbackUri,
          mockBaseUrl,
        ),
      ).rejects.toThrow(
        "OAuth2 provider 'linkedin' not found or not configured for linking",
      );
    });
  });

  describe('handleGitHubOAuth2Callback', () => {
    const mockBaseUrl = 'https://example.com';
    const mockParams: oauth2.OAuth2CallbackParams = {
      code: 'auth-code-123',
      state: 'state-456',
    };

    it('should handle successful GitHub callback', async () => {
      const mockHtmlResponse = '<html><body>Success</body></html>';

      vi.mocked(DatalayerApi.requestDatalayerAPI).mockResolvedValueOnce(
        mockHtmlResponse,
      );

      const result = await oauth2.handleGitHubOAuth2Callback(
        mockParams,
        mockBaseUrl,
      );

      expect(result).toBe(mockHtmlResponse);
      expect(DatalayerApi.requestDatalayerAPI).toHaveBeenCalledWith({
        url: `${mockBaseUrl}/api/iam/v1/oauth2/github/callback?state=state-456&code=auth-code-123`,
        method: 'GET',
        headers: {
          Accept: 'text/html',
        },
      });
    });

    it('should handle callback with error parameters', async () => {
      const errorParams: oauth2.OAuth2CallbackParams = {
        state: 'state-456',
        error: 'access_denied',
        error_description: 'User denied access',
        error_uri: 'https://example.com/error',
      };

      const mockHtmlResponse = '<html><body>Error</body></html>';

      vi.mocked(DatalayerApi.requestDatalayerAPI).mockResolvedValueOnce(
        mockHtmlResponse,
      );

      const result = await oauth2.handleGitHubOAuth2Callback(
        errorParams,
        mockBaseUrl,
      );

      expect(result).toBe(mockHtmlResponse);
      expect(DatalayerApi.requestDatalayerAPI).toHaveBeenCalledWith({
        url: expect.stringContaining('error=access_denied'),
        method: 'GET',
        headers: {
          Accept: 'text/html',
        },
      });
    });

    it('should throw error when state is missing', async () => {
      const invalidParams: oauth2.OAuth2CallbackParams = {
        code: 'auth-code-123',
        state: '', // Empty state
      };

      await expect(
        oauth2.handleGitHubOAuth2Callback(invalidParams, mockBaseUrl),
      ).rejects.toThrow('State parameter is required for OAuth2 callback');
    });

    it('should handle 403 Forbidden error', async () => {
      const mockError = {
        response: { status: 403 },
        message: 'Forbidden',
      };

      vi.mocked(DatalayerApi.requestDatalayerAPI).mockRejectedValueOnce(
        mockError,
      );

      await expect(
        oauth2.handleGitHubOAuth2Callback(mockParams, mockBaseUrl),
      ).rejects.toThrow('GitHub OAuth2 callback unauthorized: Forbidden');
    });

    it('should handle unexpected status codes', async () => {
      const mockError = {
        response: { status: 500 },
        message: 'Internal server error',
      };

      vi.mocked(DatalayerApi.requestDatalayerAPI).mockRejectedValueOnce(
        mockError,
      );

      await expect(
        oauth2.handleGitHubOAuth2Callback(mockParams, mockBaseUrl),
      ).rejects.toThrow(
        'GitHub OAuth2 callback failed: 500 - Internal server error',
      );
    });
  });

  describe('handleLinkedInOAuth2Callback', () => {
    const mockBaseUrl = 'https://example.com';
    const mockParams: oauth2.OAuth2CallbackParams = {
      code: 'auth-code-789',
      state: 'state-012',
    };

    it('should handle successful LinkedIn callback', async () => {
      const mockHtmlResponse = '<html><body>LinkedIn Success</body></html>';

      vi.mocked(DatalayerApi.requestDatalayerAPI).mockResolvedValueOnce(
        mockHtmlResponse,
      );

      const result = await oauth2.handleLinkedInOAuth2Callback(
        mockParams,
        mockBaseUrl,
      );

      expect(result).toBe(mockHtmlResponse);
      expect(DatalayerApi.requestDatalayerAPI).toHaveBeenCalledWith({
        url: `${mockBaseUrl}/api/iam/v1/oauth2/linkedin/callback?state=state-012&code=auth-code-789`,
        method: 'GET',
        headers: {
          Accept: 'text/html',
        },
      });
    });

    it('should throw error when state is missing', async () => {
      const invalidParams = {
        code: 'auth-code-789',
      } as oauth2.OAuth2CallbackParams;

      await expect(
        oauth2.handleLinkedInOAuth2Callback(invalidParams, mockBaseUrl),
      ).rejects.toThrow('State parameter is required for OAuth2 callback');
    });

    it('should handle 403 Forbidden error', async () => {
      const mockError = {
        response: { status: 403 },
        message: 'Unauthorized',
      };

      vi.mocked(DatalayerApi.requestDatalayerAPI).mockRejectedValueOnce(
        mockError,
      );

      await expect(
        oauth2.handleLinkedInOAuth2Callback(mockParams, mockBaseUrl),
      ).rejects.toThrow('LinkedIn OAuth2 callback unauthorized: Unauthorized');
    });
  });

  describe('handleOktaOAuth2Callback', () => {
    const mockBaseUrl = 'https://example.com';
    const mockParams: oauth2.OAuth2CallbackParams = {
      code: 'okta-code-345',
      state: 'okta-state-678',
    };

    it('should handle successful Okta callback', async () => {
      const mockHtmlResponse = '<html><body>Okta Success</body></html>';

      vi.mocked(DatalayerApi.requestDatalayerAPI).mockResolvedValueOnce(
        mockHtmlResponse,
      );

      const result = await oauth2.handleOktaOAuth2Callback(
        mockParams,
        mockBaseUrl,
      );

      expect(result).toBe(mockHtmlResponse);
      expect(DatalayerApi.requestDatalayerAPI).toHaveBeenCalledWith({
        url: `${mockBaseUrl}/api/iam/v1/oauth2/okta/callback?state=okta-state-678&code=okta-code-345`,
        method: 'GET',
        headers: {
          Accept: 'text/html',
        },
      });
    });

    it('should throw error when state is missing', async () => {
      const invalidParams: oauth2.OAuth2CallbackParams = {
        code: 'okta-code-345',
        // @ts-expect-error Testing undefined state
        state: undefined,
      };

      await expect(
        oauth2.handleOktaOAuth2Callback(invalidParams, mockBaseUrl),
      ).rejects.toThrow('State parameter is required for OAuth2 callback');
    });

    it('should handle 403 Forbidden error', async () => {
      const mockError = {
        response: { status: 403 },
        message: 'Access denied',
      };

      vi.mocked(DatalayerApi.requestDatalayerAPI).mockRejectedValueOnce(
        mockError,
      );

      await expect(
        oauth2.handleOktaOAuth2Callback(mockParams, mockBaseUrl),
      ).rejects.toThrow('Okta OAuth2 callback unauthorized: Access denied');
    });

    it('should handle network errors', async () => {
      const mockError = new Error('Network error');

      vi.mocked(DatalayerApi.requestDatalayerAPI).mockRejectedValueOnce(
        mockError,
      );

      await expect(
        oauth2.handleOktaOAuth2Callback(mockParams, mockBaseUrl),
      ).rejects.toThrow('Network error');
    });
  });

  describe('OAuth2 callback with only state parameter', () => {
    const mockBaseUrl = 'https://example.com';

    it('should handle GitHub callback with only state (no code)', async () => {
      const paramsWithoutCode: oauth2.OAuth2CallbackParams = {
        state: 'state-only',
      };

      const mockHtmlResponse = '<html><body>No code</body></html>';

      vi.mocked(DatalayerApi.requestDatalayerAPI).mockResolvedValueOnce(
        mockHtmlResponse,
      );

      const result = await oauth2.handleGitHubOAuth2Callback(
        paramsWithoutCode,
        mockBaseUrl,
      );

      expect(result).toBe(mockHtmlResponse);
      expect(DatalayerApi.requestDatalayerAPI).toHaveBeenCalledWith({
        url: `${mockBaseUrl}/api/iam/v1/oauth2/github/callback?state=state-only`,
        method: 'GET',
        headers: {
          Accept: 'text/html',
        },
      });
    });
  });
});
