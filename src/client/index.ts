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
import type { UserDTO } from './../models/UserDTO';
import type { CreditsDTO } from '../models/CreditsDTO';
import type { EnvironmentDTO } from '../models/EnvironmentDTO';
import type { RuntimeDTO } from '../models/RuntimeDTO';
import type { RuntimeSnapshotDTO } from '../models/RuntimeSnapshotDTO';
import type { SpaceDTO } from '../models/SpaceDTO';
import type { NotebookDTO } from '../models/NotebookDTO';
import type { LexicalDTO } from '../models/LexicalDTO';
import type { HealthCheck } from '../models/HealthCheck';

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
export { UserDTO as User } from './../models/UserDTO';
export type { UserJSON } from './../models/UserDTO';
export { RuntimeDTO as Runtime } from '../models/RuntimeDTO';
export type { RuntimeJSON } from '../models/RuntimeDTO';
export { EnvironmentDTO as Environment } from '../models/EnvironmentDTO';
export type { EnvironmentJSON } from '../models/EnvironmentDTO';
export { RuntimeSnapshotDTO as Snapshot } from '../models/RuntimeSnapshotDTO';
export { SpaceDTO as Space } from '../models/SpaceDTO';
export { NotebookDTO as Notebook } from '../models/NotebookDTO';
export { LexicalDTO } from '../models/LexicalDTO';
export { CreditsDTO as Credits } from '../models/CreditsDTO';
export { ItemDTO as Item } from '../models/ItemDTO';
export { HealthCheck } from '../models/HealthCheck';
export type { HealthCheckJSON } from '../models/HealthCheck';

// Export constants
export { ItemTypes } from './constants';
export type { ItemType } from './constants';

// Interface declaration for TypeScript to recognize mixin methods
export interface DatalayerClient {
  // Base Methods
  getToken(): string | undefined;
  setToken(token: string): Promise<void>;

  // IAM Methods
  whoami(): Promise<UserDTO>;
  login(token: string): Promise<UserDTO>;
  loginBrowser(redirectUri?: string, port?: number): Promise<UserDTO>;
  loginPassword(handle: string, password: string): Promise<UserDTO>;
  loginToken(token: string): Promise<UserDTO>;
  logout(): Promise<void>;
  getCredits(): Promise<CreditsDTO>;
  calculateMaxRuntimeMinutes(
    availableCredits: number,
    burningRate: number,
  ): number;
  calculateCreditsRequired(minutes: number, burningRate: number): number;
  checkIAMHealth(): Promise<HealthCheck>;

  // Runtime Methods
  listEnvironments(): Promise<EnvironmentDTO[]>;
  ensureRuntime(
    environmentName?: string,
    creditsLimit?: number,
    waitForReady?: boolean,
    maxWaitTime?: number,
    reuseExisting?: boolean,
    snapshotId?: string,
  ): Promise<RuntimeDTO>;
  createRuntime(
    environmentName: string,
    type: 'notebook' | 'terminal' | 'job',
    givenName: string,
    minutesLimit: number,
    fromSnapshotId?: string,
  ): Promise<RuntimeDTO>;
  listRuntimes(): Promise<RuntimeDTO[]>;
  getRuntime(podName: string): Promise<RuntimeDTO>;
  deleteRuntime(podName: string): Promise<void>;
  terminateAllRuntimes(): Promise<PromiseSettledResult<void>[]>;
  createSnapshot(
    podName: string,
    name: string,
    description: string,
    stop?: boolean,
  ): Promise<RuntimeSnapshotDTO>;
  listSnapshots(): Promise<RuntimeSnapshotDTO[]>;
  getSnapshot(id: string): Promise<RuntimeSnapshotDTO>;
  deleteSnapshot(id: string): Promise<void>;
  checkRuntimesHealth(): Promise<HealthCheck>;

  // Spacer Methods
  getMySpaces(): Promise<SpaceDTO[]>;
  createSpace(
    name: string,
    description: string,
    variant: string,
    spaceHandle: string,
    organizationId: string,
    seedSpaceId: string,
    isPublic: boolean,
  ): Promise<SpaceDTO>;
  createNotebook(
    spaceId: string,
    name: string,
    description: string,
    file?: File | Blob,
  ): Promise<NotebookDTO>;
  getNotebook(id: string): Promise<NotebookDTO>;
  updateNotebook(
    id: string,
    name?: string,
    description?: string,
  ): Promise<NotebookDTO>;
  createLexical(
    spaceId: string,
    name: string,
    description: string,
    file?: File | Blob,
  ): Promise<LexicalDTO>;
  getLexical(id: string): Promise<LexicalDTO>;
  updateLexical(
    id: string,
    name?: string,
    description?: string,
  ): Promise<LexicalDTO>;
  getSpaceItems(spaceId: string): Promise<(NotebookDTO | LexicalDTO)[]>;
  getSpaceItem(itemId: string): Promise<NotebookDTO | LexicalDTO>;
  deleteSpaceItem(itemId: string): Promise<void>;
  getCollaborationSessionId(documentId: string): Promise<string>;
  getContent(itemId: string): Promise<any>;
  checkSpacerHealth(): Promise<HealthCheck>;
  // Utility Methods
  calculateCreditsFromMinutes(minutes: number, burningRate: number): number;
}
