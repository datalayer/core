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
import { API_BASE_PATHS } from '../constants';
import {
  RuntimeSnapshot,
  CreateRuntimeSnapshotRequest,
  LoadRuntimeSnapshotRequest,
  RuntimeSnapshotsListResponse,
} from '../types/runtimes';

/**
 * Create a snapshot of a runtime instance.
 * @param baseUrl - Base URL for the API
 * @param token - Authentication token
 * @param data - Snapshot creation configuration
 * @returns Promise resolving to the created snapshot details
 */
export const create = async (
  baseUrl: string,
  token: string,
  data: CreateRuntimeSnapshotRequest,
): Promise<RuntimeSnapshot> => {
  return requestDatalayerAPI<RuntimeSnapshot>({
    url: `${baseUrl}${API_BASE_PATHS.RUNTIMES}/runtime-snapshots`,
    method: 'POST',
    token,
    body: data,
  });
};

/**
 * List all runtime snapshots.
 * @param baseUrl - Base URL for the API
 * @param token - Authentication token
 * @param params - Optional filtering and pagination parameters
 * @returns Promise resolving to list of snapshots
 */
export const list = async (
  baseUrl: string,
  token: string,
): Promise<RuntimeSnapshotsListResponse> => {
  return requestDatalayerAPI<RuntimeSnapshotsListResponse>({
    url: `${baseUrl}${API_BASE_PATHS.RUNTIMES}/runtime-snapshots`,
    method: 'GET',
    token,
  });
};

/**
 * Get details for a specific runtime snapshot.
 * @param baseUrl - Base URL for the API
 * @param token - Authentication token
 * @param snapshotId - The unique identifier of the snapshot
 * @returns Promise resolving to snapshot details
 */
export const get = async (
  baseUrl: string,
  token: string,
  snapshotId: string,
): Promise<RuntimeSnapshot> => {
  return requestDatalayerAPI<RuntimeSnapshot>({
    url: `${baseUrl}${API_BASE_PATHS.RUNTIMES}/runtime-snapshots/${snapshotId}`,
    method: 'GET',
    token,
  });
};

/**
 * Delete a runtime snapshot.
 * @param baseUrl - Base URL for the API
 * @param token - Authentication token
 * @param snapshotId - The unique identifier of the snapshot to delete
 * @returns Promise resolving when deletion is complete
 */
export const remove = async (
  baseUrl: string,
  token: string,
  snapshotId: string,
): Promise<void> => {
  return requestDatalayerAPI<void>({
    url: `${baseUrl}${API_BASE_PATHS.RUNTIMES}/runtime-snapshots/${snapshotId}`,
    method: 'DELETE',
    token,
  });
};

/**
 * Load a snapshot into a runtime instance.
 * @param baseUrl - Base URL for the API
 * @param token - Authentication token
 * @param data - Snapshot loading configuration
 * @returns Promise resolving when loading is complete
 */
export const load = async (
  baseUrl: string,
  token: string,
  data: LoadRuntimeSnapshotRequest,
): Promise<void> => {
  return requestDatalayerAPI<void>({
    url: `${baseUrl}${API_BASE_PATHS.RUNTIMES}/runtime-snapshots/load`,
    method: 'POST',
    token,
    body: data,
  });
};

/**
 * Download a snapshot as a binary file.
 * @param baseUrl - Base URL for the API
 * @param token - Authentication token
 * @param snapshotId - The unique identifier of the snapshot
 * @returns Promise resolving to snapshot binary data
 */
export const download = async (
  baseUrl: string,
  token: string,
  snapshotId: string,
): Promise<Blob> => {
  return requestDatalayerAPI<Blob>({
    url: `${baseUrl}${API_BASE_PATHS.RUNTIMES}/runtime-snapshots/${snapshotId}/download`,
    method: 'GET',
    token,
  });
};

/**
 * Upload a snapshot from a local file.
 * @param baseUrl - Base URL for the API
 * @param token - Authentication token
 * @param file - The snapshot file to upload
 * @param metadata - Optional metadata for the snapshot
 * @returns Promise resolving to the created snapshot details
 */
export const upload = async (
  baseUrl: string,
  token: string,
  file: File,
  metadata?: Partial<RuntimeSnapshot>,
): Promise<RuntimeSnapshot> => {
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
