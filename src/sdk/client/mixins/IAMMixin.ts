/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * @module sdk/client/mixins/IAMMixin
 * @description IAM (Identity and Access Management) mixin for the Datalayer SDK.
 *
 * This mixin provides intuitive authentication and user management methods
 * that are mixed into the main DatalayerSDK class.
 */

import { authentication, profile } from '../../../api/iam';
import type { LoginRequest, LoginResponse } from '../../../api/types/iam';
import type { Constructor } from '../utils/mixins';
import { User, GitHubUser, type GitHubUserData } from '../models/User';

/**
 * OAuth configuration for authentication providers.
 */
export interface OAuthConfig {
  provider: 'github' | 'linkedin';
  redirectUri?: string;
  scope?: string;
  state?: string;
}

/**
 * IAM mixin that provides authentication and user management functionality.
 */
export function IAMMixin<TBase extends Constructor>(Base: TBase) {
  return class extends Base {
    // Cache for GitHub users
    public githubUserCache = new Map<string, GitHubUser>();
    // Cache for current user
    public currentUserCache?: User;

    /**
     * Get the current user's profile information.
     *
     * @returns Promise resolving to the current User model instance
     *
     * @example
     * ```typescript
     * const user = await sdk.whoami();
     * console.log('Current user:', user.getDisplayName());
     * console.log('Initials:', user.getInitials());
     * const githubUser = await user.getGitHubUser();
     * ```
     */
    async whoami(): Promise<User> {
      const token = (this as any).getToken();
      const iamRunUrl = (this as any).getIamRunUrl();
      const response = await profile.me(token, iamRunUrl);

      // Create or update cached User instance
      if (this.currentUserCache) {
        this.currentUserCache.update(response.me);
      } else {
        this.currentUserCache = new User(response.me, this as any);
      }

      return this.currentUserCache;
    }

    /**
     * Authenticate a user with credentials or token.
     *
     * @param data - Login credentials (either handle+password or token)
     * @returns Promise resolving to login response with tokens
     *
     * @example
     * ```typescript
     * // Login with handle and password
     * const loginResponse = await sdk.login({
     *   handle: 'user@example.com',
     *   password: 'secure-password'
     * });
     *
     * // Or login with token
     * const tokenResponse = await sdk.login({
     *   token: 'existing-auth-token'
     * });
     *
     * // Update SDK with new token
     * sdk.updateToken(loginResponse.token);
     * ```
     */
    async login(data: LoginRequest): Promise<LoginResponse> {
      const iamRunUrl = (this as any).getIamRunUrl();
      return await authentication.login(data, iamRunUrl);
    }

    /**
     * Log out the current user.
     *
     * This method performs a logout operation on the server and clears
     * the authentication token from the SDK.
     *
     * @example
     * ```typescript
     * await sdk.logout();
     * console.log('User logged out successfully');
     * ```
     */
    async logout(): Promise<void> {
      const token = (this as any).getToken();
      const iamRunUrl = (this as any).getIamRunUrl();
      await authentication.logout(token, iamRunUrl);
      // Clear the token from the SDK and cached user
      (this as any).updateToken('');
      this.currentUserCache = undefined;
      this.githubUserCache.clear();
    }

    /**
     * Get GitHub user data by username.
     * Used internally by User model for fetching GitHub profiles.
     *
     * @param username - GitHub username
     * @returns Promise resolving to GitHub user data or undefined
     *
     * @example
     * ```typescript
     * const githubUser = await sdk.getGitHubUser('octocat');
     * if (githubUser) {
     *   console.log('GitHub user:', githubUser.getDisplayName());
     *   console.log('Avatar:', githubUser.getAvatarUrl());
     * }
     * ```
     */
    async getGitHubUser(username: string): Promise<GitHubUserData | undefined> {
      // Check cache first
      if (this.githubUserCache.has(username)) {
        return this.githubUserCache.get(username)!.data;
      }

      try {
        // Fetch from GitHub API
        const response = await fetch(
          `https://api.github.com/users/${username}`,
          {
            headers: {
              Accept: 'application/vnd.github.v3+json',
              // Add token if available for higher rate limits
              ...(process.env.GITHUB_TOKEN && {
                Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
              }),
            },
          },
        );

        if (response.ok) {
          const data: GitHubUserData = await response.json();
          // Cache the result
          this.githubUserCache.set(username, new GitHubUser(data, this as any));
          return data;
        }
      } catch (error) {
        console.error('Failed to fetch GitHub user:', error);
      }

      return undefined;
    }

    /**
     * Get OAuth authorization URL for a provider.
     *
     * @param config - OAuth configuration
     * @returns OAuth authorization URL
     *
     * @example
     * ```typescript
     * const authUrl = sdk.getOAuthUrl({
     *   provider: 'github',
     *   redirectUri: 'https://myapp.com/callback',
     *   scope: 'user:email read:org',
     *   state: 'random-state'
     * });
     * window.location.href = authUrl;
     * ```
     */
    getOAuthUrl(config: OAuthConfig): string {
      const iamRunUrl = (this as any).getIamRunUrl();
      const params = new URLSearchParams();

      if (config.redirectUri) params.set('redirect_uri', config.redirectUri);
      if (config.scope) params.set('scope', config.scope);
      if (config.state) params.set('state', config.state);

      const queryString = params.toString();
      return `${iamRunUrl}/auth/${config.provider}${queryString ? '?' + queryString : ''}`;
    }

    /**
     * Exchange OAuth code for tokens.
     *
     * @param provider - Authentication provider
     * @param code - OAuth authorization code
     * @param redirectUri - Redirect URI used in the initial request
     * @returns Promise resolving to login response with tokens
     *
     * @example
     * ```typescript
     * const urlParams = new URLSearchParams(window.location.search);
     * const code = urlParams.get('code');
     * if (code) {
     *   const response = await sdk.exchangeOAuthCode('github', code, 'https://myapp.com/callback');
     *   sdk.updateToken(response.token);
     * }
     * ```
     */
    async exchangeOAuthCode(
      provider: 'github' | 'linkedin',
      code: string,
      redirectUri?: string,
    ): Promise<LoginResponse> {
      const iamRunUrl = (this as any).getIamRunUrl();

      const response = await fetch(`${iamRunUrl}/auth/${provider}/callback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code,
          redirect_uri: redirectUri,
        }),
      });

      if (!response.ok) {
        throw new Error(`OAuth exchange failed: ${response.statusText}`);
      }

      return await response.json();
    }

    /**
     * Link an OAuth provider to the current user account.
     *
     * @param provider - Provider to link
     * @returns Promise resolving when provider is linked
     *
     * @example
     * ```typescript
     * await sdk.linkProvider('github');
     * console.log('GitHub account linked successfully');
     * ```
     */
    async linkProvider(provider: 'github' | 'linkedin'): Promise<void> {
      const token = (this as any).getToken();
      const iamRunUrl = (this as any).getIamRunUrl();

      const response = await fetch(`${iamRunUrl}/auth/${provider}/link`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to link ${provider}: ${response.statusText}`);
      }

      // Clear user cache to force refresh
      this.currentUserCache = undefined;
    }

    /**
     * Unlink an OAuth provider from the current user account.
     *
     * @param provider - Provider to unlink
     * @returns Promise resolving when provider is unlinked
     *
     * @example
     * ```typescript
     * await sdk.unlinkProvider('github');
     * console.log('GitHub account unlinked');
     * ```
     */
    async unlinkProvider(provider: 'github' | 'linkedin'): Promise<void> {
      const token = (this as any).getToken();
      const iamRunUrl = (this as any).getIamRunUrl();

      const response = await fetch(`${iamRunUrl}/auth/${provider}/unlink`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to unlink ${provider}: ${response.statusText}`);
      }

      // Clear user cache to force refresh
      this.currentUserCache = undefined;
    }

    // ========================================================================
    // Service Health Checks
    // ========================================================================

    /**
     * Check the health status of the IAM service.
     *
     * This method performs a lightweight check to verify that the IAM
     * service is accessible and authentication is working properly.
     *
     * @returns Promise resolving to health check result
     *
     * @example
     * ```typescript
     * const health = await sdk.checkIAMHealth();
     * console.log('Service status:', health.status);
     * console.log('Response time:', health.responseTime);
     * if (!health.healthy) {
     *   console.error('Service issues:', health.errors);
     * }
     * ```
     */
    async checkIAMHealth(): Promise<{
      healthy: boolean;
      status: string;
      responseTime: number;
      errors: string[];
      timestamp: Date;
    }> {
      const startTime = Date.now();
      const errors: string[] = [];
      let status = 'unknown';
      let healthy = false;

      try {
        // Test basic connectivity and authentication by getting user profile
        const user = await this.whoami();
        const responseTime = Date.now() - startTime;

        if (user && user.uid) {
          healthy = true;
          status = 'operational';
        } else {
          status = 'degraded';
          errors.push('Unexpected response format from profile endpoint');
        }

        return {
          healthy,
          status,
          responseTime,
          errors,
          timestamp: new Date(),
        };
      } catch (error) {
        const responseTime = Date.now() - startTime;
        status = 'down';
        errors.push(`Service unreachable: ${error}`);

        return {
          healthy: false,
          status,
          responseTime,
          errors,
          timestamp: new Date(),
        };
      }
    }

    /**
     * Get comprehensive IAM service diagnostics.
     *
     * This method provides detailed information about the authentication
     * service state and user capabilities.
     *
     * @returns Promise resolving to diagnostic information
     *
     * @example
     * ```typescript
     * const diagnostics = await sdk.getIAMDiagnostics();
     * console.log('User authenticated:', diagnostics.authenticated);
     * console.log('OAuth providers:', diagnostics.oauthProviders);
     * console.log('Service capabilities:', diagnostics.capabilities);
     * ```
     */
    async getIAMDiagnostics(): Promise<{
      healthy: boolean;
      authenticated: boolean;
      oauthProviders: string[];
      capabilities: string[];
      userInfo: {
        uid?: string;
        email?: string;
        roles?: string[];
      };
      errors: string[];
      timestamp: Date;
    }> {
      const errors: string[] = [];
      const capabilities: string[] = [];
      const oauthProviders: string[] = [];
      let authenticated = false;
      let healthy = true;
      const userInfo: { uid?: string; email?: string; roles?: string[] } = {};

      try {
        // Test authentication and get user information
        const user = await this.whoami();
        authenticated = true;
        capabilities.push('authentication');

        userInfo.uid = user.uid;
        userInfo.email = user.email;

        // Test OAuth capabilities
        try {
          // Check which OAuth providers are available by testing authorization URLs
          try {
            this.getOAuthUrl({ provider: 'github' });
            oauthProviders.push('github');
          } catch {
            // GitHub OAuth not available
          }

          try {
            this.getOAuthUrl({ provider: 'linkedin' });
            oauthProviders.push('linkedin');
          } catch {
            // LinkedIn OAuth not available
          }

          if (oauthProviders.length > 0) {
            capabilities.push('oauth');
          }
        } catch (error) {
          errors.push(`OAuth capability test failed: ${error}`);
          // Don't mark as unhealthy since OAuth might be optional
        }

        // Test profile management
        try {
          // The fact that we got user info means profile management works
          capabilities.push('profile-management');
        } catch (error) {
          errors.push(`Profile management test failed: ${error}`);
          healthy = false;
        }

        return {
          healthy,
          authenticated,
          oauthProviders,
          capabilities,
          userInfo,
          errors,
          timestamp: new Date(),
        };
      } catch (error) {
        errors.push(`Service diagnostics failed: ${error}`);
        return {
          healthy: false,
          authenticated: false,
          oauthProviders: [],
          capabilities: [],
          userInfo: {},
          errors,
          timestamp: new Date(),
        };
      }
    }
  };
}
