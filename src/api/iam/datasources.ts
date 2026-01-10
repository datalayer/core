/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Datasources API functions.
 * @module api/iam/datasources
 */

import { requestDatalayerAPI } from '../DatalayerApi';
import { API_BASE_PATHS, DEFAULT_SERVICE_URLS } from '../constants';
import { validateToken, validateRequiredString } from '../utils/validation';
import type {
  CreateDatasourceRequest,
  CreateDatasourceResponse,
  GetDatasourceResponse,
  ListDatasourcesResponse,
  UpdateDatasourceRequest,
  UpdateDatasourceResponse,
} from '../../models/Datasource';

/**
 * Create a new datasource.
 * Creates a new datasource configuration for the authenticated user.
 *
 * @param token - Authentication token
 * @param data - Datasource creation data
 * @param baseUrl - Base URL for IAM service
 * @returns Created datasource data
 *
 * @example
 * ```typescript
 * const response = await createDatasource(token, {
 *   type: 'Amazon Athena',
 *   name: 'my-athena-datasource',
 *   description: 'Production Athena datasource',
 *   database: 'my_database',
 *   output_bucket: 's3://my-bucket/output/'
 * });
 * ```
 */
export const createDatasource = async (
  token: string,
  data: CreateDatasourceRequest,
  baseUrl: string = DEFAULT_SERVICE_URLS.IAM,
): Promise<CreateDatasourceResponse> => {
  validateToken(token);
  validateRequiredString(data.name, 'Datasource name');
  validateRequiredString(data.type, 'Datasource type');

  // Map datasource type to API variant format
  const variantMap: Record<string, string> = {
    'Amazon Athena': 'athena',
    'Google BigQuery': 'bigquery',
    'Microsoft Sentinel': 'sentinel',
    Splunk: 'splunk',
  };

  const requestBody = {
    name: data.name,
    variant: variantMap[data.type] || data.type.toLowerCase(),
    description: data.description || '',
    database: data.database || '',
    outputBucket: data.output_bucket || '',
  };

  try {
    return await requestDatalayerAPI<CreateDatasourceResponse>({
      url: `${baseUrl}${API_BASE_PATHS.IAM}/datasources`,
      method: 'POST',
      body: requestBody,
      token,
    });
  } catch (error: any) {
    if (error.response?.status === 409) {
      throw new Error(
        `Datasource with name '${data.name}' already exists. Please use a different name.`,
      );
    }
    throw error;
  }
};

/**
 * List all datasources for authenticated user.
 * Retrieves all datasource configurations accessible to the user.
 *
 * @param token - Authentication token
 * @param baseUrl - Base URL for IAM service
 * @returns List of datasources
 *
 * @example
 * ```typescript
 * const response = await listDatasources(token);
 * console.log(response.datasources);
 * ```
 */
export const listDatasources = async (
  token: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.IAM,
): Promise<ListDatasourcesResponse> => {
  validateToken(token);

  return await requestDatalayerAPI<ListDatasourcesResponse>({
    url: `${baseUrl}${API_BASE_PATHS.IAM}/datasources`,
    method: 'GET',
    token,
  });
};

/**
 * Get a specific datasource by ID.
 * Retrieves detailed information about a specific datasource.
 *
 * @param token - Authentication token
 * @param datasourceId - Datasource unique identifier
 * @param baseUrl - Base URL for IAM service
 * @returns Datasource data
 *
 * @example
 * ```typescript
 * const response = await getDatasource(token, 'datasource-id-123');
 * console.log(response.datasource);
 * ```
 */
export const getDatasource = async (
  token: string,
  datasourceId: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.IAM,
): Promise<GetDatasourceResponse> => {
  validateToken(token);
  validateRequiredString(datasourceId, 'Datasource ID');

  try {
    return await requestDatalayerAPI<GetDatasourceResponse>({
      url: `${baseUrl}${API_BASE_PATHS.IAM}/datasources/${datasourceId}`,
      method: 'GET',
      token,
    });
  } catch (error: any) {
    if (error.response?.status === 404) {
      throw new Error(`Datasource '${datasourceId}' not found.`);
    }
    throw error;
  }
};

/**
 * Update a specific datasource.
 * Updates the configuration of an existing datasource.
 *
 * @param token - Authentication token
 * @param datasourceId - Datasource unique identifier
 * @param data - Update data
 * @param baseUrl - Base URL for IAM service
 * @returns Updated datasource data
 *
 * @example
 * ```typescript
 * const response = await updateDatasource(token, 'datasource-id-123', {
 *   description: 'Updated description',
 *   database: 'new_database'
 * });
 * ```
 */
export const updateDatasource = async (
  token: string,
  datasourceId: string,
  data: UpdateDatasourceRequest,
  baseUrl: string = DEFAULT_SERVICE_URLS.IAM,
): Promise<UpdateDatasourceResponse> => {
  validateToken(token);
  validateRequiredString(datasourceId, 'Datasource ID');

  const requestBody: any = { ...data };

  try {
    return await requestDatalayerAPI<UpdateDatasourceResponse>({
      url: `${baseUrl}${API_BASE_PATHS.IAM}/datasources/${datasourceId}`,
      method: 'PUT',
      body: requestBody,
      token,
    });
  } catch (error: any) {
    if (error.response?.status === 404) {
      throw new Error(`Datasource '${datasourceId}' not found.`);
    }
    throw error;
  }
};

/**
 * Delete a specific datasource.
 * Removes a datasource configuration.
 *
 * @param token - Authentication token
 * @param datasourceId - Datasource unique identifier
 * @param baseUrl - Base URL for IAM service
 *
 * @example
 * ```typescript
 * await deleteDatasource(token, 'datasource-id-123');
 * ```
 */
export const deleteDatasource = async (
  token: string,
  datasourceId: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.IAM,
): Promise<void> => {
  validateToken(token);
  validateRequiredString(datasourceId, 'Datasource ID');

  try {
    await requestDatalayerAPI<void>({
      url: `${baseUrl}${API_BASE_PATHS.IAM}/datasources/${datasourceId}`,
      method: 'DELETE',
      token,
    });
  } catch (error: any) {
    if (error.response?.status === 404) {
      throw new Error(`Datasource '${datasourceId}' not found.`);
    }
    throw error;
  }
};
