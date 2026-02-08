/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */
/**
 * Authentication types and interfaces for the Datalayer Client
 */

import { UserDTO } from '../../models/UserDTO';

/**
 * Authentication credentials for login
 */
export interface AuthCredentials {
  handle: string;
  password: string;
}

/**
 * Authentication options for login flow
 */
export interface AuthOptions {
  /**
   * Existing authentication token
   */
  token?: string;
  /**
   * User handle for credentials-based auth
   */
  handle?: string;
  /**
   * Password for credentials-based auth
   */
  password?: string;
  /**
   * Use browser-based OAuth flow
   */
  useBrowser?: boolean;
  /**
   * OAuth provider (github or linkedin)
   */
  oauthProvider?: 'github' | 'linkedin';
  /**
   * Callback URI for OAuth redirect
   */
  callbackUri?: string;
  /**
   * Nonce for OAuth state parameter
   */
  nonce?: string;
  /**
   * Use popup window for OAuth (default: true). If false, redirects the current page.
   */
  usePopup?: boolean;
  /**
   * Don't store the token after authentication
   */
  noStore?: boolean;
}

/**
 * Authentication result containing user and token
 */
export interface AuthResult {
  user: UserDTO;
  token: string;
}

/**
 * Token storage backend interface
 */
export interface TokenStorage {
  /**
   * Get token from storage
   */
  get(key: string): string | null;
  /**
   * Set token in storage
   */
  set(key: string, value: string): void;
  /**
   * Delete token from storage
   */
  delete(key: string): void;
  /**
   * Check if storage is available
   */
  isAvailable(): boolean;
  /**
   * Get stored authentication token (convenience method)
   */
  getToken?(): string | null;
  /**
   * Store authentication token (convenience method)
   * May be async to support keyring storage
   */
  setToken?(token: string): void | Promise<void>;
  /**
   * Delete authentication token (convenience method)
   * May be async to support keyring storage
   */
  deleteToken?(): void | Promise<void>;
  /**
   * Store user data (optional)
   * May be async to support keyring storage
   */
  setUser?(user: any): void | Promise<void>;
  /**
   * Clear all authentication data (optional)
   * May be async to support keyring storage
   */
  clear?(): void | Promise<void>;
}

/**
 * Authentication strategy interface
 */
export interface AuthStrategy {
  /**
   * Authenticate using this strategy
   */
  authenticate(options: AuthOptions): Promise<AuthResult>;
  /**
   * Check if this strategy can handle the given options
   */
  canHandle(options: AuthOptions): boolean;
}

/**
 * Browser OAuth configuration
 */
export interface BrowserOAuthConfig {
  /**
   * OAuth provider name (e.g., 'github', 'linkedin')
   */
  provider: string;
  /**
   * Callback URL for OAuth redirect
   */
  callbackUrl: string;
  /**
   * IAM server URL
   */
  iamUrl: string;
}

/**
 * Token validation result
 */
export interface TokenValidationResult {
  /**
   * Whether the token is valid
   */
  valid: boolean;
  /**
   * User associated with the token (if valid)
   */
  user?: UserDTO;
  /**
   * Error message (if invalid)
   */
  error?: string;
}
