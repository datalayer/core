/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Domain model classes for the Datalayer SDK.
 * These models wrap API responses with convenient methods and state management.
 *
 * @module client/models
 *
 * @example
 * ```typescript
 * const runtime = await sdk.createRuntime(config);
 * const snapshot = await runtime.createSnapshot('checkpoint');
 * ```
 */

// Export domain model classes
export { Environment } from './Environment';
export { Item } from './Item';
export { Runtime } from './Runtime';
export { Snapshot } from './Snapshot';
export { Notebook } from './Notebook';
export { Lexical } from './Lexical';
export { Space } from './Space';
export { Credits } from './Credits';

// Export only the stable interfaces, not raw API types
export type { EnvironmentJSON } from './Environment';
export type { RuntimeJSON } from './Runtime';
export type { SnapshotJSON } from './Snapshot';
export type { SpaceJSON } from './Space';
export type { NotebookJSON } from './Notebook';
export type { LexicalJSON } from './Lexical';
