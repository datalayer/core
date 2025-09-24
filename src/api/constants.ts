/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * API base paths for different service domains
 */
export const API_BASE_PATHS = {
  IAM: '/api/iam/v1',
  RUNTIMES: '/api/runtimes/v1',
  SPACER: '/api/spacer/v1',
} as const;

/**
 * Default service URLs for the Datalayer platform
 */
export const DEFAULT_SERVICE_URLS = {
  /** Default URL for IAM (Identity and Access Management) service */
  IAM: 'https://prod1.datalayer.run',
  /** Default URL for Runtimes service */
  RUNTIMES: 'https://prod1.datalayer.run',
  /** Default URL for Spacer (workspaces and collaboration) service */
  SPACER: 'https://prod1.datalayer.run',
} as const;
