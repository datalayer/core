/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Main Datalayer Client with intuitive mixin-based API.
 * Provides unified, flat API for all Datalayer platform services through TypeScript mixins.
 *
 * @module client
 *
 * @example
 * ```typescript
 * const client = new DatalayerClient({
 *   token: 'your-api-token'
 * });
 *
 * const user = await client.whoami();
 * const runtime = await client.createRuntime(config);
 * ```
 */

import {
  DatalayerClientBase,
  type DatalayerClientConfig,
  type SDKHandlers,
} from './base';
import { IAMMixin } from './mixins/IAMMixin';
import { RuntimesMixin } from './mixins/RuntimesMixin';
import { SpacerMixin } from './mixins/SpacerMixin';

// Import model types for interface declaration
import type { User } from './models/User';
import type { Credits } from './models/Credits';
import type { Environment } from './models/Environment';
import type { Runtime } from './models/Runtime';
import type { Snapshot } from './models/Snapshot';
import type { Space } from './models/Space';
import type { Notebook } from './models/Notebook';
import type { Lexical } from './models/Lexical';
import type { HealthCheck } from './models/HealthCheck';

/**
 * Helper function to compose mixins in a more readable way.
 * Applies mixins in the order provided.
 *
 * @param mixins - Array of mixin functions to apply
 * @returns The composed class with all mixins applied
 */
function composeMixins(...mixins: Array<(base: any) => any>) {
  return mixins.reduce((base, mixin) => mixin(base), DatalayerClientBase);
}

// Apply mixins to the base class using the helper
const DatalayerClientWithMixins = composeMixins(
  IAMMixin,
  RuntimesMixin,
  SpacerMixin,
);

/**
 * Main Datalayer Client providing unified access to all platform services.
 * Uses TypeScript mixins to provide a flat, discoverable API.
 *
 * @example
 * ```typescript
 * const client = new DatalayerClient({
 *   token: 'your-token'
 * });
 *
 * const user = await client.whoami();
 * const runtime = await client.createRuntime({
 *   environment_name: 'python-cpu-env',
 *   credits_limit: 100
 * });
 * ```
 */
export class DatalayerClient extends DatalayerClientWithMixins {
  /**
   * Create a DatalayerClient instance.
   *
   * @param config - Client configuration options
   */
  constructor(config: DatalayerClientConfig) {
    super(config);

    // Wrap all methods with handlers if configured
    this.wrapAllMethods();
  }
}

// Export configuration interface and base for extensibility
export type { DatalayerClientConfig, SDKHandlers };
export { DatalayerClientBase };

// Export models for use by consumers
export { User } from './models/User';
export type { UserJSON } from './models/User';
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
export { HealthCheck } from './models/HealthCheck';
export type { HealthCheckJSON } from './models/HealthCheck';

// Export constants
export { ItemTypes } from './constants';
export type { ItemType } from './constants';

// Interface declaration for TypeScript to recognize mixin methods
export interface DatalayerClient {
  // Base Methods
  getToken(): string | undefined;
  setToken(token: string): Promise<void>;

  // IAM Methods
  whoami(): Promise<User>;
  login(token: string): Promise<User>;
  logout(): Promise<void>;
  getCredits(): Promise<Credits>;
  calculateMaxRuntimeMinutes(
    availableCredits: number,
    burningRate: number,
  ): number;
  calculateCreditsRequired(minutes: number, burningRate: number): number;
  checkIAMHealth(): Promise<HealthCheck>;

  // Runtime Methods
  listEnvironments(): Promise<Environment[]>;
  ensureRuntime(
    environmentName?: string,
    creditsLimit?: number,
    waitForReady?: boolean,
    maxWaitTime?: number,
    reuseExisting?: boolean,
    snapshotId?: string,
  ): Promise<Runtime>;
  createRuntime(
    environmentName: string,
    type: 'notebook' | 'terminal' | 'job',
    givenName: string,
    minutesLimit: number,
    fromSnapshotId?: string,
  ): Promise<Runtime>;
  listRuntimes(): Promise<Runtime[]>;
  getRuntime(podName: string): Promise<Runtime>;
  deleteRuntime(podName: string): Promise<void>;
  terminateAllRuntimes(): Promise<PromiseSettledResult<void>[]>;
  createSnapshot(
    podName: string,
    name: string,
    description: string,
    stop?: boolean,
  ): Promise<Snapshot>;
  listSnapshots(): Promise<Snapshot[]>;
  getSnapshot(id: string): Promise<Snapshot>;
  deleteSnapshot(id: string): Promise<void>;
  checkRuntimesHealth(): Promise<HealthCheck>;

  // Spacer Methods
  getMySpaces(): Promise<Space[]>;
  createSpace(
    name: string,
    description: string,
    variant: string,
    spaceHandle: string,
    organizationId: string,
    seedSpaceId: string,
    isPublic: boolean,
  ): Promise<Space>;
  createNotebook(
    spaceId: string,
    name: string,
    description: string,
    file?: File | Blob,
  ): Promise<Notebook>;
  getNotebook(id: string): Promise<Notebook>;
  updateNotebook(
    id: string,
    name?: string,
    description?: string,
  ): Promise<Notebook>;
  createLexical(
    spaceId: string,
    name: string,
    description: string,
    file?: File | Blob,
  ): Promise<Lexical>;
  getLexical(id: string): Promise<Lexical>;
  updateLexical(
    id: string,
    name?: string,
    description?: string,
  ): Promise<Lexical>;
  getSpaceItems(spaceId: string): Promise<(Notebook | Lexical)[]>;
  getSpaceItem(itemId: string): Promise<Notebook | Lexical>;
  deleteSpaceItem(itemId: string): Promise<void>;
  getCollaborationSessionId(documentId: string): Promise<string>;
  getContent(itemId: string): Promise<any>;
  checkSpacerHealth(): Promise<HealthCheck>;
  // Utility Methods
  calculateCreditsFromMinutes(minutes: number, burningRate: number): number;
}
