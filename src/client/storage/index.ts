/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * @module client/storage
 * @description Platform storage exports for the Datalayer SDK.
 */

export {
  PlatformStorage,
  StorageKeys,
  STORAGE_NAMESPACE,
  createStorageKey,
  parseStoredData,
  stringifyForStorage,
} from './PlatformStorage';

export { BrowserStorage, type BrowserStorageOptions } from './BrowserStorage';
export {
  NodeStorage,
  SimpleNodeStorage,
  type NodeStorageOptions,
} from './NodeStorage';
export {
  ElectronStorage,
  type ElectronStorageOptions,
} from './ElectronStorage';
