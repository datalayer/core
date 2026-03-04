/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Metrics API functions for the Datalayer OTEL service.
 *
 * @module api/otel/metrics
 */

import { requestDatalayerAPI } from '../DatalayerApi';
import { API_BASE_PATHS, DEFAULT_SERVICE_URLS } from '../constants';
import { validateToken } from '../utils/validation';
import type { ListMetricsResponse } from './types';

/**
 * List available metric names.
 *
 * @param token - Authentication token
 * @param options - Query options
 * @param options.serviceName - Filter by service name
 * @param options.limit - Maximum number of results
 * @param baseUrl - Base URL for the OTEL service
 * @returns Promise resolving to a list of metrics
 */
export const listMetrics = async (
  token: string,
  options: {
    serviceName?: string;
    limit?: number;
  } = {},
  baseUrl: string = DEFAULT_SERVICE_URLS.OTEL,
): Promise<ListMetricsResponse> => {
  validateToken(token);

  const params = new URLSearchParams();
  if (options.limit) params.set('limit', String(options.limit));
  if (options.serviceName) params.set('service_name', options.serviceName);

  const queryString = params.toString();
  const url = `${baseUrl}${API_BASE_PATHS.OTEL}/metrics${queryString ? `?${queryString}` : ''}`;

  return requestDatalayerAPI<ListMetricsResponse>({
    url,
    method: 'GET',
    token,
  });
};

/**
 * Query metric data points with filters.
 *
 * @param token - Authentication token
 * @param options - Query options
 * @param options.metricName - Filter by metric name
 * @param options.serviceName - Filter by service name
 * @param options.limit - Maximum number of data points
 * @param baseUrl - Base URL for the OTEL service
 * @returns Promise resolving to metric data points
 */
export const queryMetrics = async (
  token: string,
  options: {
    metricName?: string;
    serviceName?: string;
    limit?: number;
  } = {},
  baseUrl: string = DEFAULT_SERVICE_URLS.OTEL,
): Promise<ListMetricsResponse> => {
  validateToken(token);

  const params = new URLSearchParams();
  if (options.metricName) params.set('name', options.metricName);
  if (options.serviceName) params.set('service_name', options.serviceName);
  if (options.limit) params.set('limit', String(options.limit));

  const queryString = params.toString();
  const url = `${baseUrl}${API_BASE_PATHS.OTEL}/metrics/query${queryString ? `?${queryString}` : ''}`;

  return requestDatalayerAPI<ListMetricsResponse>({
    url,
    method: 'GET',
    token,
  });
};
