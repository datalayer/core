/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * @module api/runtimes/environments
 * @description Computing environments API functions for the Datalayer platform.
 *
 * Provides functions for managing computing environment configurations.
 */

import { requestDatalayerAPI } from '../DatalayerApi';
import { API_BASE_PATHS, DEFAULT_SERVICE_URLS } from '../constants';
import { EnvironmentsListResponse } from '../types/runtimes';
import { validateToken } from '../utils/validation';

/**
 * List all available computing environments.
 * @param token - Authentication token
 * @param baseUrl - Base URL for the API (defaults to production Runtimes URL)
 * @returns Promise resolving to list of available environments
 * @throws {Error} If authentication token is missing or invalid
 */
export const listEnvironments = async (
  token: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.RUNTIMES,
): Promise<EnvironmentsListResponse> => {
  validateToken(token);

  return requestDatalayerAPI<EnvironmentsListResponse>({
    url: `${baseUrl}${API_BASE_PATHS.RUNTIMES}/environments`,
    method: 'GET',
    token,
  });
};
