/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

export interface Environment {
  name: string;
  title: string;
  description: string;
  image: string;
  gpu: boolean;
  cpu_limit: number;
  memory_limit: string;
  disk_limit: string;
  icon?: string;
  tags?: string[];
  burning_rate?: number;
  resources?: any;
}

export interface Runtime {
  pod_name: string;
  uid?: string;
  environment_name: string;
  environment_title?: string;
  credits?: number;
  state?: 'starting' | 'running' | 'stopping' | 'stopped' | 'error';
  type?: 'notebook' | 'cell';
  runtime_type?: 'notebook' | 'cell';
  burning_rate?: number;
  given_name?: string;
  token?: string;
  ingress?: string;
  reservation_id?: string;
  started_at?: string;
  expired_at?: string;
  created_at?: string;
  updated_at?: string;
  kernel_id?: string;
  notebook_path?: string;
  cell_id?: string;
  jupyter_url?: string;
  jupyter_token?: string;
  status?: RuntimeStatus;
}

export interface RuntimeStatus {
  phase: string;
  conditions?: Array<{
    type: string;
    status: string;
    reason?: string;
    message?: string;
  }>;
  container_statuses?: Array<{
    name: string;
    state: Record<string, any>;
    ready: boolean;
    restart_count: number;
  }>;
}

export interface CreateRuntimeRequest {
  environment_name: string;
  credits_limit: number;
  notebook_path?: string;
  cell_id?: string;
}

export interface RuntimeSnapshot {
  id: string;
  name: string;
  description?: string;
  runtime_id: string;
  environment_name: string;
  created_at: string;
  size?: number;
  files?: RuntimeSnapshotFile[];
}

export interface RuntimeSnapshotFile {
  path: string;
  size: number;
  modified: string;
  content?: string;
}

export interface CreateRuntimeSnapshotRequest {
  runtime_id: string;
  name: string;
  description?: string;
  files?: string[];
}

export interface LoadRuntimeSnapshotRequest {
  snapshot_id: string;
  runtime_id: string;
  overwrite?: boolean;
}

export interface RuntimesListParams {
  environment_name?: string;
  state?: Runtime['state'];
  runtime_type?: Runtime['runtime_type'];
  limit?: number;
  offset?: number;
}

export interface RuntimeSnapshotsListParams {
  runtime_id?: string;
  environment_name?: string;
  limit?: number;
  offset?: number;
}

// API Response types that match actual server responses
export interface EnvironmentsListResponse {
  success: boolean;
  message: string;
  environments: Environment[];
}

export interface RuntimeCreateResponse {
  success: boolean;
  message: string;
  runtime: Runtime;
}

export interface RuntimesListResponse {
  success: boolean;
  message: string;
  runtimes: Runtime[];
}

export interface RuntimeSnapshotsListResponse {
  success: boolean;
  message: string;
  snapshots: RuntimeSnapshot[];
}
