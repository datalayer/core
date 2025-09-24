/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * @module types
 * @description TypeScript type definitions for all Datalayer API services.
 *
 * This module consolidates all type definitions used by the SDK, providing
 * comprehensive TypeScript support for requests, responses, and data models
 * across all Datalayer services.
 *
 * These types follow the exact backend API format (snake_case naming) to
 * ensure compatibility. For frontend business logic types with camelCase
 * naming, see the models in `/src/models/`.
 *
 * @example
 * ```typescript
 * import type {
 *   Runtime,
 *   Environment,
 *   Space,
 *   Notebook,
 *   User,
 *   LoginRequest
 * } from '@datalayer/core/api/types';
 *
 * // Use types for function parameters and return values
 * function createRuntime(config: CreateRuntimeRequest): Promise<Runtime> {
 *   // Implementation
 * }
 * ```
 */

export * from './runtimes';
export * from './iam';
export * from './spacer';
