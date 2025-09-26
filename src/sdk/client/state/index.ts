/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * @module sdk/client/state
 * @description State management exports for the Datalayer SDK.
 */

export { IAMState } from './IAMState';
export {
  RuntimesState,
  RuntimeStatus,
  type StoredRuntime,
  type StoredEnvironment,
  type StoredSnapshot,
} from './RuntimesState';
export {
  SpacerState,
  SpaceVisibility,
  type StoredSpace,
  type StoredNotebook,
  type StoredLexical,
} from './SpacerState';
