/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

export * from './utils';
export * from './state';
export * from './collaboration';
export * from './services';
// Export navigation before hooks to avoid conflicts
export * from './navigation';
export * from './hooks';

// Export API and SDK layers
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
  DatalayerClient,
  type DatalayerClientConfig,
  type SDKHandlers,
  // Export SDK models
  User,
  Runtime,
  Environment,
  Snapshot,
  Space,
  Notebook,
  LexicalDTO,
  Credits,
  Item,
  // Export typed interfaces for stable contracts
  type RuntimeJSON,
  type EnvironmentJSON,
  type UserJSON,
} from './client';

// Export commonly used SDK functions directly for convenience
export {
  getEnvironments,
  createRuntime,
  getRuntimes,
  deleteRuntime,
  snapshotRuntime,
  getRuntimeSnapshots,
  loadRuntimeSnapshot,
} from './stateful/runtimes/actions';

export * from './ChatComponent';
