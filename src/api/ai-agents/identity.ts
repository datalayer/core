/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Identity/OAuth API functions for agent-runtimes.
 *
 * Provides functions for exchanging OAuth tokens and fetching
 * user information from OAuth providers.
 *
 * @module api/ai-agents/identity
 */

import { requestDatalayerAPI } from '../DatalayerApi';
import { API_BASE_PATHS, DEFAULT_SERVICE_URLS } from '../constants';
import { validateToken } from '../utils/validation';

/**
 * Exchange an OAuth authorization code for an access token.
 * @param token - Authentication token
 * @param code - OAuth authorization code
 * @param provider - OAuth provider identifier
 * @param redirectUri - OAuth redirect URI
 * @param baseUrl - Base URL for the agent-runtimes service
 * @returns Token exchange result
 */
export const exchangeOAuthToken = async (
  token: string,
  code: string,
  provider: string,
  redirectUri: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.AI_AGENTS,
): Promise<Record<string, any>> => {
  validateToken(token);

  return requestDatalayerAPI<Record<string, any>>({
    url: `${baseUrl}${API_BASE_PATHS.AI_AGENTS}/identity/oauth/token`,
    method: 'POST',
    body: { code, provider, redirect_uri: redirectUri },
    token,
  });
};

/**
 * Fetch user information from an OAuth provider.
 * @param token - Authentication token
 * @param provider - OAuth provider identifier
 * @param accessToken - OAuth access token for the provider
 * @param baseUrl - Base URL for the agent-runtimes service
 * @returns User information from the OAuth provider
 */
export const getOAuthUserInfo = async (
  token: string,
  provider: string,
  accessToken: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.AI_AGENTS,
): Promise<Record<string, any>> => {
  validateToken(token);

  return requestDatalayerAPI<Record<string, any>>({
    url: `${baseUrl}${API_BASE_PATHS.AI_AGENTS}/identity/oauth/userinfo`,
    method: 'POST',
    body: { provider, access_token: accessToken },
    token,
  });
};
