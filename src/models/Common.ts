/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Common types shared across all Datalayer API services.
 *
 * @module api/types/common
 */

/**
 * Standard health check response used by all services.
 * @interface HealthzPingResponse
 */
export interface HealthzPingResponse {
  /** Whether the request was successful */
  success: boolean;
  /** Response message from the server */
  message: string;
  /** Service status information */
  status?: {
    /** Status indicator (e.g., "OK") */
    status: string;
  };
  /** API version */
  version?: string;
}

/**
 * Standard error response structure.
 * @interface ErrorResponse
 */
export interface ErrorResponse {
  /** Whether the request was successful (always false for errors) */
  success: false;
  /** Error message */
  message: string;
  /** Optional error code */
  code?: string;
  /** Optional additional error details */
  details?: any;
}

/**
 * Standard pagination parameters.
 * @interface PaginationParams
 */
export interface PaginationParams {
  /** Page number (1-based) */
  page?: number;
  /** Items per page */
  limit?: number;
  /** Sort field */
  sort?: string;
  /** Sort order */
  order?: 'asc' | 'desc';
}

/**
 * Standard pagination response metadata.
 * @interface PaginationMeta
 */
export interface PaginationMeta {
  /** Current page */
  page: number;
  /** Items per page */
  limit: number;
  /** Total number of items */
  total: number;
  /** Total number of pages */
  totalPages: number;
}
