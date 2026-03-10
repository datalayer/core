/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Runtime checkpoints API functions for the Datalayer platform.
 *
 * Provides functions for managing CRIU full-pod checkpoints.
 * These are distinct from runtime snapshots (Jupyter sandbox snapshots).
 *
 * @module api/runtimes/checkpoints
 */

import { requestDatalayerAPI } from '../DatalayerApi';
import { API_BASE_PATHS, DEFAULT_SERVICE_URLS } from '../constants';
import { validateToken, validateRequiredString } from '../utils/validation';

// ─── Types ─────────────────────────────────────────────────────────────────

/**
 * A single runtime checkpoint record.
 */
export interface RuntimeCheckpointData {
  /** Unique identifier */
  uid: string;
  /** Human-readable name */
  name: string;
  /** Checkpoint description */
  description: string;
  /** Pod that was checkpointed */
  pod_name: string;
  /** Agent spec identifier (e.g. "mocks/monitor-sales-kpis") */
  agentspec_id: string;
  /** Full agent spec payload */
  agentspec: Record<string, any>;
  /** Additional metadata */
  metadata: Record<string, any>;
  /** Status: requested | created | failed | deleted */
  status: string;
  /** ISO 8601 timestamp */
  updated_at: string;
}

/**
 * Request payload for creating a checkpoint.
 */
export interface CreateRuntimeCheckpointRequest {
  /** Pod name of the runtime that was checkpointed */
  pod_name: string;
  /** Human-readable name */
  name?: string;
  /** Checkpoint description */
  description?: string;
  /** Agent spec identifier */
  agentspec_id?: string;
  /** Full agent spec payload to persist */
  agentspec?: Record<string, any>;
  /** Additional metadata */
  metadata?: Record<string, any>;
}

/**
 * Response for listing checkpoints.
 */
export interface ListRuntimeCheckpointsResponse {
  success: boolean;
  message: string;
  checkpoints: RuntimeCheckpointData[];
}

/**
 * Response for getting a single checkpoint.
 */
export interface GetRuntimeCheckpointResponse {
  success: boolean;
  message: string;
  checkpoint: RuntimeCheckpointData;
}

/**
 * Response for creating a checkpoint.
 */
export interface CreateRuntimeCheckpointResponse {
  success: boolean;
  message: string;
  checkpoint: RuntimeCheckpointData;
}

// ─── API Functions ─────────────────────────────────────────────────────────

/**
 * List runtime checkpoints, optionally filtered by pod name.
 * @param token - Authentication token
 * @param baseUrl - Base URL for the runtimes API
 * @param podName - Optional pod name filter
 * @returns Promise resolving to list of checkpoints
 */
export const listCheckpoints = async (
  token: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.RUNTIMES,
  podName?: string,
): Promise<ListRuntimeCheckpointsResponse> => {
  validateToken(token);

  const params = podName ? `?pod_name=${encodeURIComponent(podName)}` : '';

  return requestDatalayerAPI<ListRuntimeCheckpointsResponse>({
    url: `${baseUrl}${API_BASE_PATHS.RUNTIMES}/runtime-checkpoints${params}`,
    method: 'GET',
    token,
  });
};

/**
 * Get a single runtime checkpoint by UID.
 * @param token - Authentication token
 * @param checkpointId - The checkpoint UID
 * @param baseUrl - Base URL for the runtimes API
 * @returns Promise resolving to checkpoint details
 */
export const getCheckpoint = async (
  token: string,
  checkpointId: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.RUNTIMES,
): Promise<GetRuntimeCheckpointResponse> => {
  validateToken(token);
  validateRequiredString(checkpointId, 'Checkpoint ID');

  return requestDatalayerAPI<GetRuntimeCheckpointResponse>({
    url: `${baseUrl}${API_BASE_PATHS.RUNTIMES}/runtime-checkpoints/${checkpointId}`,
    method: 'GET',
    token,
  });
};

/**
 * Create a checkpoint record (after a CRIU checkpoint has been taken).
 * @param token - Authentication token
 * @param data - Checkpoint creation payload (pod_name, agentspec, etc.)
 * @param baseUrl - Base URL for the runtimes API
 * @returns Promise resolving to the created checkpoint
 */
export const createCheckpoint = async (
  token: string,
  data: CreateRuntimeCheckpointRequest,
  baseUrl: string = DEFAULT_SERVICE_URLS.RUNTIMES,
): Promise<CreateRuntimeCheckpointResponse> => {
  validateToken(token);

  return requestDatalayerAPI<CreateRuntimeCheckpointResponse>({
    url: `${baseUrl}${API_BASE_PATHS.RUNTIMES}/runtime-checkpoints`,
    method: 'POST',
    token,
    body: data,
  });
};

/**
 * Delete a runtime checkpoint.
 * @param token - Authentication token
 * @param checkpointId - The checkpoint UID to delete
 * @param baseUrl - Base URL for the runtimes API
 * @returns Promise resolving when deletion is complete
 */
export const deleteCheckpoint = async (
  token: string,
  checkpointId: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.RUNTIMES,
): Promise<void> => {
  validateToken(token);
  validateRequiredString(checkpointId, 'Checkpoint ID');

  return requestDatalayerAPI<void>({
    url: `${baseUrl}${API_BASE_PATHS.RUNTIMES}/runtime-checkpoints/${checkpointId}`,
    method: 'DELETE',
    token,
  });
};
