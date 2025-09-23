/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * @module api/runtimes/runtimes
 * @description Runtime instances API functions for the Datalayer platform.
 *
 * Provides functions for managing runtime instances (active compute containers).
 */

import { requestDatalayerAPI } from '../DatalayerApi';
import { API_BASE_PATHS } from '../constants';
import {
  Runtime,
  CreateRuntimeRequest,
  RuntimeCreateResponse,
  RuntimesListResponse,
} from '../types/runtimes';

/**
 * Create a new runtime instance.
 * @param baseUrl - Base URL for the API
 * @param token - Authentication token
 * @param data - Runtime creation configuration
 * @returns Promise resolving to the created runtime details
 */
export const create = async (
  baseUrl: string,
  token: string,
  data: CreateRuntimeRequest,
): Promise<RuntimeCreateResponse> => {
  return requestDatalayerAPI<RuntimeCreateResponse>({
    url: `${baseUrl}${API_BASE_PATHS.RUNTIMES}/runtimes`,
    method: 'POST',
    body: data,
    token,
  });
};

/**
 * List all runtime instances.
 * @param baseUrl - Base URL for the API
 * @param token - Authentication token
 * @param params - Optional filtering and pagination parameters
 * @returns Promise resolving to list of runtime instances
 */
export const list = async (
  baseUrl: string,
  token: string,
): Promise<RuntimesListResponse> => {
  return requestDatalayerAPI<RuntimesListResponse>({
    url: `${baseUrl}${API_BASE_PATHS.RUNTIMES}/runtimes`,
    method: 'GET',
    token,
  });
};

/**
 * Get details for a specific runtime instance.
 * @param baseUrl - Base URL for the API
 * @param token - Authentication token
 * @param podName - The unique pod name of the runtime
 * @returns Promise resolving to runtime details
 */
export const get = async (
  baseUrl: string,
  token: string,
  podName: string,
): Promise<Runtime> => {
  return requestDatalayerAPI<Runtime>({
    url: `${baseUrl}${API_BASE_PATHS.RUNTIMES}/runtimes/${podName}`,
    method: 'GET',
    token,
  });
};

/**
 * Delete a runtime instance.
 * @param baseUrl - Base URL for the API
 * @param token - Authentication token
 * @param podName - The unique pod name of the runtime to delete
 * @returns Promise resolving when deletion is complete
 */
export const remove = async (
  baseUrl: string,
  token: string,
  podName: string,
): Promise<void> => {
  return requestDatalayerAPI<void>({
    url: `${baseUrl}${API_BASE_PATHS.RUNTIMES}/runtimes/${podName}`,
    method: 'DELETE',
    token,
  });
};

/**
 * Update the state of a runtime instance.
 * @param baseUrl - Base URL for the API
 * @param token - Authentication token
 * @param podName - The unique pod name of the runtime
 * @param state - The new state to set
 * @returns Promise resolving to updated runtime details
 */
export const setState = async (
  baseUrl: string,
  token: string,
  podName: string,
  state: Runtime['state'],
): Promise<Runtime> => {
  return requestDatalayerAPI<Runtime>({
    url: `${baseUrl}${API_BASE_PATHS.RUNTIMES}/runtimes/${podName}`,
    method: 'PUT',
    token,
    body: { state },
  });
};

/**
 * Get the current status of a runtime instance.
 * @param baseUrl - Base URL for the API
 * @param token - Authentication token
 * @param podName - The unique pod name of the runtime
 * @returns Promise resolving to runtime status details
 */
export const getStatus = async (
  baseUrl: string,
  token: string,
  podName: string,
): Promise<Runtime> => {
  return requestDatalayerAPI<Runtime>({
    url: `${baseUrl}${API_BASE_PATHS.RUNTIMES}/runtimes/${podName}/status`,
    method: 'GET',
    token,
  });
};
