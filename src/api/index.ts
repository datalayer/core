/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Minimal API layer for the Datalayer platform providing base HTTP client and functional API methods.
 *
 * This module contains the low-level API functionality. For high-level object-oriented
 * Client classes, use @datalayer/core/client instead.
 *
 * @module @datalayer/core/api
 */

// Base client exports
export {
  requestDatalayerAPI,
  requestDatalayerAPIWithResponse,
  RunResponseError,
  NetworkError,
  TokenExpiredError,
} from './DatalayerApi';
export type { IRequestDatalayerAPIOptions } from './DatalayerApi';
export type { IDatalayerAPIResponse } from './DatalayerApi';

// Domain-organized API exports
export * as iam from './iam';
export * as contents from './contents';
export * as evals from './evals';
export * as mcp from './mcp';
export * as orchestration from './orchestration';
export * as otel from './otel';
export * as scheduler from './scheduler';
export * as spacer from './spacer';
export * from '../api/DatalayerApi';
