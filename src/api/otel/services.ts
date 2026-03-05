/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Services API functions for the Datalayer OTEL service.
 *
 * @module api/otel/services
 */

import { requestDatalayerAPI } from '../DatalayerApi';
import { API_BASE_PATHS, DEFAULT_SERVICE_URLS } from '../constants';
import { validateToken } from '../utils/validation';
import type {
  ListServicesResponse,
  OtelStats,
  PingResponse,
  VersionResponse,
  FlushResponse,
} from './types';

/**
 * List all observed service names.
 *
 * @param token - Authentication token
 * @param baseUrl - Base URL for the OTEL service
 * @returns Promise resolving to a list of service names
 */
export const listServices = async (
  token: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.OTEL,
): Promise<ListServicesResponse> => {
  validateToken(token);

  return requestDatalayerAPI<ListServicesResponse>({
    url: `${baseUrl}${API_BASE_PATHS.OTEL}/traces/services/list`,
    method: 'GET',
    token,
  });
};

/**
 * Check service health (no auth required).
 *
 * @param baseUrl - Base URL for the OTEL service
 * @returns Promise resolving to ping response
 */
export const ping = async (
  baseUrl: string = DEFAULT_SERVICE_URLS.OTEL,
): Promise<PingResponse> => {
  return requestDatalayerAPI<PingResponse>({
    url: `${baseUrl}${API_BASE_PATHS.OTEL}/ping`,
    method: 'GET',
  });
};

/**
 * Get service version.
 *
 * @param baseUrl - Base URL for the OTEL service
 * @returns Promise resolving to version info
 */
export const version = async (
  baseUrl: string = DEFAULT_SERVICE_URLS.OTEL,
): Promise<VersionResponse> => {
  return requestDatalayerAPI<VersionResponse>({
    url: `${baseUrl}${API_BASE_PATHS.OTEL}/version`,
    method: 'GET',
  });
};

/**
 * Get storage statistics.
 *
 * @param token - Authentication token
 * @param baseUrl - Base URL for the OTEL service
 * @returns Promise resolving to storage statistics
 */
export const getStats = async (
  token: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.OTEL,
): Promise<OtelStats> => {
  validateToken(token);

  return requestDatalayerAPI<OtelStats>({
    url: `${baseUrl}${API_BASE_PATHS.OTEL}/stats`,
    method: 'GET',
    token,
  });
};

/**
 * Force-flush all buffered telemetry data.
 *
 * @param token - Authentication token
 * @param baseUrl - Base URL for the OTEL service
 * @returns Promise resolving to flush result
 */
export const flush = async (
  token: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.OTEL,
): Promise<FlushResponse> => {
  validateToken(token);

  return requestDatalayerAPI<FlushResponse>({
    url: `${baseUrl}${API_BASE_PATHS.OTEL}/flush`,
    method: 'POST',
    token,
  });
};
