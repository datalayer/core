/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * @module api/iam/profile
 * @description User profile management API functions for the Datalayer platform.
 *
 * Provides functions for retrieving and managing user profile information.
 */

import { requestDatalayerAPI } from '../DatalayerApi';
import { API_BASE_PATHS } from '../constants';
import { UserMeResponse } from '../types/iam';

/**
 * Get current authenticated user
 * @param baseUrl - Base URL for the API
 * @param token - Authentication token
 * @returns Current user information
 */
export const me = async (
  baseUrl: string,
  token: string,
): Promise<UserMeResponse> => {
  return requestDatalayerAPI<UserMeResponse>({
    url: `${baseUrl}${API_BASE_PATHS.IAM}/me`,
    method: 'GET',
    token,
  });
};
