/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

// Export core components and utilities
export * from './components';
export * from './utils';
export * from './state';
export * from './collaboration';
export * from './services';

// Export navigation before hooks to avoid conflicts
export * from './navigation';
export * from './hooks';

// Export Theme.
export * from './theme';

// Export APIs.
export {
  requestDatalayerAPI,
  RunResponseError,
  NetworkError,
} from './api/DatalayerApi';
export type { IRequestDatalayerAPIOptions } from './api/DatalayerApi';
export { API_BASE_PATHS } from './api/constants';
export * as runtimesApi from './api/runtimes';
export * as iamApi from './api/iam';
export * as spacerApi from './api/spacer';

export {
  // Export client and config types
  DatalayerClient,
  type DatalayerClientConfig,
  type SDKHandlers,
  // Export domain models
  User,
  Runtime,
  Environment,
  Snapshot,
  Space,
  Notebook,
  LexicalDTO,
  Credits,
  Item,
  // Export typed domain interfaces for stable contracts
  type RuntimeJSON,
  type EnvironmentJSON,
  type UserJSON,
} from './client';

// Export commonly used functions directly for convenience
export {
  getEnvironments,
  createRuntime,
  getRuntimes,
  deleteRuntime,
  snapshotRuntime,
  getRuntimeSnapshots,
  loadRuntimeSnapshot,
} from './stateful/runtimes/actions';
