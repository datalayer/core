/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * @module sdk/client/models
 * @description Domain model classes for the Datalayer SDK.
 *
 * These models provide rich, object-oriented interfaces for working with
 * Datalayer platform resources, wrapping API responses with convenient
 * methods and automatic state management.
 *
 * @example
 * ```typescript
 * import { Runtime, Snapshot, Notebook, Lexical, Space } from '@datalayer/core/sdk/client/models';
 *
 * // Models are typically created by SDK methods
 * const runtime = await sdk.createRuntime(config);
 * const snapshot = await runtime.createSnapshot('checkpoint');
 * const notebook = await sdk.createNotebook(formData);
 * const lexical = await sdk.createLexical(formData);
 * const space = await sdk.createSpace(config);
 * ```
 */

// Export domain model classes
export { Item } from './Item';
export { Runtime } from './Runtime';
export { Snapshot } from './Snapshot';
export { Notebook } from './Notebook';
export { Lexical } from './Lexical';
export { Cell } from './Cell';
export { Space } from './Space';

// Export associated types for convenience
export type { RuntimeData } from './Runtime';
export type { RuntimeSnapshot } from './Snapshot';
export type { NotebookData } from './Notebook';
export type { LexicalData } from './Lexical';
export type { SpaceData } from './Space';
