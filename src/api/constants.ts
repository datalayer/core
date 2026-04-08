/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * API base paths for different service domains
 */
export const API_BASE_PATHS = {
  AI_AGENTS: '/api/ai-agents/v1',
  IAM: '/api/iam/v1',
  OTEL: '/api/otel/v1',
  RUNTIMES: '/api/runtimes/v1',
  SPACER: '/api/spacer/v1',
} as const;

/**
 * Default service URLs for the Datalayer platform
 */
export const DEFAULT_SERVICE_URLS = {
  /** Default URL for AI Agents (durable agent management) service */
  AI_AGENTS: 'https://prod1.datalayer.run',
  /** Default URL for IAM (Identity and Access Management) service */
  IAM: 'https://prod1.datalayer.run',
  /** Default URL for OTEL (OpenTelemetry observability) service */
  OTEL: 'https://prod1.datalayer.run',
  /** Default URL for Runtimes service */
  RUNTIMES: 'https://r1.datalayer.run',
  /** Default URL for Spacer (workspaces and collaboration) service */
  SPACER: 'https://prod1.datalayer.run',
} as const;
