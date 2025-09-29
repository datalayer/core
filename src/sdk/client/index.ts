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
export { Runtime } from './models/Runtime';
export type { RuntimeJSON } from './models/Runtime';
export { Environment } from './models/Environment';
export type { EnvironmentJSON } from './models/Environment';
export { Snapshot } from './models/Snapshot';
export { Space } from './models/Space';
export { Notebook } from './models/Notebook';
export { Lexical } from './models/Lexical';
export { Credits } from './models/Credits';
export { Item } from './models/Item';

// Export constants
export { ItemTypes } from './constants';
export type { ItemType } from './constants';

// Interface declaration for TypeScript to recognize mixin methods
export interface DatalayerSDK {
  // IAM Methods
  whoami(): Promise<any>;
  login(token: string): Promise<any>;
  logout(): Promise<void>;
  getCredits(): Promise<any>;
  checkIAMHealth(): Promise<any>;

  // Runtime Methods
  listEnvironments(): Promise<any[]>;
  ensureRuntime(
    environmentName?: string,
    creditsLimit?: number,
    waitForReady?: boolean,
    maxWaitTime?: number,
    reuseExisting?: boolean,
    snapshotId?: string,
  ): Promise<any>;
  createRuntime(
    environmentName: string,
    type: 'notebook' | 'terminal' | 'job',
    givenName: string,
    creditsLimit: number,
  ): Promise<any>;
  listRuntimes(): Promise<any[]>;
  getRuntime(podName: string): Promise<any>;
  deleteRuntime(podName: string): Promise<void>;
  createSnapshot(
    podName: string,
    name: string,
    description: string,
    stop?: boolean,
  ): Promise<any>;
  listSnapshots(): Promise<any[]>;
  getSnapshot(id: string): Promise<any>;
  deleteSnapshot(id: string): Promise<void>;
  checkRuntimesHealth(): Promise<any>;

  // Spacer Methods
  getMySpaces(): Promise<any[]>;
  createSpace(
    name: string,
    description: string,
    variant: string,
    spaceHandle: string,
    organizationId: string,
    seedSpaceId: string,
    isPublic: boolean,
  ): Promise<any>;
  createNotebook(
    spaceId: string,
    name: string,
    description: string,
    file?: File | Blob,
  ): Promise<any>;
  getNotebook(id: string): Promise<any>;
  updateNotebook(id: string, name?: string, description?: string): Promise<any>;
  createLexical(
    spaceId: string,
    name: string,
    description: string,
    file?: File | Blob,
  ): Promise<any>;
  getLexical(id: string): Promise<any>;
  updateLexical(id: string, name?: string, description?: string): Promise<any>;
  getSpaceItems(spaceId: string): Promise<any>;
  deleteSpaceItem(itemId: string): Promise<any>;
  getNotebookContent(notebookId: string, options?: any): Promise<any>;
  getLexicalContent(lexicalId: string, options?: any): Promise<any>;
  prefetchContent(
    itemIds: string[],
    itemType?: 'notebook' | 'lexical',
  ): Promise<void>;
  clearContentCache(
    itemId?: string,
    itemType?: 'notebook' | 'lexical',
  ): Promise<void>;
  checkSpacerHealth(): Promise<any>;
}
