/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * @module api/iam/oauth2
 * @description OAuth2 API functions for the Datalayer platform.
 *
 * Provides functions for OAuth2 authorization flows with various providers.
 */

import { requestDatalayerAPI } from '../DatalayerApi';
import { API_BASE_PATHS, DEFAULT_SERVICE_URLS } from '../constants';

/**
 * OAuth2 provider types supported by the platform
 */
export type OAuth2Provider = 'github' | 'linkedin' | 'okta';

/**
 * Response from the OAuth2 authorization URL endpoint
 */
export interface OAuth2AuthzUrlResponse {
  success: boolean;
  message: string;
  loginURL: string;
}

/**
 * OAuth2 callback parameters
 */
export interface OAuth2CallbackParams {
  code?: string;
  state: string;
  error?: string;
  error_description?: string;
  error_uri?: string;
}

/**
 * OAuth2 callback response (HTML content)
 */
export type OAuth2CallbackResponse = string;

/**
 * Get the OAuth2 authorization URL for a specific provider
 * @param provider - OAuth2 provider (bluesky, github, linkedin, okta)
 * @param callbackUri - Server endpoint to call with the authz token
 * @param nonce - Optional nonce for security
 * @param baseUrl - Base URL for the API (defaults to production IAM URL)
 * @returns OAuth2 authorization URL response
 * @throws {Error} If required parameters are missing or invalid
 *
 * @description
 * This endpoint generates the OAuth2 authorization URL for the specified provider.
 * Users should be redirected to the returned loginURL to begin the OAuth2 flow.
 *
 * Expected status codes:
 * - 200: Successfully generated authorization URL
 * - 400: Invalid parameters
 * - 404: Provider not found or not configured
 */
export const getOAuth2AuthzUrl = async (
  provider: OAuth2Provider,
  callbackUri: string,
  nonce?: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.IAM,
): Promise<OAuth2AuthzUrlResponse> => {
  if (!provider) {
    throw new Error('OAuth2 provider is required');
  }

  if (!callbackUri) {
    throw new Error('Callback URI is required');
  }

  // Build query parameters
  const queryParams = new URLSearchParams({
    provider,
    callback_uri: callbackUri,
  });

  if (nonce) {
    queryParams.append('nonce', nonce);
  }

  try {
    const response = await requestDatalayerAPI<OAuth2AuthzUrlResponse>({
      url: `${baseUrl}${API_BASE_PATHS.IAM}/oauth2/authz/url?${queryParams.toString()}`,
      method: 'GET',
    });

    return response;
  } catch (error: any) {
    // Check if it's a response error with status code information
    if (error.response) {
      const status = error.response.status;

      // Expected errors
      if (status === 400) {
        throw new Error(`Invalid OAuth2 parameters: ${error.message}`);
      }
      if (status === 404) {
        throw new Error(
          `OAuth2 provider '${provider}' not found or not configured`,
        );
      }

      // Unexpected status codes
      throw new Error(
        `Failed to get OAuth2 authorization URL: ${status} - ${error.message}`,
      );
    }

    // Re-throw other errors (network errors, etc.)
    throw error;
  }
};

/**
 * Get the OAuth2 authorization URL for linking a provider to an existing account
 * @param provider - OAuth2 provider (bluesky, github, linkedin, okta)
 * @param callbackUri - Server endpoint to call with the authz token
 * @param baseUrl - Base URL for the API (defaults to production IAM URL)
 * @returns OAuth2 authorization URL response
 * @throws {Error} If required parameters are missing or invalid
 *
 * @description
 * This endpoint generates the OAuth2 authorization URL for linking a provider to an existing account.
 * Users should be redirected to the returned loginURL to begin the OAuth2 linking flow.
 * This is different from the regular OAuth2 login flow as it links the provider to an existing account.
 *
 * Expected status codes:
 * - 200: Successfully generated authorization URL
 * - 400: Invalid parameters
 * - 404: Provider not found or not configured
 */
