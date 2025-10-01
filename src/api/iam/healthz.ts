/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Health check API functions for the Datalayer IAM service.
 *
 * Provides functions for checking the health status of the IAM service.
 *
 * @module api/iam/healthz
 */

import { requestDatalayerAPI } from '../DatalayerApi';
import { API_BASE_PATHS, DEFAULT_SERVICE_URLS } from '../constants';
import type { HealthzPingResponse } from '../types/common';

/**
 * Health check ping endpoint
 *
 * @param baseUrl - Base URL for the API (defaults to production IAM URL)
 * @returns Health check response with user count
 * @throws {Error} If the health check fails
 *
 * @remarks
 * This endpoint provides a basic health check for the IAM service.
 * It returns the current user count in the system.
 *
 * Expected status codes:
 * - 200: Service is healthy
 */
export const ping = async (
  baseUrl: string = DEFAULT_SERVICE_URLS.IAM,
): Promise<HealthzPingResponse> => {
  try {
    const response = await requestDatalayerAPI<HealthzPingResponse>({
      url: `${baseUrl}${API_BASE_PATHS.IAM}/ping`,
      method: 'GET',
    });

    return response;
  } catch (error: any) {
    // Check if it's a response error with status code information
    if (error.response) {
      const status = error.response.status;
      throw new Error(
        `Health check failed: Service unhealthy (status ${status}) - ${error.message}`,
      );
    }

    // Re-throw other errors (network errors, etc.)
    throw new Error(`Health check failed: ${error.message}`);
  }
};
