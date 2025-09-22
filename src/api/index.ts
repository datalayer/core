/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * @module @datalayer/core/api
 * @description Comprehensive TypeScript SDK for the Datalayer platform API
 */

// Base client exports
export { ApiClient, createApiClient } from './base/client';
export type {
  ApiConfig,
  ApiResponse,
  ApiError,
  RequestOptions,
} from './base/client';

// Type exports
export * from './types/runtimes';
export * from './types/iam';
export * from './types/spacer';

// Functional API exports
export * as runtimesApi from './services/runtimes/api';
export * as iamApi from './services/iam/api';
export * as spacerApi from './services/spacer/api';

// OOP client exports
export { RuntimesService } from './services/runtimes/client';
export { IAMService } from './services/iam/client';
export { SpacerService } from './services/spacer/client';

// Main SDK class
import { ApiClient, ApiConfig } from './base/client';
import { RuntimesService } from './services/runtimes/client';
import { IAMService } from './services/iam/client';
import { SpacerService } from './services/spacer/client';

/**
 * Main SDK class for interacting with the Datalayer platform API.
 * Provides unified access to all Datalayer services including runtimes,
 * identity management, and collaborative workspaces.
 *
 * @class DatalayerSDK
 * @example
 * ```typescript
 * // Initialize the SDK
 * const sdk = new DatalayerSDK({
 *   baseUrl: 'https://prod1.datalayer.run',
 *   token: 'your-api-token'
 * });
 *
 * // Use service methods
 * const environments = await sdk.runtimes.environments.list();
 * const user = await sdk.iam.users.me();
 * const spaces = await sdk.spacer.spaces.list();
 * ```
 */
export class DatalayerSDK {
  /**
   * The underlying API client instance
   * @readonly
   */
  public readonly client: ApiClient;

  /**
   * Runtimes service for managing computational environments and kernels
   * @readonly
   */
  public readonly runtimes: RuntimesService;

  /**
   * IAM service for identity and access management
   * @readonly
   */
  public readonly iam: IAMService;

  /**
   * Spacer service for collaborative workspaces and educational content
   * @readonly
   */
  public readonly spacer: SpacerService;

  /**
   * Creates a new DatalayerSDK instance
   *
   * @param {ApiConfig} config - SDK configuration options
   * @param {string} [config.baseUrl='https://prod1.datalayer.run'] - Base URL for API requests
   * @param {string} [config.token] - Bearer token for authentication
   * @param {number} [config.timeout=30000] - Request timeout in milliseconds
   * @param {Record<string, string>} [config.headers] - Additional headers
   *
   * @example
   * ```typescript
   * // With token authentication
   * const sdk = new DatalayerSDK({
   *   token: 'your-api-token'
   * });
   *
   * // With custom base URL
   * const sdk = new DatalayerSDK({
   *   baseUrl: 'https://staging.datalayer.run',
   *   token: 'your-api-token',
   *   timeout: 60000
   * });
   * ```
   */
  constructor(config?: ApiConfig) {
    this.client = new ApiClient(config);
    this.runtimes = new RuntimesService(this.client);
    this.iam = new IAMService(this.client);
    this.spacer = new SpacerService(this.client);
  }

  /**
   * Updates the API token for authentication
   *
   * @param {string} token - New bearer token
   *
   * @example
   * ```typescript
   * // After login
   * const loginResponse = await sdk.iam.auth.login({
   *   email: 'user@example.com',
   *   password: 'password'
   * });
   * sdk.updateToken(loginResponse.access_token);
   * ```
   */
  updateToken(token: string): void {
    this.client.updateConfig({ token });
  }

  /**
   * Updates the API client configuration
   *
   * @param {Partial<ApiConfig>} config - Configuration updates
   *
   * @example
   * ```typescript
   * sdk.updateConfig({
   *   timeout: 60000,
   *   headers: { 'X-Custom-Header': 'value' }
   * });
   * ```
   */
  updateConfig(config: Partial<ApiConfig>): void {
    this.client.updateConfig(config);
  }

  /**
   * Gets the current SDK configuration
   *
   * @returns {ApiConfig} Current configuration
   *
   * @example
   * ```typescript
   * const config = sdk.getConfig();
   * console.log('Base URL:', config.baseUrl);
   * console.log('Timeout:', config.timeout);
   * ```
   */
  getConfig(): ApiConfig {
    return this.client.getConfig();
  }

  /**
   * Cancels all pending API requests
   *
   * @example
   * ```typescript
   * // Cancel all pending requests on cleanup
   * sdk.cancelAllRequests();
   * ```
   */
  cancelAllRequests(): void {
    this.client.cancelAllRequests();
  }
}

/**
 * Factory function to create a new Datalayer SDK instance
 *
 * @param {ApiConfig} config - SDK configuration options
 * @returns {DatalayerSDK} New SDK instance
 *
 * @example
 * ```typescript
 * const sdk = createDatalayerSDK({
 *   baseUrl: 'https://prod1.datalayer.run',
 *   token: process.env.DATALAYER_TOKEN,
 *   timeout: 60000
 * });
 * ```
 */
export function createDatalayerSDK(config?: ApiConfig): DatalayerSDK {
  return new DatalayerSDK(config);
}

// Default export
export default DatalayerSDK;