export const getOAuth2AuthzUrlForLink = async (
  provider: OAuth2Provider,
  callbackUri: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.IAM,
): Promise<OAuth2AuthzUrlResponse> => {
  if (!provider) {
    throw new Error('OAuth2 provider is required');
  }

  if (!callbackUri) {
    throw new Error('Callback URI is required');
  }

  // Build query parameters
  const queryParams = new URLSearchParams({
    provider,
    callback_uri: callbackUri,
  });

  try {
    const response = await requestDatalayerAPI<OAuth2AuthzUrlResponse>({
      url: `${baseUrl}${API_BASE_PATHS.IAM}/oauth2/authz/url/link?${queryParams.toString()}`,
      method: 'GET',
    });

    return response;
  } catch (error: any) {
    // Check if it's a response error with status code information
    if (error.response) {
      const status = error.response.status;

      // Expected errors
      if (status === 400) {
        throw new Error(`Invalid OAuth2 link parameters: ${error.message}`);
      }
      if (status === 404) {
        throw new Error(
          `OAuth2 provider '${provider}' not found or not configured for linking`,
        );
      }

      // Unexpected status codes
      throw new Error(
        `Failed to get OAuth2 link authorization URL: ${status} - ${error.message}`,
      );
    }

    // Re-throw other errors (network errors, etc.)
    throw error;
  }
};

/**
 * Handle GitHub OAuth2 callback
 * @param params - OAuth2 callback parameters
 * @param baseUrl - Base URL for the API (defaults to production IAM URL)
 * @returns HTML response from the callback handler
 * @throws {Error} If state parameter is missing
 * @throws {Error} If the callback fails
 *
 * @description
 * This endpoint handles the callback from GitHub after the user authorizes the application.
 * It returns HTML content that typically includes JavaScript to handle the OAuth flow completion.
 *
 * Expected status codes:
 * - 200: Callback processed successfully (returns HTML)
 * - 403: Unauthorized
 */
export const handleGitHubOAuth2Callback = async (
  params: OAuth2CallbackParams,
  baseUrl: string = DEFAULT_SERVICE_URLS.IAM,
): Promise<OAuth2CallbackResponse> => {
  if (!params.state) {
    throw new Error('State parameter is required for OAuth2 callback');
  }

  // Build query parameters
  const queryParams = new URLSearchParams();
  queryParams.append('state', params.state);

  if (params.code) {
    queryParams.append('code', params.code);
  }
  if (params.error) {
    queryParams.append('error', params.error);
  }
  if (params.error_description) {
    queryParams.append('error_description', params.error_description);
  }
  if (params.error_uri) {
    queryParams.append('error_uri', params.error_uri);
  }

  try {
    const response = await requestDatalayerAPI<OAuth2CallbackResponse>({
      url: `${baseUrl}${API_BASE_PATHS.IAM}/oauth2/github/callback?${queryParams.toString()}`,
      method: 'GET',
      // Note: This endpoint returns HTML, not JSON
      headers: {
        Accept: 'text/html',
      },
    });

    return response;
  } catch (error: any) {
    // Check if it's a response error with status code information
    if (error.response) {
      const status = error.response.status;

      // Expected errors
      if (status === 403) {
        throw new Error(
          `GitHub OAuth2 callback unauthorized: ${error.message}`,
        );
      }

      // Unexpected status codes
      throw new Error(
        `GitHub OAuth2 callback failed: ${status} - ${error.message}`,
      );
    }

    // Re-throw other errors (network errors, etc.)
    throw error;
  }
};

/**
 * Handle LinkedIn OAuth2 callback
 * @param params - OAuth2 callback parameters
 * @param baseUrl - Base URL for the API (defaults to production IAM URL)
 * @returns HTML response from the callback handler
 * @throws {Error} If state parameter is missing
 * @throws {Error} If the callback fails
 *
 * @description
 * This endpoint handles the callback from LinkedIn after the user authorizes the application.
 * It returns HTML content that typically includes JavaScript to handle the OAuth flow completion.
 *
 * Expected status codes:
 * - 200: Callback processed successfully (returns HTML)
 * - 403: Unauthorized
 */
