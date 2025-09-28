/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Main Datalayer SDK client with intuitive mixin-based API.
 * Provides unified, flat API for all Datalayer platform services through TypeScript mixins.
 *
 * @module sdk/client
 *
 * @example
 * ```typescript
 * const sdk = new DatalayerSDK({
 *   token: 'your-api-token'
 * });
 *
 * const user = await sdk.whoami();
 * const runtime = await sdk.createRuntime(config);
 * ```
 */

import {
  DatalayerSDKBase,
  type DatalayerSDKConfig,
  type SDKHandlers,
} from './base';
import { IAMMixin } from './mixins/IAMMixin';
import { RuntimesMixin } from './mixins/RuntimesMixin';
import { SpacerMixin } from './mixins/SpacerMixin';

/**
 * Helper function to compose mixins in a more readable way.
 * Applies mixins in the order provided.
 *
 * @param mixins - Array of mixin functions to apply
 * @returns The composed class with all mixins applied
 */
function composeMixins(...mixins: Array<(base: any) => any>) {
  return mixins.reduce((base, mixin) => mixin(base), DatalayerSDKBase);
}

// Apply mixins to the base class using the helper
const DatalayerSDKWithMixins = composeMixins(
  IAMMixin,
  RuntimesMixin,
  SpacerMixin,
);

/**
 * Main Datalayer SDK client providing unified access to all platform services.
 * Uses TypeScript mixins to provide a flat, discoverable API.
 *
 * @example
 * ```typescript
 * const sdk = new DatalayerSDK({
 *   token: 'your-token'
 * });
 *
 * const user = await sdk.whoami();
 * const runtime = await sdk.createRuntime({
 *   environment_name: 'python-cpu-env',
 *   credits_limit: 100
 * });
 * ```
 */
export class DatalayerSDK extends DatalayerSDKWithMixins {
  /**
   * Create a DatalayerSDK instance.
   *
   * @param config - SDK configuration options
   */
  constructor(config: DatalayerSDKConfig) {
    super(config);

    // Wrap all methods with handlers if configured
    this.wrapAllMethods();
  }
}

// Export configuration interface and base for extensibility
export type { DatalayerSDKConfig, SDKHandlers };
export { DatalayerSDKBase };

// Export models for use by consumers
export { User } from './models/User';
export type { AuthProvider } from './models/User';

// Interface declaration for TypeScript to recognize mixin methods
export interface DatalayerSDK {
  // IAM Methods
  whoami(): Promise<any>;
  login(credentials: any): Promise<any>;
  logout(): Promise<void>;
  getCredits(): Promise<any>;
  checkIAMHealth(): Promise<any>;

  // Runtime Methods
  listEnvironments(): Promise<any[]>;
  ensureRuntime(options?: any): Promise<any>;
  createRuntime(config: any): Promise<any>;
  listRuntimes(): Promise<any[]>;
  getRuntime(podNameOrRuntime: string | any): Promise<any>;
  deleteRuntime(podNameOrRuntime: string | any): Promise<void>;
  createSnapshot(data: any): Promise<any>;
  listSnapshots(): Promise<any[]>;
  getSnapshot(idOrSnapshot: string | any): Promise<any>;
  deleteSnapshot(idOrSnapshot: string | any): Promise<void>;
  checkRuntimesHealth(): Promise<any>;

  // Spacer Methods
  getMySpaces(): Promise<any[]>;
  createSpace(data: any): Promise<any>;
  createNotebook(data: any): Promise<any>;
  getNotebook(idOrNotebook: string | any): Promise<any>;
  updateNotebook(idOrNotebook: string | any, data: any): Promise<any>;
  createLexical(data: any): Promise<any>;
  getLexical(idOrLexical: string | any): Promise<any>;
  updateLexical(idOrLexical: string | any, data: any): Promise<any>;
  getSpaceItems(spaceId: string): Promise<any>;
  deleteSpaceItem(itemId: string): Promise<any>;
  getNotebookContent(
    notebookIdOrInstance: string | any,
    options?: any,
  ): Promise<any>;
  getLexicalContent(
    lexicalIdOrInstance: string | any,
    options?: any,
  ): Promise<any>;
  prefetchContent(
    itemIds: string[],
    itemType?: 'notebook' | 'lexical',
  ): Promise<void>;
  clearContentCache(
    itemId?: string,
    itemType?: 'notebook' | 'lexical',
  ): Promise<void>;
  createNotebooks(requests: any[]): Promise<any[]>;
  getNotebooks(notebookIds: string[]): Promise<any[]>;
  updateNotebooks(updates: any[]): Promise<any[]>;
  deleteSpaceItems(itemIds: string[]): Promise<void>;
  createLexicals(requests: any[]): Promise<any[]>;
  getLexicals(lexicalIds: string[]): Promise<any[]>;
  updateLexicals(updates: any[]): Promise<any[]>;
  checkSpacerHealth(): Promise<any>;
}
