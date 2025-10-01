/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Minimal API layer for the Datalayer platform providing base HTTP client and functional API methods.
 *
 * This module contains the low-level API functionality. For high-level object-oriented
 * SDK classes, use @datalayer/core/sdk instead.
 *
 * @module @datalayer/core/api
 */

// Base client exports
export {
  requestDatalayerAPI,
  RunResponseError,
  NetworkError,
} from './DatalayerApi';
export type { IRequestDatalayerAPIOptions } from './DatalayerApi';

// Type exports
export * from './types';

// Domain-organized API exports
export * as iam from './iam';
export * as runtimes from './runtimes';
export * as spacer from './spacer';

/**
 * @deprecated Please import directly from '@datalayer/core/stateful' instead.
 * This module provides backward compatibility for the moved apiv1 modules.
 */

export * from '../stateful/jupyter';
export * from '../stateful/runtimes';
export * from '../api/DatalayerApi';