export const handleLinkedInOAuth2Callback = async (
  params: OAuth2CallbackParams,
  baseUrl: string = DEFAULT_SERVICE_URLS.IAM,
): Promise<OAuth2CallbackResponse> => {
  if (!params.state) {
    throw new Error('State parameter is required for OAuth2 callback');
  }

  // Build query parameters
  const queryParams = new URLSearchParams();
  queryParams.append('state', params.state);

  if (params.code) {
    queryParams.append('code', params.code);
  }
  if (params.error) {
    queryParams.append('error', params.error);
  }
  if (params.error_description) {
    queryParams.append('error_description', params.error_description);
  }
  if (params.error_uri) {
    queryParams.append('error_uri', params.error_uri);
  }

  try {
    const response = await requestDatalayerAPI<OAuth2CallbackResponse>({
      url: `${baseUrl}${API_BASE_PATHS.IAM}/oauth2/linkedin/callback?${queryParams.toString()}`,
      method: 'GET',
      // Note: This endpoint returns HTML, not JSON
      headers: {
        Accept: 'text/html',
      },
    });

    return response;
  } catch (error: any) {
    // Check if it's a response error with status code information
    if (error.response) {
      const status = error.response.status;

      // Expected errors
      if (status === 403) {
        throw new Error(
          `LinkedIn OAuth2 callback unauthorized: ${error.message}`,
        );
      }

      // Unexpected status codes
      throw new Error(
        `LinkedIn OAuth2 callback failed: ${status} - ${error.message}`,
      );
    }

    // Re-throw other errors (network errors, etc.)
    throw error;
  }
};

/**
 * Handle Okta OAuth2 callback
 * @param params - OAuth2 callback parameters
 * @param baseUrl - Base URL for the API (defaults to production IAM URL)
 * @returns HTML response from the callback handler
 * @throws {Error} If state parameter is missing
 * @throws {Error} If the callback fails
 *
 * @description
 * This endpoint handles the callback from Okta after the user authorizes the application.
 * It returns HTML content that typically includes JavaScript to handle the OAuth flow completion.
 *
 * Expected status codes:
 * - 200: Callback processed successfully (returns HTML)
 * - 403: Unauthorized
 */
export const handleOktaOAuth2Callback = async (
  params: OAuth2CallbackParams,
  baseUrl: string = DEFAULT_SERVICE_URLS.IAM,
): Promise<OAuth2CallbackResponse> => {
  if (!params.state) {
    throw new Error('State parameter is required for OAuth2 callback');
  }

  // Build query parameters
  const queryParams = new URLSearchParams();
  queryParams.append('state', params.state);

  if (params.code) {
    queryParams.append('code', params.code);
  }
  if (params.error) {
    queryParams.append('error', params.error);
  }
  if (params.error_description) {
    queryParams.append('error_description', params.error_description);
  }
  if (params.error_uri) {
    queryParams.append('error_uri', params.error_uri);
  }

  try {
    const response = await requestDatalayerAPI<OAuth2CallbackResponse>({
      url: `${baseUrl}${API_BASE_PATHS.IAM}/oauth2/okta/callback?${queryParams.toString()}`,
      method: 'GET',
      // Note: This endpoint returns HTML, not JSON
      headers: {
        Accept: 'text/html',
      },
    });

    return response;
  } catch (error: any) {
    // Check if it's a response error with status code information
    if (error.response) {
      const status = error.response.status;

      // Expected errors
      if (status === 403) {
        throw new Error(`Okta OAuth2 callback unauthorized: ${error.message}`);
      }

      // Unexpected status codes
      throw new Error(
        `Okta OAuth2 callback failed: ${status} - ${error.message}`,
      );
    }

    // Re-throw other errors (network errors, etc.)
    throw error;
  }
};
