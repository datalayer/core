/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { ApiClient, ApiResponse } from '../../base/client';
import { handleRuntimesApiCall } from '../../utils/error-handling';
import {
  Environment,
  Runtime,
  CreateRuntimeRequest,
  RuntimeSnapshot,
  CreateRuntimeSnapshotRequest,
  LoadRuntimeSnapshotRequest,
  RuntimesListParams,
  RuntimeSnapshotsListParams,
  EnvironmentsListResponse,
  RuntimeCreateResponse,
  RuntimesListResponse,
  RuntimeSnapshotsListResponse,
} from '../../types/runtimes';

const BASE_PATH = '/api/runtimes/v1';

export const environmentsApi = {
  list: async (
    client: ApiClient,
  ): Promise<ApiResponse<EnvironmentsListResponse>> => {
    return handleRuntimesApiCall(
      () => client.get(`${BASE_PATH}/environments`),
      'list environments',
      { success: true, message: 'Empty list', environments: [] },
    );
  },

  get: async (
    client: ApiClient,
    name: string,
  ): Promise<ApiResponse<Environment>> => {
    return handleRuntimesApiCall(
      () => client.get(`${BASE_PATH}/environments/${name}`),
      `get environment ${name}`,
    );
  },
};

export const runtimesApi = {
  create: async (
    client: ApiClient,
    data: CreateRuntimeRequest,
  ): Promise<ApiResponse<RuntimeCreateResponse>> => {
    return handleRuntimesApiCall(
      () => client.post(`${BASE_PATH}/runtimes`, data),
      'create runtime',
    );
  },

  list: async (
    client: ApiClient,
    params?: RuntimesListParams,
  ): Promise<ApiResponse<RuntimesListResponse>> => {
    return handleRuntimesApiCall(
      () => client.get(`${BASE_PATH}/runtimes`, { params }),
      'list runtimes',
      { success: true, message: 'Empty list', runtimes: [] },
    );
  },

  get: async (
    client: ApiClient,
    podName: string,
  ): Promise<ApiResponse<Runtime>> => {
    return client.get(`${BASE_PATH}/runtimes/${podName}`);
  },

  delete: async (
    client: ApiClient,
    podName: string,
  ): Promise<ApiResponse<void>> => {
    return client.delete(`${BASE_PATH}/runtimes/${podName}`);
  },

  setState: async (
    client: ApiClient,
    podName: string,
    state: Runtime['state'],
  ): Promise<ApiResponse<Runtime>> => {
    return client.put(`${BASE_PATH}/runtimes/${podName}`, { state });
  },

  getStatus: async (
    client: ApiClient,
    podName: string,
  ): Promise<ApiResponse<Runtime>> => {
    return client.get(`${BASE_PATH}/runtimes/${podName}/status`);
  },
};

export const runtimeSnapshotsApi = {
  create: async (
    client: ApiClient,
    data: CreateRuntimeSnapshotRequest,
  ): Promise<ApiResponse<RuntimeSnapshot>> => {
    return client.post(`${BASE_PATH}/runtime-snapshots`, data);
  },

  list: async (
    client: ApiClient,
    params?: RuntimeSnapshotsListParams,
  ): Promise<ApiResponse<RuntimeSnapshotsListResponse>> => {
    return client.get(`${BASE_PATH}/runtime-snapshots`, { params });
  },

  get: async (
    client: ApiClient,
    snapshotId: string,
  ): Promise<ApiResponse<RuntimeSnapshot>> => {
    return client.get(`${BASE_PATH}/runtime-snapshots/${snapshotId}`);
  },

  delete: async (
    client: ApiClient,
    snapshotId: string,
  ): Promise<ApiResponse<void>> => {
    return client.delete(`${BASE_PATH}/runtime-snapshots/${snapshotId}`);
  },

  load: async (
    client: ApiClient,
    data: LoadRuntimeSnapshotRequest,
  ): Promise<ApiResponse<void>> => {
    return client.post(`${BASE_PATH}/runtime-snapshots/load`, data);
  },

  download: async (
    client: ApiClient,
    snapshotId: string,
  ): Promise<ApiResponse<Blob>> => {
    return client.get(`${BASE_PATH}/runtime-snapshots/${snapshotId}/download`, {
      headers: { Accept: 'application/octet-stream' },
    });
  },

  upload: async (
    client: ApiClient,
    file: File,
    metadata?: Partial<RuntimeSnapshot>,
  ): Promise<ApiResponse<RuntimeSnapshot>> => {
    const formData = new FormData();
    formData.append('file', file);
    if (metadata) {
      formData.append('metadata', JSON.stringify(metadata));
    }

    return client.post(`${BASE_PATH}/runtime-snapshots/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};
