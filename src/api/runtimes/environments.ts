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
import { API_BASE_PATHS } from '../constants';
import { Environment, EnvironmentsListResponse } from '../types/runtimes';

/**
 * List all available computing environments.
 * @param baseUrl - Base URL for the API
 * @param token - Authentication token
 * @returns Promise resolving to list of available environments
 */
export const list = async (
  baseUrl: string,
  token: string,
): Promise<EnvironmentsListResponse> => {
  return requestDatalayerAPI<EnvironmentsListResponse>({
    url: `${baseUrl}${API_BASE_PATHS.RUNTIMES}/environments`,
    method: 'GET',
    token,
  });
};

/**
 * Get details for a specific computing environment by name.
 * @param baseUrl - Base URL for the API
 * @param token - Authentication token
 * @param name - The environment name (e.g., 'python-base', 'r-4.3')
 * @returns Promise resolving to environment details
 */
export const get = async (
  baseUrl: string,
  token: string,
  name: string,
): Promise<Environment> => {
  return requestDatalayerAPI<Environment>({
    url: `${baseUrl}${API_BASE_PATHS.RUNTIMES}/environments/${name}`,
    method: 'GET',
    token,
  });
};
