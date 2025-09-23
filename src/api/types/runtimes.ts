/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Represents a computing environment available in the Datalayer platform
 * @interface Environment
 */
export interface Environment {
  /** Unique identifier name for the environment */
  name: string;
  /** Human-readable title for the environment */
  title: string;
  /** Detailed description of the environment */
  description: string;
  /** Docker image used for this environment */
  image: string;
  /** Whether this environment supports GPU acceleration */
  gpu: boolean;
  /** CPU limit in cores */
  cpu_limit: number;
  /** Memory limit (e.g., "4Gi", "8Gi") */
  memory_limit: string;
  /** Disk storage limit (e.g., "10Gi", "20Gi") */
  disk_limit: string;
  /** Icon identifier or URL for UI display */
  icon?: string;
  /** Tags for categorizing the environment */
  tags?: string[];
  /** Credits consumed per hour when running */
  burning_rate?: number;
  /** Additional resource specifications */
  resources?: any;
}

/**
 * Represents a running instance of a computing environment
 * @interface Runtime
 */
export interface Runtime {
  /** Kubernetes pod name for the runtime instance */
  pod_name: string;
  /** Unique identifier for the runtime */
  uid?: string;
  /** Name of the environment this runtime is based on */
  environment_name: string;
  /** Title of the environment for display */
  environment_title?: string;
  /** Credits allocated to this runtime */
  credits?: number;
  /** Current state of the runtime */
  state?: 'starting' | 'running' | 'stopping' | 'stopped' | 'error';
  /** Type of runtime (deprecated, use runtime_type) */
  type?: 'notebook' | 'cell';
  /** Type of runtime - notebook for full notebooks, cell for individual cells */
  runtime_type?: 'notebook' | 'cell';
  /** Credits consumed per hour */
  burning_rate?: number;
  /** User-friendly name for the runtime */
  given_name?: string;
  /** Authentication token for accessing the runtime */
  token?: string;
  /** Ingress URL for accessing the runtime */
  ingress?: string;
  /** Reservation ID if runtime is reserved */
  reservation_id?: string;
  /** ISO 8601 timestamp of when the runtime started */
  started_at?: string;
  /** ISO 8601 timestamp of when the runtime will expire */
  expired_at?: string;
  /** ISO 8601 timestamp of when the runtime was created */
  created_at?: string;
  /** ISO 8601 timestamp of last update */
  updated_at?: string;
  /** Jupyter kernel ID if applicable */
  kernel_id?: string;
  /** Path to the notebook file if runtime is for a notebook */
  notebook_path?: string;
  /** Cell ID if runtime is for a specific cell */
  cell_id?: string;
  /** URL for accessing Jupyter server */
  jupyter_url?: string;
  /** Token for Jupyter server authentication */
  jupyter_token?: string;
  /** Detailed status information */
  status?: RuntimeStatus;
}

/**
 * Detailed status information for a runtime
 * @interface RuntimeStatus
 */
export interface RuntimeStatus {
  /** Current phase of the runtime pod */
  phase: string;
  /** Array of runtime conditions */
  conditions?: Array<{
    type: string;
    status: string;
    reason?: string;
    message?: string;
  }>;
  /** Array of container status information */
  container_statuses?: Array<{
    name: string;
    state: Record<string, any>;
    ready: boolean;
    restart_count: number;
  }>;
}

/**
 * Request payload for creating a new runtime
 * @interface CreateRuntimeRequest
 */
export interface CreateRuntimeRequest {
  /** Name of the environment to use */
  environment_name: string;
  /** Maximum credits this runtime can consume */
  credits_limit: number;
  /** Optional path to notebook file */
  notebook_path?: string;
  /** Optional cell ID for cell-specific runtimes */
  cell_id?: string;
}

/**
 * Represents a snapshot of a runtime's state and files
 * @interface RuntimeSnapshot
 */
export interface RuntimeSnapshot {
  /** Unique identifier for the snapshot */
  id: string;
  /** Name of the snapshot */
  name: string;
  /** Optional description of the snapshot */
  description?: string;
  /** ID of the runtime this snapshot was created from */
  runtime_id: string;
  /** Name of the environment used by the runtime */
  environment_name: string;
  /** ISO 8601 timestamp when the snapshot was created */
  created_at: string;
  /** Size of the snapshot in bytes */
  size?: number;
  /** List of files included in the snapshot */
  files?: RuntimeSnapshotFile[];
}

/**
 * Represents a file within a runtime snapshot
 * @interface RuntimeSnapshotFile
 */
export interface RuntimeSnapshotFile {
  /** File path relative to the runtime root */
  path: string;
  /** File size in bytes */
  size: number;
  /** ISO 8601 timestamp of last modification */
  modified: string;
  /** File content (for text files) */
  content?: string;
}

/**
 * Request payload for creating a runtime snapshot
 * @interface CreateRuntimeSnapshotRequest
 */
export interface CreateRuntimeSnapshotRequest {
  /** ID of the runtime to snapshot */
  runtime_id: string;
  /** Name for the snapshot */
  name: string;
  /** Optional description of the snapshot */
  description?: string;
  /** Optional list of file paths to include */
  files?: string[];
}

/**
 * Request payload for loading a runtime snapshot
 * @interface LoadRuntimeSnapshotRequest
 */
export interface LoadRuntimeSnapshotRequest {
  /** ID of the snapshot to load */
  snapshot_id: string;
  /** ID of the runtime to load the snapshot into */
  runtime_id: string;
  /** Whether to overwrite existing files */
  overwrite?: boolean;
}

/**
 * Query parameters for listing runtimes
 * @interface RuntimesListParams
 */
export interface RuntimesListParams {
  /** Filter by environment name */
  environment_name?: string;
  /** Filter by runtime state */
  state?: Runtime['state'];
  /** Filter by runtime type */
  runtime_type?: Runtime['runtime_type'];
  /** Maximum number of results to return */
  limit?: number;
  /** Number of results to skip for pagination */
  offset?: number;
}

/**
 * Query parameters for listing runtime snapshots
 * @interface RuntimeSnapshotsListParams
 */
export interface RuntimeSnapshotsListParams {
  /** Filter snapshots by runtime ID */
  runtime_id?: string;
  /** Filter by environment name */
  environment_name?: string;
  /** Maximum number of results to return */
  limit?: number;
  /** Number of results to skip for pagination */
  offset?: number;
}

// API Response types that match actual server responses
/**
 * Response from listing available environments
 * @interface EnvironmentsListResponse
 */
export interface EnvironmentsListResponse {
  /** Whether the request was successful */
  success: boolean;
  /** Response message from the server */
  message: string;
  /** Array of available environments */
  environments: Environment[];
}

/**
 * Response from creating a new runtime
 * @interface RuntimeCreateResponse
 */
export interface RuntimeCreateResponse {
  /** Whether the request was successful */
  success: boolean;
  /** Response message from the server */
  message: string;
  /** The created runtime instance */
  runtime: Runtime;
}

/**
 * Response from listing runtimes
 * @interface RuntimesListResponse
 */
export interface RuntimesListResponse {
  /** Whether the request was successful */
  success: boolean;
  /** Response message from the server */
  message: string;
  /** Array of runtime instances */
  runtimes: Runtime[];
}

/**
 * Response from listing runtime snapshots
 * @interface RuntimeSnapshotsListResponse
 */
export interface RuntimeSnapshotsListResponse {
  /** Whether the request was successful */
  success: boolean;
  /** Response message from the server */
  message: string;
  /** Array of runtime snapshots */
  snapshots: RuntimeSnapshot[];
}
