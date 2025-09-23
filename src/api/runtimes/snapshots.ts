/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * @module api/runtimes/snapshots
 * @description Runtime snapshots API functions for the Datalayer platform.
 *
 * Provides functions for managing runtime snapshots (saved runtime states).
 */

import { requestDatalayerAPI } from '../DatalayerApi';
import { API_BASE_PATHS, DEFAULT_SERVICE_URLS } from '../constants';
import {
  RuntimeSnapshot,
  CreateRuntimeSnapshotRequest,
  LoadRuntimeSnapshotRequest,
  SnapshotsListResponse,
} from '../types/runtimes';
import { validateToken, validateRequiredString } from '../utils/validation';

/**
 * Create a snapshot of a runtime instance.
 * @param token - Authentication token
 * @param data - Snapshot creation configuration
 * @param baseUrl - Base URL for the API (defaults to production Runtimes URL)
 * @returns Promise resolving to the created snapshot details
 * @throws {Error} If authentication token is missing or invalid
 */
export const create = async (
  token: string,
  data: CreateRuntimeSnapshotRequest,
  baseUrl: string = DEFAULT_SERVICE_URLS.RUNTIMES,
): Promise<RuntimeSnapshot> => {
  validateToken(token);

  return requestDatalayerAPI<RuntimeSnapshot>({
    url: `${baseUrl}${API_BASE_PATHS.RUNTIMES}/runtime-snapshots`,
    method: 'POST',
    token,
    body: data,
  });
};

/**
 * List all runtime snapshots.
 * @param token - Authentication token
 * @param baseUrl - Base URL for the API (defaults to production Runtimes URL)
 * @returns Promise resolving to list of snapshots
 * @throws {Error} If authentication token is missing or invalid
 */
export const list = async (
  token: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.RUNTIMES,
): Promise<SnapshotsListResponse> => {
  validateToken(token);

  return requestDatalayerAPI<SnapshotsListResponse>({
    url: `${baseUrl}${API_BASE_PATHS.RUNTIMES}/runtime-snapshots`,
    method: 'GET',
    token,
  });
};

/**
 * Get details for a specific runtime snapshot.
 * @param token - Authentication token
 * @param snapshotId - The unique identifier of the snapshot
 * @param baseUrl - Base URL for the API (defaults to production Runtimes URL)
 * @returns Promise resolving to snapshot details
 * @throws {Error} If authentication token is missing or invalid
 * @throws {Error} If snapshot ID is missing or invalid
 */
export const get = async (
  token: string,
  snapshotId: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.RUNTIMES,
): Promise<RuntimeSnapshot> => {
  validateToken(token);
  validateRequiredString(snapshotId, 'Snapshot ID');

  return requestDatalayerAPI<RuntimeSnapshot>({
    url: `${baseUrl}${API_BASE_PATHS.RUNTIMES}/runtime-snapshots/${snapshotId}`,
    method: 'GET',
    token,
  });
};

/**
 * Delete a runtime snapshot.
 * @param token - Authentication token
 * @param snapshotId - The unique identifier of the snapshot to delete
 * @param baseUrl - Base URL for the API (defaults to production Runtimes URL)
 * @returns Promise resolving when deletion is complete
 * @throws {Error} If authentication token is missing or invalid
 * @throws {Error} If snapshot ID is missing or invalid
 */
export const remove = async (
  token: string,
  snapshotId: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.RUNTIMES,
): Promise<void> => {
  validateToken(token);
  validateRequiredString(snapshotId, 'Snapshot ID');

  return requestDatalayerAPI<void>({
    url: `${baseUrl}${API_BASE_PATHS.RUNTIMES}/runtime-snapshots/${snapshotId}`,
    method: 'DELETE',
    token,
  });
};

/**
 * Load a snapshot into a runtime instance.
 * @param token - Authentication token
 * @param data - Snapshot loading configuration
 * @param baseUrl - Base URL for the API (defaults to production Runtimes URL)
 * @returns Promise resolving when loading is complete
 * @throws {Error} If authentication token is missing or invalid
 */
export const load = async (
  token: string,
  data: LoadRuntimeSnapshotRequest,
  baseUrl: string = DEFAULT_SERVICE_URLS.RUNTIMES,
): Promise<void> => {
  validateToken(token);

  return requestDatalayerAPI<void>({
    url: `${baseUrl}${API_BASE_PATHS.RUNTIMES}/runtime-snapshots/load`,
    method: 'POST',
    token,
    body: data,
  });
};

/**
 * Download a snapshot as a binary file.
 * @param token - Authentication token
 * @param snapshotId - The unique identifier of the snapshot
 * @param baseUrl - Base URL for the API (defaults to production Runtimes URL)
 * @returns Promise resolving to snapshot binary data
 * @throws {Error} If authentication token is missing or invalid
 * @throws {Error} If snapshot ID is missing or invalid
 */
export const download = async (
  token: string,
  snapshotId: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.RUNTIMES,
): Promise<Blob> => {
  validateToken(token);
  validateRequiredString(snapshotId, 'Snapshot ID');

  return requestDatalayerAPI<Blob>({
    url: `${baseUrl}${API_BASE_PATHS.RUNTIMES}/runtime-snapshots/${snapshotId}/download`,
    method: 'GET',
    token,
  });
};

/**
 * Upload a snapshot from a local file.
 * @param token - Authentication token
 * @param file - The snapshot file to upload
 * @param metadata - Optional metadata for the snapshot
 * @param baseUrl - Base URL for the API (defaults to production Runtimes URL)
 * @returns Promise resolving to the created snapshot details
 * @throws {Error} If authentication token is missing or invalid
 */
export const upload = async (
  token: string,
  file: File,
  metadata?: Partial<RuntimeSnapshot>,
  baseUrl: string = DEFAULT_SERVICE_URLS.RUNTIMES,
): Promise<RuntimeSnapshot> => {
  validateToken(token);

  const formData = new FormData();
  formData.append('file', file);
  if (metadata) {
    formData.append('metadata', JSON.stringify(metadata));
  }

  return requestDatalayerAPI<RuntimeSnapshot>({
    url: `${baseUrl}${API_BASE_PATHS.RUNTIMES}/runtime-snapshots/upload`,
    method: 'POST',
    token,
    body: formData,
  });
};
