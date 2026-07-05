/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Base scope: the runtime/agent/scheduler foundation that lives inside
 * `@datalayer/core` but conceptually belongs to the runtimes domain.
 *
 * This subfolder groups the constructs (models, HTTP API layer, client mixin,
 * stateful actions and Zustand substate) that are consumed by the higher-level
 * runtime UI packages (`@datalayer/agent-runtimes`, `datalayer-ui`, the VS Code
 * extension and the examples) so that the boundary of the shared base is easy
 * to identify.
 *
 * @module @datalayer/core/base
 */

export * as baseModels from './models';
export * as runtimesApi from './api/runtimes';
export * as schedulerApi from './api/scheduler';
export { RuntimesMixin } from './client/mixins/RuntimesMixin';
export * as runtimesActions from './stateful/runtimes';
export * as runtimesState from './state/substates/RuntimesState';
