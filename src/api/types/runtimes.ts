/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Represents a computing environment available in the Datalayer platform
 * @interface Environment
 */
export interface Environment {
  /** Human-readable title for the environment */
  title: string;
  /** Detailed description of the environment */
  description: string;
  /** Docker image used for this environment */
  dockerImage: string;
  /** Example usage or description */
  example?: string;
  /** Code snippets for this environment */
  snippets?: any[]; // Simplified - EnvironmentSnippet type removed
  /** Content mounts for this environment */
  contents?: any[]; // Simplified - EnvironmentContent type removed
  /** Kernel configuration */
  kernel?: {
    /** Template for kernel naming */
    givenNameTemplate?: string;
  };
  /** Programming language (e.g., "python", "r") */
  language: string;
  /** Resource ranges configuration */
  resourcesRanges?: any; // Simplified - ResourceRanges type removed
  /** Credits consumed per hour when running */
  burning_rate: number;
  /** Simple resource specification */
  resources?: any; // Simplified - ResourceConfig type removed
  /** Name identifier for the environment */
  name?: string;
  /** Docker registry for the image */
  dockerRegistry?: string;
  /** Icon or avatar URL for the environment */
  icon?: string;
  /** Whether the environment is enabled */
  enabled?: boolean;
  /** Tags associated with the environment */
  tags?: string[];
}

/**
 * Represents a running instance of a computing environment
 * @interface Runtime
 */
export interface Runtime {
  /** Kubernetes pod name for the runtime instance */
  pod_name: string;
  /** Unique identifier for the runtime */
  uid: string;
  /** Name of the environment this runtime is based on */
  environment_name: string;
  /** Title of the environment for display */
  environment_title?: string;
  /** Credits allocated to this runtime */
  credits?: number;
  /** Current state of the runtime */
  state?: 'starting' | 'running' | 'stopping' | 'stopped' | 'error';
  /** Type of runtime - notebook, terminal, or job */
  type?: 'notebook' | 'terminal' | 'job';
  /** Type of runtime (deprecated, use type) */
  runtime_type?: 'notebook' | 'cell';
  /** Credits consumed per hour */
  burning_rate: number;
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
  status?: any; // Simplified - RuntimeStatus type removed
  /** Alternative naming from API responses */
  podName?: string;
  /** Alternative naming from API responses */
  createdAt?: string;
  /** Alternative naming from API responses */
  environment?: string;
}

/**
 * Request payload for creating a new runtime
 * @interface CreateRuntimeRequest
 */
export interface CreateRuntimeRequest {
  /** Name of the environment to use */
  environment_name: string;
  /** Type of runtime (e.g., 'notebook', 'terminal', 'job') */
  type?: 'notebook' | 'terminal' | 'job';
  /** Optional given name for the runtime */
  given_name?: string;
  /** Maximum credits this runtime can consume */
  credits_limit?: number;
  /** Optional capabilities for the runtime */
  capabilities?: string[];
  /** Optional source to create runtime from (e.g., snapshot ID) */
  from?: string;
}

/**
 * Represents a snapshot of a runtime's state and files
 * @interface RuntimeSnapshot
 */
export interface RuntimeSnapshot {
  /** Unique identifier for the snapshot */
  uid: string;
  /** Name of the snapshot */
  name: string;
  /** Optional description of the snapshot */
  description?: string;
  /** Name of the environment used by the runtime */
  environment: string;
  /** Metadata associated with the snapshot */
  metadata?: {
    version?: string;
    language_info?: any;
    [key: string]: any;
  };
  /** Size of the snapshot in bytes */
  size?: number;
  /** Format of the snapshot */
  format?: string;
  /** Format version of the snapshot */
  format_version?: string;
  /** Status of the snapshot */
  status?: string;
  /** ISO 8601 timestamp when the snapshot was last updated */
  updated_at: string;
  /** List of files included in the snapshot */
  files?: any[]; // Simplified - RuntimeSnapshotFile type removed
}

/**
 * Request payload for creating a runtime snapshot
 * @interface CreateRuntimeSnapshotRequest
 */
export interface CreateRuntimeSnapshotRequest {
  /** Pod name of the runtime to snapshot */
  pod_name: string;
  /** Name for the snapshot */
  name: string;
  /** Description of the snapshot */
  description: string;
  /** Whether to stop the runtime after creating snapshot */
  stop: boolean;
}

/**
 * Response for getting a specific runtime snapshot
 * @interface SnapshotGetResponse
 */
export interface SnapshotGetResponse {
  /** Indicates if the request was successful */
  success: boolean;
  /** Response message */
  message: string;
  /** The snapshot details */
  snapshot: RuntimeSnapshot;
}

/**
 * Response for creating a runtime snapshot
 * @interface SnapshotCreateResponse
 */
export interface SnapshotCreateResponse {
  /** Indicates if the request was successful */
  success: boolean;
  /** Response message */
  message: string;
  /** The created snapshot details */
  snapshot: RuntimeSnapshot;
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
export interface CreateRuntimeResponse {
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
export interface SnapshotsListResponse {
  /** Whether the request was successful */
  success: boolean;
  /** Response message from the server */
  message: string;
  /** Array of runtime snapshots */
  snapshots: RuntimeSnapshot[];
}
