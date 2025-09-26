/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * @module sdk/client/base
 * @description Base SDK class providing core configuration and token management.
 */

import { DEFAULT_SERVICE_URLS } from '../../api/constants';
import { PlatformStorage, BrowserStorage } from './storage';
import { IAMState } from './state/IAMState';
import { RuntimesState } from './state/RuntimesState';
import { SpacerState } from './state/SpacerState';

/**
 * Configuration options for the Datalayer SDK.
 */
export interface DatalayerSDKConfig {
  /** Authentication token for API requests. */
  token?: string;
  /** URL for the IAM (Identity and Access Management) service. */
  iamRunUrl?: string;
  /** URL for the Runtimes service. */
  runtimesRunUrl?: string;
  /** URL for the Spacer (workspaces and collaboration) service. */
  spacerRunUrl?: string;

  // Platform abstractions
  /** Platform-specific storage implementation. */
  storage?: PlatformStorage;
  /** Enable caching for API responses. */
  cacheEnabled?: boolean;
  /** Enable offline mode (use cached data when possible). */
  offlineMode?: boolean;
}

/**
 * Base SDK class that provides core configuration and token management.
 *
 * This class serves as the foundation for the DatalayerSDK, handling
 * authentication tokens, service URL configuration, and other common
 * SDK functionality that all mixins can access.
 */
export class DatalayerSDKBase {
  /** URL for IAM service */
  public readonly iamRunUrl: string;
  /** URL for Runtimes service */
  public readonly runtimesRunUrl: string;
  /** URL for Spacer service */
  public readonly spacerRunUrl: string;
  /** Authentication token */
  public token?: string;

  // Platform abstractions
  /** Platform storage implementation */
  public readonly storage: PlatformStorage;
  /** IAM state manager */
  public readonly iamState: IAMState;
  /** Runtimes state manager */
  public readonly runtimesState: RuntimesState;
  /** Spacer state manager */
  public readonly spacerState: SpacerState;
  /** Cache enabled flag */
  public readonly cacheEnabled: boolean;
  /** Offline mode flag */
  public readonly offlineMode: boolean;

  /**
   * Create a DatalayerSDK base instance.
   *
   * @param config - SDK configuration options
   */
  constructor(config: DatalayerSDKConfig) {
    this.iamRunUrl = config.iamRunUrl || DEFAULT_SERVICE_URLS.IAM;
    this.runtimesRunUrl =
      config.runtimesRunUrl || DEFAULT_SERVICE_URLS.RUNTIMES;
    this.spacerRunUrl = config.spacerRunUrl || DEFAULT_SERVICE_URLS.SPACER;
    this.token = config.token;

    // Initialize platform abstractions
    this.storage = config.storage || new BrowserStorage();
    this.cacheEnabled = config.cacheEnabled !== false;
    this.offlineMode = config.offlineMode || false;

    // Initialize state managers
    this.iamState = new IAMState(this.storage);
    this.runtimesState = new RuntimesState(this.storage);
    this.spacerState = new SpacerState(this.storage);

    // Store service URLs in state
    this.initializeState();
  }

  /**
   * Initialize state with configuration.
   */
  public async initializeState(): Promise<void> {
    // Store service URLs
    await this.iamState.setIamUrl(this.iamRunUrl);
    await this.runtimesState.setRuntimesUrl(this.runtimesRunUrl);
    await this.spacerState.setSpacerUrl(this.spacerRunUrl);

    // Store token if provided
    if (this.token) {
      await this.iamState.setToken(this.token);
    } else {
      // Try to load token from storage
      const storedToken = await this.iamState.getToken();
      if (storedToken) {
        this.token = storedToken;
      }
    }
  }

  /**
   * Update the authentication token for all API requests.
   *
   * This method updates the token that will be used for all subsequent
   * API calls made through the SDK.
   *
   * @param token - New authentication token
   *
   * @example
   * ```typescript
   * // After login, update the SDK with the new token
   * const loginResponse = await sdk.login(credentials);
   * sdk.updateToken(loginResponse.access_token);
   * ```
   */
  async updateToken(token: string): Promise<void> {
    this.token = token;
    // Also persist to storage
    await this.iamState.setToken(token);
  }

  /**
   * Get the current configuration including service URLs and token.
   *
   * @returns The current configuration
   */
  getConfig(): DatalayerSDKConfig {
    return {
      iamRunUrl: this.iamRunUrl,
      runtimesRunUrl: this.runtimesRunUrl,
      spacerRunUrl: this.spacerRunUrl,
      token: this.token,
    };
  }

  /**
   * Update the configuration for API requests.
   *
   * @param config - Configuration updates
   */
  async updateConfig(config: Partial<DatalayerSDKConfig>): Promise<void> {
    if (config.token !== undefined) {
      await this.updateToken(config.token);
    }
    // Note: service URLs cannot be changed after initialization
  }

  /**
   * Get the IAM service URL for API requests.
   *
   * @returns The IAM service URL
   */
  public getIamRunUrl(): string {
    return this.iamRunUrl;
  }

  /**
   * Get the Runtimes service URL for API requests.
   *
   * @returns The Runtimes service URL
   */
  public getRuntimesRunUrl(): string {
    return this.runtimesRunUrl;
  }

  /**
   * Get the Spacer service URL for API requests.
   *
   * @returns The Spacer service URL
   */
  public getSpacerRunUrl(): string {
    return this.spacerRunUrl;
  }

  /**
   * Get the current authentication token.
   *
   * @returns The authentication token
   */
  public getToken(): string | undefined {
    return this.token;
  }

  /**
   * Get the platform storage implementation.
   *
   * @returns The storage implementation
   */
  public getStorage(): PlatformStorage {
    return this.storage;
  }

  /**
   * Get the IAM state manager.
   *
   * @returns The IAM state manager
   */
  public getIAMState(): IAMState {
    return this.iamState;
  }

  /**
   * Get the Runtimes state manager.
   *
   * @returns The Runtimes state manager
   */
  public getRuntimesState(): RuntimesState {
    return this.runtimesState;
  }

  /**
   * Get the Spacer state manager.
   *
   * @returns The Spacer state manager
   */
  public getSpacerState(): SpacerState {
    return this.spacerState;
  }

  /**
   * Clear all cached data.
   */
  public async clearCache(): Promise<void> {
    await this.iamState.clear();
    await this.runtimesState.clear();
    await this.spacerState.clear();
  }
}
