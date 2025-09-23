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
import { API_BASE_PATHS } from '../constants';
import { LoginRequest, LoginResponse } from '../types/iam';

/**
 * Authenticate a user with credentials
 * @param baseUrl - Base URL for the API
 * @param data - Login credentials
 * @returns Login response with tokens
 */
export const login = async (
  baseUrl: string,
  data: LoginRequest,
): Promise<LoginResponse> => {
  return requestDatalayerAPI<LoginResponse>({
    url: `${baseUrl}${API_BASE_PATHS.IAM}/login`,
    method: 'POST',
    body: data,
  });
};

/**
 * Log out the current user
 * @param baseUrl - Base URL for the API
 * @param token - Authentication token
 * @returns Void response
 */
export const logout = async (baseUrl: string, token: string): Promise<void> => {
  return requestDatalayerAPI<void>({
    url: `${baseUrl}${API_BASE_PATHS.IAM}/logout`,
    method: 'POST',
    token,
  });
};
