/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * @module sdk/client/base
 * @description Base SDK class providing core configuration and token management.
 */

import { DEFAULT_SERVICE_URLS } from '../../api/constants';

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
  protected readonly iamRunUrl: string;
  /** URL for Runtimes service */
  protected readonly runtimesRunUrl: string;
  /** URL for Spacer service */
  protected readonly spacerRunUrl: string;
  /** Authentication token */
  protected token?: string;

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
  updateToken(token: string): void {
    this.token = token;
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
  updateConfig(config: Partial<DatalayerSDKConfig>): void {
    if (config.token !== undefined) {
      this.updateToken(config.token);
    }
    // Note: service URLs cannot be changed after initialization
  }

  /**
   * Get the IAM service URL for API requests.
   *
   * @returns The IAM service URL
   */
  protected getIamRunUrl(): string {
    return this.iamRunUrl;
  }

  /**
   * Get the Runtimes service URL for API requests.
   *
   * @returns The Runtimes service URL
   */
  protected getRuntimesRunUrl(): string {
    return this.runtimesRunUrl;
  }

  /**
   * Get the Spacer service URL for API requests.
   *
   * @returns The Spacer service URL
   */
  protected getSpacerRunUrl(): string {
    return this.spacerRunUrl;
  }

  /**
   * Get the current authentication token.
   *
   * @returns The authentication token
   */
  protected getToken(): string | undefined {
    return this.token;
  }
}
