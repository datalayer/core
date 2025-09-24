/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * @module sdk
 * @description Main SDK entry point for the Datalayer platform.
 *
 * This module provides the unified DatalayerSDK class with a flat, intuitive API
 * for all Datalayer platform services. The SDK uses TypeScript mixins to provide
 * excellent discoverability and ease of use.
 *
 * @example
 * ```typescript
 * import { DatalayerSDK } from '@datalayer/core/sdk';
 *
 * const sdk = new DatalayerSDK({
 *   token: 'your-api-token',
 *   baseUrl: 'https://prod1.datalayer.run'
 * });
 *
 * // Flat, intuitive API - all methods directly accessible
 * const user = await sdk.whoami();
 * const environments = await sdk.listEnvironments();
 * const runtime = await sdk.createRuntime(config);
 * const notebook = await sdk.createNotebook(data);
 * ```
 */

// Export the main SDK class with flat API
export { DatalayerSDK, type DatalayerSDKConfig } from './client';

// Export stateful modules for advanced use cases
export * from './stateful';
