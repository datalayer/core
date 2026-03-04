/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * SQL query API functions for the Datalayer OTEL service.
 *
 * Executes ad-hoc SQL queries via the SQL Engine engine.
 *
 * @module api/otel/query
 */

import { requestDatalayerAPI } from '../DatalayerApi';
import { API_BASE_PATHS, DEFAULT_SERVICE_URLS } from '../constants';
import { validateToken } from '../utils/validation';
import type { QueryResponse } from './types';

/**
 * Execute an ad-hoc SQL query via the SQL Engine engine.
 *
 * @param token - Authentication token
 * @param sql - SQL query string
 * @param baseUrl - Base URL for the OTEL service
 * @returns Promise resolving to query results
 *
 * @example
 * ```ts
 * const result = await executeSql(token, 'SELECT * FROM spans LIMIT 10');
 * console.log(result.data);
 * ```
 */
export const executeSql = async (
  token: string,
  sql: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.OTEL,
): Promise<QueryResponse> => {
  validateToken(token);

  return requestDatalayerAPI<QueryResponse>({
    url: `${baseUrl}${API_BASE_PATHS.OTEL}/query`,
    method: 'POST',
    body: { sql },
    token,
  });
};
