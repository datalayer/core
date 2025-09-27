/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * @module sdk/client
 * @description Main Datalayer SDK client with intuitive mixin-based API.
 *
 * The DatalayerSDK class provides a unified, flat API for all Datalayer platform
 * services through TypeScript mixins. This design offers the best discoverability
 * and ease of use compared to nested service objects.
 *
 * @example
 * ```typescript
 * import { DatalayerSDK } from '@datalayer/core/sdk';
 *
 * // Initialize SDK
 * const sdk = new DatalayerSDK({
 *   token: 'your-api-token',
 *   baseUrl: 'https://prod1.datalayer.run'
 * });
 *
 * // Flat, intuitive API
 * const user = await sdk.whoami();
 * const environments = await sdk.listEnvironments();
 * const notebook = await sdk.createNotebook(data);
 * const runtime = await sdk.createRuntime(config);
 * await sdk.startRuntime(podName);
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
 *
 * This class uses TypeScript mixins to provide a flat, discoverable API where
 * all methods are directly accessible on the SDK instance. This design offers
 * superior developer experience compared to nested service objects.
 *
 * **Key Features:**
 * - **Flat API**: All methods directly on `sdk.` (e.g., `sdk.createNotebook()`)
 * - **Intuitive naming**: Descriptive method names (e.g., `whoami()` vs `iam.users.me()`)
 * - **Perfect discoverability**: IDE shows all available methods immediately
 * - **Type safety**: Full TypeScript support with comprehensive interfaces
 *
 * **Authentication Methods:**
 * - `whoami()` - Get current user profile
 * - `login(credentials)` - Authenticate with credentials
 * - `logout()` - Log out current user
 *
 * **Environment Methods:**
 * - `listEnvironments()` - List available compute environments
 *
 * **Runtime Methods:**
 * - `createRuntime(config)` - Create new computational runtime
 * - `listRuntimes()` - List all runtimes
 * - `getRuntime(podName)` - Get runtime details
 * - `deleteRuntime(podName)` - Delete runtime
 *
 * **Workspace Methods:**
 * - `createSpace(data)` - Create new workspace
 * - `listSpaces()` - List all workspaces
 * - `getSpace(spaceId)` - Get workspace details
 * - `deleteSpace(spaceId)` - Delete workspace
 *
 * **Notebook Methods:**
 * - `createNotebook(data)` - Create new notebook
 * - `listNotebooks(spaceId?)` - List notebooks
 * - `getNotebook(notebookId)` - Get notebook details
 * - `getNotebookByUid(uid)` - Get notebook by UID
 * - `updateNotebook(notebookId, data)` - Update notebook
 * - `cloneNotebook(data)` - Clone existing notebook
 * - `getNotebookContent(notebookId)` - Get notebook content
 * - `updateNotebookContent(notebookId, content)` - Update notebook content
 * - `deleteNotebook(notebookId)` - Delete notebook
 *
 * **Cell Methods:**
 * - `createCell(notebookId, cell)` - Create new cell
 * - `getCell(notebookId, cellId)` - Get cell details
 * - `deleteCell(notebookId, cellId)` - Delete cell
 *
 * @example
 * ```typescript
 * // Initialize SDK
 * const sdk = new DatalayerSDK({
 *   token: 'your-token',
 *   baseUrl: 'https://prod1.datalayer.run'
 * });
 *
 * // Authentication
 * const user = await sdk.whoami();
 * console.log('Logged in as:', user.email);
 *
 * // Create workspace and notebook
 * const space = await sdk.createSpace({
 *   name: 'My Project'
 * });
 *
 * const notebook = await sdk.createNotebook({
 *   space_id: space.id,
 *   name: 'Analysis'
 * });
 *
 * // Create and start runtime
 * const runtime = await sdk.createRuntime({
 *   environment_name: 'python-cpu-env',
 *   credits_limit: 100
 * });
 *
 * console.log('Setup complete!');
 * ```
 */
/**
 * Main Datalayer SDK client providing unified access to all platform services.
 *
 * This class uses TypeScript mixins to provide a flat, discoverable API where
 * all methods are directly accessible on the SDK instance. This design offers
 * superior developer experience compared to nested service objects.
 *
 * **Key Features:**
 * - **Flat API**: All methods directly on `sdk.` (e.g., `sdk.createNotebook()`)
 * - **Intuitive naming**: Descriptive method names (e.g., `whoami()` vs `iam.users.me()`)
 * - **Perfect discoverability**: IDE shows all available methods immediately
 * - **Type safety**: Full TypeScript support with comprehensive interfaces
 *
 * **Authentication Methods:**
 * - `whoami()` - Get current user profile
 * - `login(credentials)` - Authenticate with credentials
 * - `logout()` - Log out current user
 *
 * **Environment Methods:**
 * - `listEnvironments()` - List available compute environments
 *
 * **Runtime Methods:**
 * - `createRuntime(config)` - Create new computational runtime
 * - `listRuntimes()` - List all runtimes
 * - `getRuntime(podName)` - Get runtime details
 * - `deleteRuntime(podName)` - Delete runtime
 *
 * **Workspace Methods:**
 * - `createSpace(data)` - Create new workspace
 * - `listSpaces()` - List all workspaces
 * - `getSpace(spaceId)` - Get workspace details
 * - `deleteSpace(spaceId)` - Delete workspace
 *
 * **Notebook Methods:**
 * - `createNotebook(data)` - Create new notebook
 * - `listNotebooks(spaceId?)` - List notebooks
 * - `getNotebook(notebookId)` - Get notebook details
 * - `getNotebookByUid(uid)` - Get notebook by UID
 * - `updateNotebook(notebookId, data)` - Update notebook
 * - `cloneNotebook(data)` - Clone existing notebook
 * - `getNotebookContent(notebookId)` - Get notebook content
 * - `updateNotebookContent(notebookId, content)` - Update notebook content
 * - `deleteNotebook(notebookId)` - Delete notebook
 *
 * **Cell Methods:**
 * - `createCell(notebookId, cell)` - Create new cell
 * - `getCell(notebookId, cellId)` - Get cell details
 * - `deleteCell(notebookId, cellId)` - Delete cell
 *
 * @example
 * ```typescript
 * // Initialize SDK
 * const sdk = new DatalayerSDK({
 *   token: 'your-token',
 *   baseUrl: 'https://prod1.datalayer.run'
 * });
 *
 * // Authentication
 * const user = await sdk.whoami();
 * console.log('Logged in as:', user.email);
 *
 * // Create workspace and notebook
 * const space = await sdk.createSpace({
 *   name: 'My Project'
 * });
 *
 * const notebook = await sdk.createNotebook({
 *   space_id: space.id,
 *   name: 'Analysis'
 * });
 *
 * // Create and start runtime
 * const runtime = await sdk.createRuntime({
 *   environment_name: 'python-cpu-env',
 *   credits_limit: 100
 * });
 *
 * console.log('Setup complete!');
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
export { User, GitHubUser } from './models/User';
export type { AuthProvider, GitHubUserData } from './models/User';

