/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * @module api/iam/authentication
 * @description Authentication API functions for the Datalayer platform.
 *
 * Provides functions for user login, logout, and authentication management.
 */

import { requestDatalayerAPI } from '../DatalayerApi';
import { API_BASE_PATHS, DEFAULT_SERVICE_URLS } from '../constants';
import { LoginRequest, LoginResponse } from '../types/iam';
import { validateToken } from '../utils/validation';

/**
 * Authenticate a user with credentials or token
 * @param data - Login credentials (either handle+password or token)
 * @param baseUrl - Base URL for the API (defaults to production IAM URL)
 * @returns Login response with tokens
 * @throws {Error} If both credential and token authentication are provided
 * @throws {Error} If neither authentication method is provided
 * @throws {Error} If handle is provided without password or vice versa
 * @throws {Error} If server returns unexpected status code (expects 201 for success, 401 for failure)
 *
 * @description
 * Expected status codes:
 * - 201: Login succeeded
 * - 401: Login failed (invalid credentials)
 */
export const login = async (
  data: LoginRequest,
  baseUrl: string = DEFAULT_SERVICE_URLS.IAM,
): Promise<LoginResponse> => {
  // Validate that we have either handle+password OR token, but not both
  const hasCredentials = Boolean(data.handle || data.password);
  const hasToken = Boolean(data.token);

  if (hasCredentials && hasToken) {
    throw new Error(
      'Cannot provide both credentials (handle/password) and token. Use either handle+password or token.',
    );
  }

  if (!hasCredentials && !hasToken) {
    throw new Error(
      'Must provide either credentials (handle+password) or token for authentication.',
    );
  }

  // If using credentials, ensure both handle and password are provided
  if (hasCredentials) {
    if (!data.handle || !data.password) {
      throw new Error(
        'Both handle and password are required for credential-based authentication.',
      );
    }
  }

  try {
    const response = await requestDatalayerAPI<LoginResponse>({
      url: `${baseUrl}${API_BASE_PATHS.IAM}/login`,
      method: 'POST',
      body: data,
    });

    // Note: requestDatalayerAPI already handles successful responses (2xx status codes)
    // If we get here, the login was successful
    return response;
  } catch (error: any) {
    // Check if it's a response error with status code information
    if (error.response) {
      const status = error.response.status;

      // Expected error: 401 for invalid credentials
      if (status === 401) {
        throw new Error(`Login failed: Invalid credentials (${status})`);
      }

      // Unexpected status codes
      throw new Error(
        `Login failed: Unexpected status code ${status} - ${error.message}`,
      );
    }

    // Re-throw other errors (network errors, etc.)
    throw error;
  }
};

/**
 * Log out the current user
 * @param token - Authentication token
 * @param baseUrl - Base URL for the API (defaults to production IAM URL)
 * @returns Void response
 */
export const logout = async (
  token: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.IAM,
): Promise<void> => {
  validateToken(token);

  return requestDatalayerAPI<void>({
    url: `${baseUrl}${API_BASE_PATHS.IAM}/logout`,
    method: 'GET',
    token,
  });
};

/**
 * Check authentication status
 * @param token - Authentication token (required)
 * @param baseUrl - Base URL for the API (defaults to production IAM URL)
 * @returns Promise that resolves if authenticated (200), rejects if unauthorized (401)
 * @throws {Error} If authentication token is missing or invalid
 *
 * @description
 * This endpoint checks authentication status, useful for reverse proxy validation.
 *
 * Expected status codes:
 * - 200: Authenticated successfully
 * - 401: Unauthorized - invalid or missing credentials
 */
export const checkAuth = async (
  token: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.IAM,
): Promise<void> => {
  validateToken(token);

  try {
    const response = await requestDatalayerAPI<void>({
      url: `${baseUrl}${API_BASE_PATHS.IAM}/auth`,
      method: 'GET',
      token,
    });

    // Note: requestDatalayerAPI already handles successful responses (2xx status codes)
    // If we get here, authentication was successful (200)
    return response;
  } catch (error: any) {
    // Check if it's a response error with status code information
    if (error.response) {
      const status = error.response.status;

      // Expected errors
      if (status === 401) {
        throw new Error(
          `Authentication check failed: Unauthorized (${status})`,
        );
      }

      // Unexpected status codes
      throw new Error(
        `Authentication check failed: Unexpected status code ${status} - ${error.message}`,
      );
    }

    // Re-throw other errors (network errors, etc.)
    throw error;
  }
};
