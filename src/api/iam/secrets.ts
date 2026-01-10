/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Secrets API functions.
 * @module api/secrets/secrets
 */

import { requestDatalayerAPI } from '../DatalayerApi';
import { API_BASE_PATHS, DEFAULT_SERVICE_URLS } from '../constants';
import { validateToken, validateRequiredString } from '../utils/validation';
import type {
  CreateSecretRequest,
  CreateSecretResponse,
  GetSecretResponse,
  ListSecretsResponse,
  UpdateSecretRequest,
  UpdateSecretResponse,
  DeleteSecretResponse,
} from '../../models/Secret';

/**
 * Helper function to Base64 encode a value (cross-platform).
 * @param value - Plain text value to encode
 * @returns Base64 encoded string
 */
function encodeValue(value: string): string {
  if (typeof Buffer !== 'undefined') {
    // Node.js environment
    return Buffer.from(value).toString('base64');
  } else {
    // Browser environment
    return btoa(value);
  }
}

/**
 * Create a new secret.
 * Creates a new encrypted secret for the authenticated user.
 *
 * @param token - Authentication token
 * @param data - Secret creation data
 * @param baseUrl - Base URL for IAM service
 * @returns Created secret data
 *
 * @example
 * ```typescript
 * const response = await createSecret(token, {
 *   variant: 'password',
 *   name: 'db_password',
 *   description: 'Production database password',
 *   value: 'my-secure-password'
 * });
 * ```
 */
export const createSecret = async (
  token: string,
  data: CreateSecretRequest,
  baseUrl: string = DEFAULT_SERVICE_URLS.IAM,
): Promise<CreateSecretResponse> => {
  validateToken(token);
  validateRequiredString(data.name, 'Secret name');
  validateRequiredString(data.value, 'Secret value');

  // Base64 encode the value before sending to API
  const requestBody = {
    variant: data.variant || 'generic',
    name: data.name,
    description: data.description || '',
    value: encodeValue(data.value),
  };

  try {
    return await requestDatalayerAPI<CreateSecretResponse>({
      url: `${baseUrl}${API_BASE_PATHS.IAM}/secrets`,
      method: 'POST',
      body: requestBody,
      token,
    });
  } catch (error: any) {
    if (error.response?.status === 409) {
      throw new Error(
        `Secret with name '${data.name}' already exists. Please use a different name.`,
      );
    }
    throw error;
  }
};

/**
 * List all secrets for authenticated user.
 * Retrieves all secret configurations accessible to the user.
 *
 * @param token - Authentication token
 * @param baseUrl - Base URL for IAM service
 * @returns List of secrets
 *
 * @example
 * ```typescript
 * const response = await listSecrets(token);
 * console.log(response.secrets);
 * ```
 */
export const listSecrets = async (
  token: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.IAM,
): Promise<ListSecretsResponse> => {
  validateToken(token);

  return await requestDatalayerAPI<ListSecretsResponse>({
    url: `${baseUrl}${API_BASE_PATHS.IAM}/secrets`,
    method: 'GET',
    token,
  });
};

/**
 * Get a specific secret by ID.
 * Retrieves detailed information about a specific secret.
 *
 * @param token - Authentication token
 * @param secretId - Secret unique identifier
 * @param baseUrl - Base URL for IAM service
 * @returns Secret data
 *
 * @example
 * ```typescript
 * const response = await getSecret(token, 'secret-id-123');
 * console.log(response.secret);
 * ```
 */
export const getSecret = async (
  token: string,
  secretId: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.IAM,
): Promise<GetSecretResponse> => {
  validateToken(token);
  validateRequiredString(secretId, 'Secret ID');

  try {
    return await requestDatalayerAPI<GetSecretResponse>({
      url: `${baseUrl}${API_BASE_PATHS.IAM}/secrets/${secretId}`,
      method: 'GET',
      token,
    });
  } catch (error: any) {
    if (error.response?.status === 404) {
      throw new Error(`Secret '${secretId}' not found.`);
    }
    throw error;
  }
};

/**
 * Update a specific secret.
 * Updates the configuration of an existing secret.
 *
 * @param token - Authentication token
 * @param secretId - Secret unique identifier
 * @param data - Update data
 * @param baseUrl - Base URL for IAM service
 * @returns Updated secret data
 *
 * @example
 * ```typescript
 * const response = await updateSecret(token, 'secret-id-123', {
 *   description: 'Updated description',
 *   value: 'new-password'
 * });
 * ```
 */
export const updateSecret = async (
  token: string,
  secretId: string,
  data: UpdateSecretRequest,
  baseUrl: string = DEFAULT_SERVICE_URLS.IAM,
): Promise<UpdateSecretResponse> => {
  validateToken(token);
  validateRequiredString(secretId, 'Secret ID');

  // Base64 encode value if provided
  const requestBody: any = { ...data };
  if (data.value) {
    requestBody.value = encodeValue(data.value);
  }

  try {
    return await requestDatalayerAPI<UpdateSecretResponse>({
      url: `${baseUrl}${API_BASE_PATHS.IAM}/secrets/${secretId}`,
      method: 'PUT',
      body: requestBody,
      token,
    });
  } catch (error: any) {
    if (error.response?.status === 404) {
      throw new Error(`Secret '${secretId}' not found.`);
    }
    throw error;
  }
};

/**
 * Delete a specific secret.
 * Removes a secret configuration and its encrypted data.
 *
 * @param token - Authentication token
 * @param secretId - Secret unique identifier
 * @param baseUrl - Base URL for IAM service
 *
 * @example
 * ```typescript
 * await deleteSecret(token, 'secret-id-123');
 * ```
 */
export const deleteSecret = async (
  token: string,
  secretId: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.IAM,
): Promise<void> => {
  validateToken(token);
  validateRequiredString(secretId, 'Secret ID');

  try {
    await requestDatalayerAPI<DeleteSecretResponse>({
      url: `${baseUrl}${API_BASE_PATHS.IAM}/secrets/${secretId}`,
      method: 'DELETE',
      token,
    });
  } catch (error: any) {
    if (error.response?.status === 404) {
      throw new Error(`Secret '${secretId}' not found.`);
    }
    throw error;
  }
};