// Export mixin types
export type { OAuthConfig } from './mixins/IAMMixin';

// Interface declaration for TypeScript to recognize mixin methods
export interface DatalayerSDK {
  // IAM Methods
  whoami(): Promise<any>;
  login(credentials: any): Promise<any>;
  logout(): Promise<void>;
  getGitHubUser(username: string): Promise<any>;
  getOAuthUrl(config: OAuthConfig): Promise<string>;
  exchangeOAuthCode(
    provider: string,
    code: string,
    state?: string,
  ): Promise<any>;
  linkProvider(provider: string): Promise<any>;
  unlinkProvider(provider: string): Promise<any>;

  // Runtime Methods
  listEnvironments(): Promise<any[]>;
  createRuntime(config: any): Promise<any>;
  listRuntimes(): Promise<any[]>;
  getRuntime(podName: string): Promise<any>;
  deleteRuntime(podName: string): Promise<void>;
  snapshotRuntime(podName: string, data?: any): Promise<any>;
  createSnapshot(podName: string, data?: any): Promise<any>;
  getRuntimeSnapshots(podName: string): Promise<any[]>;
  loadRuntimeSnapshot(podName: string, snapshotId: string): Promise<any>;
  ensureRuntime(config?: any): Promise<any>;

  // Spacer Methods
  getMySpaces(): Promise<any[]>;
  createSpace(data: any): Promise<any>;
  getSpace(spaceId: string): Promise<any>;
  updateSpace(spaceId: string, data: any): Promise<any>;
  deleteSpace(spaceId: string): Promise<void>;
  createNotebook(data: any): Promise<any>;
  getNotebook(notebookId: string): Promise<any>;
  getNotebookByUid(uid: string): Promise<any>;
  updateNotebook(notebookId: string, data: any): Promise<any>;
  cloneNotebook(data: any): Promise<any>;
  getNotebookContent(notebookId: string): Promise<any>;
  updateNotebookContent(notebookId: string, content: any): Promise<any>;
  deleteNotebook(notebookId: string): Promise<void>;
  createLexical(data: any): Promise<any>;
  getLexical(lexicalId: string): Promise<any>;
  updateLexical(lexicalId: string, data: any): Promise<any>;
  deleteLexical(lexicalId: string): Promise<void>;
  createCell(notebookId: string, cell: any): Promise<any>;
  getCell(notebookId: string, cellId: string): Promise<any>;
  deleteCell(notebookId: string, cellId: string): Promise<void>;
  getSpaceItems(spaceId: string): Promise<any[]>;
  deleteSpaceItem(itemId: string): Promise<void>;
  getLexicalCollaborationSessionId(lexicalId: string): Promise<any>;
}
