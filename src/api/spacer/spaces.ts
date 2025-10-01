/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Workspace spaces API functions for the Datalayer platform.
 *
 * Provides function for creating workspace spaces.
 *
 * @module api/spacer/spaces
 */

import { requestDatalayerAPI } from '../DatalayerApi';
import { API_BASE_PATHS, DEFAULT_SERVICE_URLS } from '../constants';
import { validateToken } from '../utils/validation';
import { CreateSpaceRequest, CreateSpaceResponse } from '../types/spacer';

/**
 * Create a new workspace space.
 * @param token - Authentication token
 * @param data - Space creation configuration
 * @param baseUrl - Base URL for the API
 * @returns Promise resolving to the created space response
 */
export const createSpace = async (
  token: string,
  data: CreateSpaceRequest,
  baseUrl: string = DEFAULT_SERVICE_URLS.SPACER,
): Promise<CreateSpaceResponse> => {
  validateToken(token);

  return requestDatalayerAPI<CreateSpaceResponse>({
    url: `${baseUrl}${API_BASE_PATHS.SPACER}/spaces`,
    method: 'POST',
    token,
    body: data,
  });
};
