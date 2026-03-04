/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Logs API functions for the Datalayer OTEL service.
 *
 * @module api/otel/logs
 */

import { requestDatalayerAPI } from '../DatalayerApi';
import { API_BASE_PATHS, DEFAULT_SERVICE_URLS } from '../constants';
import { validateToken } from '../utils/validation';
import type { ListLogsResponse } from './types';

/**
 * Query log records.
 *
 * @param token - Authentication token
 * @param options - Query options
 * @param options.serviceName - Filter by service name
 * @param options.severity - Filter by severity (INFO, WARN, ERROR, etc.)
 * @param options.traceId - Filter by trace ID
 * @param options.limit - Maximum number of log records
 * @param baseUrl - Base URL for the OTEL service
 * @returns Promise resolving to a list of log records
 */
export const queryLogs = async (
  token: string,
  options: {
    serviceName?: string;
    severity?: string;
    traceId?: string;
    limit?: number;
  } = {},
  baseUrl: string = DEFAULT_SERVICE_URLS.OTEL,
): Promise<ListLogsResponse> => {
  validateToken(token);

  const params = new URLSearchParams();
  if (options.serviceName) params.set('service_name', options.serviceName);
  if (options.severity) params.set('severity', options.severity);
  if (options.traceId) params.set('trace_id', options.traceId);
  if (options.limit) params.set('limit', String(options.limit));

  const queryString = params.toString();
  const url = `${baseUrl}${API_BASE_PATHS.OTEL}/logs${queryString ? `?${queryString}` : ''}`;

  return requestDatalayerAPI<ListLogsResponse>({
    url,
    method: 'GET',
    token,
  });
};
