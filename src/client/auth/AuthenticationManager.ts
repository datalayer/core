/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */
/**
 * Core authentication manager for the Datalayer Client
 */

import * as authentication from '../../api/iam/authentication';
import type {
  AuthOptions,
  AuthResult,
  AuthStrategy,
  TokenStorage,
  TokenValidationResult,
} from './types';
import {
  TokenAuthStrategy,
  CredentialsAuthStrategy,
  StorageAuthStrategy,
  BrowserOAuthStrategy,
} from './strategies';
import { NodeStorage, BrowserStorage } from './storage';
import { UserDTO } from '../../models/UserDTO';

/**
 * Authentication Manager for Datalayer Client
 * Provides a unified interface for all authentication methods
 */
export class AuthenticationManager {
  private strategies: AuthStrategy[];
  private storage: TokenStorage;
  private iamUrl: string;
  private currentUser?: UserDTO;
  private currentToken?: string;

  /**
   * Create an AuthenticationManager instance
   * @param iamUrl - IAM service URL (e.g., "https://prod1.datalayer.run")
   * @param storage - Token storage backend (optional, defaults to auto-detected)
   */
  constructor(iamUrl: string, storage?: TokenStorage) {
    this.iamUrl = iamUrl;

    // Extract the service URL (remove /api/iam/v1 if present)
    // The service URL the credentials are stored under: the IAM one, without
    // the path of its API.
    const serviceUrl = iamUrl.replace('/api/iam/v1', '');

    // CRITICAL: Pass the service URL to storage for keyring compatibility
    if (!storage) {
      if (typeof window !== 'undefined') {
        this.storage = new BrowserStorage();
      } else {
        this.storage = new NodeStorage(serviceUrl);
      }
    } else {
      this.storage = storage;
    }

    // Initialize strategies
    this.strategies = [
      new TokenAuthStrategy(this.iamUrl, this.storage),
      new CredentialsAuthStrategy(this.iamUrl, this.storage),
      new StorageAuthStrategy(this.iamUrl, this.storage),
      new BrowserOAuthStrategy(this.iamUrl, this.storage),
    ];
  }

  /**
   * Login using various authentication methods
   * Automatically selects the appropriate strategy based on options
   *
   * @param options - Authentication options
   * @returns Authentication result with user and token
   * @throws Error if authentication fails or no suitable strategy found
   *
   * @example
   * // Token-based auth
   * const result = await auth.login({ token: 'abc123' });
   *
   * @example
   * // Credentials-based auth
   * const result = await auth.login({
   *   handle: 'user@example.com',
   *   password: 'secret'
   * });
   *
   * @example
   * // Storage-based auth (uses stored token)
   * const result = await auth.login({});
   */
  async login(options: AuthOptions = {}): Promise<AuthResult> {
    // Find the first strategy that can handle these options
    const strategy = this.strategies.find(s => s.canHandle(options));

    if (!strategy) {
      throw new Error(
        'No authentication strategy found for the provided options. ' +
          'Please provide a token, credentials (handle + password), or use browser OAuth.',
      );
    }

    try {
      const result = await strategy.authenticate(options);

      // Cache the user and token
      this.currentUser = result.user;
      this.currentToken = result.token;

      return result;
    } catch (error) {
      // Clear any cached data on failure
      this.currentUser = undefined;
      this.currentToken = undefined;

      throw error;
    }
  }

  /**
   * Logout the current user
   * Calls the logout API and clears stored tokens
   */
  async logout(): Promise<void> {
    if (this.currentToken) {
      try {
        await authentication.logout(this.currentToken, this.iamUrl);
      } catch (error) {
        console.error('Error during logout API call:', error);
        // Continue with local cleanup even if API call fails
      }
    }

    // Clear stored data
    if (this.storage.clear) {
      await this.storage.clear();
    }

    // Clear cached data
    this.currentUser = undefined;
    this.currentToken = undefined;
  }

  /**
   * Get the current user profile
   * Uses cached user if available, otherwise fetches from API
   *
   * @returns Current user or null if not authenticated
   */
  async whoami(): Promise<UserDTO | null> {
    if (this.currentUser) {
      return this.currentUser;
    }

    if (this.currentToken) {
      try {
        // Re-authenticate using the current token
        const result = await this.login({
          token: this.currentToken,
          noStore: true,
        });
        return result.user;
      } catch (error) {
        console.error('Failed to get user profile:', error);
        return null;
      }
    }

    return null;
  }

  /**
   * Validate a token
   * Checks if a token is valid by attempting to get the user profile
   *
   * @param token - Token to validate
   * @returns Validation result with user if valid
   */
  async validateToken(token: string): Promise<TokenValidationResult> {
    try {
      const result = await this.login({ token, noStore: true });
      return {
        valid: true,
        user: result.user,
      };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get the stored token from storage
   * @returns Stored token or null
   */
  getStoredToken(): string | null {
    if (!this.storage.getToken) {
      return null;
    }
    return this.storage.getToken();
  }

  /**
   * Store a token in storage
   * @param token - Token to store
   */
  storeToken(token: string): void {
    if (this.storage.setToken) {
      this.storage.setToken(token);
    }
    this.currentToken = token;
  }

  /**
   * Clear the stored token
   */
  clearStoredToken(): void {
    if (this.storage.deleteToken) {
      this.storage.deleteToken();
    }
    this.currentToken = undefined;
  }

  /**
   * Get the current cached user
   * @returns Current user or undefined
   */
  getCurrentUser(): UserDTO | undefined {
    return this.currentUser;
  }

  /**
   * Get the current token
   * @returns Current token or undefined
   */
  getCurrentToken(): string | undefined {
    return this.currentToken;
  }

  /**
   * Check if user is currently authenticated
   * @returns True if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.currentToken && !!this.currentUser;
  }
}
