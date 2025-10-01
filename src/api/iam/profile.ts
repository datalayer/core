/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * User profile management API functions for the Datalayer platform.
 *
 * Provides functions for retrieving and managing user profile information.
 *
 * @module api/iam/profile
 */

import { requestDatalayerAPI } from '../DatalayerApi';
import { API_BASE_PATHS, DEFAULT_SERVICE_URLS } from '../constants';
import { UserMeResponse, WhoAmIResponse } from '../types/iam';
import { validateToken } from '../utils/validation';

/**
 * Get current authenticated user profile
 * @param token - Authentication token (required)
 * @param baseUrl - Base URL for the API (defaults to production IAM URL)
 * @returns Current user profile information
 */
export const me = async (
  token: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.IAM,
): Promise<UserMeResponse> => {
  validateToken(token);

  return requestDatalayerAPI<UserMeResponse>({
    url: `${baseUrl}${API_BASE_PATHS.IAM}/me`,
    method: 'GET',
    token,
  });
};

/**
 * Get current user identity information
 * @param token - Authentication token (required)
 * @param baseUrl - Base URL for the API (defaults to production IAM URL)
 * @returns Current user identity and profile information
 */
export const whoami = async (
  token: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.IAM,
): Promise<WhoAmIResponse> => {
  validateToken(token);

  return requestDatalayerAPI<WhoAmIResponse>({
    url: `${baseUrl}${API_BASE_PATHS.IAM}/whoami`,
    method: 'GET',
    token,
  });
};
