/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Traces API functions for the Datalayer OTEL service.
 *
 * @module api/otel/traces
 */

import { requestDatalayerAPI } from '../DatalayerApi';
import { API_BASE_PATHS, DEFAULT_SERVICE_URLS } from '../constants';
import { validateToken } from '../utils/validation';
import type { ListTracesResponse, GetTraceResponse } from './types';

/**
 * List recent traces.
 *
 * @param token - Authentication token
 * @param options - Query options
 * @param options.serviceName - Filter by service name
 * @param options.limit - Maximum number of traces (default: 20)
 * @param baseUrl - Base URL for the OTEL service
 * @returns Promise resolving to a list of trace spans
 */
export const listTraces = async (
  token: string,
  options: {
    serviceName?: string;
    limit?: number;
  } = {},
  baseUrl: string = DEFAULT_SERVICE_URLS.OTEL,
): Promise<ListTracesResponse> => {
  validateToken(token);

  const params = new URLSearchParams();
  if (options.limit) params.set('limit', String(options.limit));
  if (options.serviceName) params.set('service_name', options.serviceName);

  const queryString = params.toString();
  const url = `${baseUrl}${API_BASE_PATHS.OTEL}/traces${queryString ? `?${queryString}` : ''}`;

  return requestDatalayerAPI<ListTracesResponse>({
    url,
    method: 'GET',
    token,
  });
};

/**
 * Get all spans for a specific trace.
 *
 * @param token - Authentication token
 * @param traceId - The trace ID to retrieve
 * @param baseUrl - Base URL for the OTEL service
 * @returns Promise resolving to the trace's spans
 */
export const getTrace = async (
  token: string,
  traceId: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.OTEL,
): Promise<GetTraceResponse> => {
  validateToken(token);

  return requestDatalayerAPI<GetTraceResponse>({
    url: `${baseUrl}${API_BASE_PATHS.OTEL}/traces/${traceId}`,
    method: 'GET',
    token,
  });
};
