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
} from './DatalayerApi';
export type { IRequestDatalayerAPIOptions } from './DatalayerApi';
export type { IDatalayerAPIResponse } from './DatalayerApi';

// Domain-organized API exports
export * as iam from './iam';
export * as contents from './contents';
export * as mcp from './mcp';
export * as otel from './otel';
export * from '../api/DatalayerApi';
