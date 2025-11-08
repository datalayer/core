/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * IAM mixin providing authentication and user management functionality.
 * @module client/mixins/IAMMixin
 */

import * as authentication from '../../api/iam/authentication';
import * as profile from '../../api/iam/profile';
import * as usage from '../../api/iam/usage';
import { loginWithBrowser } from '../auth/browserAuth';
import type { UserData as ApiUser } from '../../models/UserDTO';
import type { CreditsResponse } from '../../models/CreditsDTO';
import type { Constructor } from '../utils/mixins';
import { UserDTO } from '../../models/UserDTO';
import { CreditsDTO } from '../../models/CreditsDTO';
import { HealthCheck } from '../../models/HealthCheck';

/** IAM mixin providing authentication and user management. */
export function IAMMixin<TBase extends Constructor>(Base: TBase) {
  return class extends Base {
    // Cache for current user
    public currentUserCache?: UserDTO;

    /**
     * Get the current user's profile information.
     * @returns User model instance
     */
    async whoami(): Promise<UserDTO> {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const token = (this as any).getToken();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const iamRunUrl = (this as any).getIamRunUrl();

      const response = await profile.whoami(token, iamRunUrl);

      // Handle the whoami response format
      let userData: ApiUser;

      if (!response) {
        throw new Error(`No response from profile.whoami API`);
      }

      // Check if response has the expected wrapper structure with profile
      if (response.profile) {
        // Transform the API response to match the User model's expected data structure
        // Note: whoami returns fields with suffixes like _s, _t
        userData = {
          id: response.profile.id,
          uid: response.profile.uid,
          // User model expects fields with suffixes from API types
          handle_s: response.profile.handle_s || response.profile.handle,
          email_s: response.profile.email_s || response.profile.email,
          first_name_t:
            response.profile.first_name_t || response.profile.first_name || '',
          last_name_t:
            response.profile.last_name_t || response.profile.last_name || '',
          // Use avatar_url_s if available, otherwise leave undefined for fallback
          avatar_url_s:
            response.profile.avatar_url_s || response.profile.avatar_url,
        };
      }
      // Fallback for unexpected format
      else {
        throw new Error(
          `Unexpected response format from profile.whoami API: ${JSON.stringify(response)}`,
        );
      }

      // Create new User instance (User model is immutable, no update method)
      this.currentUserCache = new UserDTO(userData, this as any);

      return this.currentUserCache;
    }

    /**
     * Authenticate the user with a token.
     * @param token - Authentication token
     * @returns User object on successful login
     * @throws Error if token is invalid
     */
    async login(token: string): Promise<UserDTO> {
      // For token-based login, we simply set the token and verify it works
      await (this as any).setToken(token);

      // Verify the token by calling whoami
      try {
        const user = await this.whoami();
        return user;
      } catch (error) {
        // Clear the invalid token
        await (this as any).setToken('');
        throw new Error(
          `Invalid token: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    }

    /**
     * Login using browser OAuth flow (GitHub).
     * Opens a local HTTP server and browser for cross-platform OAuth authentication.
     *
     * @param _redirectUri - Not used in base implementation (kept for interface compatibility)
     * @param port - Optional port for local HTTP server (default: random available port)
     * @returns Promise resolving to authenticated user
     * @throws Error if authentication fails or times out
     *
     * @remarks
     * This implementation works cross-platform in Node.js environments:
     * - Starts local HTTP server on available port
     * - Opens system browser to OAuth URL
     * - Waits for callback with token
     * - Returns authenticated user
     *
     * Platform-specific integrations (like VS Code) can override this to use custom redirect URIs.
     *
     * @example
     * ```typescript
     * const user = await client.loginBrowser();
     * console.log(`Logged in as ${user.displayName}`);
     * ```
     *
     * @example VS Code override:
     * ```typescript
     * class VSCodeDatalayerClient extends DatalayerClient {
     *   async loginBrowser(redirectUri: string): Promise<UserDTO> {
     *     // Use vscode:// URI scheme for callback
     *     return super.loginBrowser(redirectUri);
     *   }
     * }
     * ```
     */
    async loginBrowser(_redirectUri?: string, port?: number): Promise<UserDTO> {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const iamUrl = (this as any).getIamRunUrl();

      try {
        // Use cross-platform browser auth
        const result = await loginWithBrowser({
          iamUrl,
          port,
        });

        // Set token in SDK
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (this as any).setToken(result.token);

        // Return user (already in correct format from OAuth)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this.currentUserCache = new UserDTO(result.user as any, this as any);
        return this.currentUserCache;
      } catch (error) {
        // Clear token on failure
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (this as any).setToken('');
        throw new Error(
          `Browser login failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    }

    /**
     * Login with username/email and password.
     * Authenticates with Datalayer platform using credentials.
     *
     * @param handle - Username or email address
     * @param password - User password
     * @returns User object on successful login
     * @throws Error if credentials are invalid or request fails
     *
     * @example
     * ```typescript
     * const user = await client.loginPassword('user@example.com', 'mypassword');
     * console.log(`Logged in as ${user.displayName}`);
     * ```
     */
    async loginPassword(handle: string, password: string): Promise<UserDTO> {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const iamRunUrl = (this as any).getIamRunUrl();

      try {
        // Call login API with credentials
        const response = await authentication.login(
          { handle, password },
          iamRunUrl,
        );

        if (!response.token) {
          throw new Error('Login response did not contain a token');
        }

        // Set token in SDK
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (this as any).setToken(response.token);

        // Return user from login response or fetch via whoami
        if (response.user) {
          // Transform user data to UserDTO
          const userData: ApiUser = {
            id: response.user.id,
            uid: response.user.uid,
            handle_s: response.user.handle_s || response.user.handle,
            email_s: response.user.email_s || response.user.email,
            first_name_t:
              response.user.first_name_t || response.user.first_name || '',
            last_name_t:
              response.user.last_name_t || response.user.last_name || '',
            avatar_url_s:
              response.user.avatar_url_s || response.user.avatar_url,
          };

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          this.currentUserCache = new UserDTO(userData, this as any);
          return this.currentUserCache;
        } else {
          // Fallback: verify token with whoami
          return await this.whoami();
        }
      } catch (error) {
        // Clear token on failure
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (this as any).setToken('');
        throw new Error(
          `Password login failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    }

    /**
     * Login with API token.
     * Validates token with whoami endpoint and sets it in the client.
     * This is an alias for the login() method for naming consistency.
     *
     * @param token - API authentication token
     * @returns User object on successful login
     * @throws Error if token is invalid
     *
     * @example
     * ```typescript
     * const user = await client.loginToken('dla_abc123...');
     * console.log(`Logged in as ${user.displayName}`);
     * ```
     */
    async loginToken(token: string): Promise<UserDTO> {
      // Delegate to existing login() method
      return this.login(token);
    }

    /** Log out the current user. */
    async logout(): Promise<void> {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const token = (this as any).getToken();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const iamRunUrl = (this as any).getIamRunUrl();
      await authentication.logout(token, iamRunUrl);
      // Clear the token from the SDK and cached user
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (this as any).setToken('');
      this.currentUserCache = undefined;
    }

    /**
     * Get the current user's available credits and usage information.
     * @returns Credits model instance
     */
    async getCredits(): Promise<CreditsDTO> {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const token = (this as any).getToken();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const iamRunUrl = (this as any).getIamRunUrl();

      const response: CreditsResponse = await usage.getCredits(
        token,
        iamRunUrl,
      );

      if (!response || !response.credits) {
        throw new Error('Invalid response from credits API');
      }

      return new CreditsDTO(response.credits, response.reservations || []);
    }

    // ========================================================================
    // Credits Calculation Utilities
    // ========================================================================

    /**
     * Calculate the maximum runtime duration in minutes based on available credits and burning rate.
     * @param availableCredits - The amount of credits available
     * @param burningRate - The burning rate per second for the environment
     * @returns Maximum runtime duration in minutes
     */
    calculateMaxRuntimeMinutes(
      availableCredits: number,
      burningRate: number,
    ): number {
      if (!burningRate || burningRate <= 0) return 0;
      const burningRatePerMinute = burningRate * 60;
      return Math.floor(availableCredits / burningRatePerMinute);
    }

    /**
     * Calculate the credits required for a given runtime duration.
     * @param minutes - Runtime duration in minutes
     * @param burningRate - The burning rate per second for the environment
     * @returns Credits required (rounded up to nearest integer)
     */
    calculateCreditsRequired(minutes: number, burningRate: number): number {
      if (!burningRate || burningRate <= 0 || !minutes || minutes <= 0)
        return 0;

      return Math.ceil(
        minutes * this.calculateBurningRatePerMinute(burningRate),
      );
    }

    /**
     * Calculate the burning rate per minute from the per-second rate.
     * @param burningRatePerSecond - The burning rate per second
     * @returns Burning rate per minute
     */
    calculateBurningRatePerMinute(burningRatePerSecond: number): number {
      return burningRatePerSecond * 60;
    }

    // ========================================================================
    // Service Health Checks
    // ========================================================================

    /**
     * Check the health status of the IAM service.
     * @returns Health check model instance
     */
    async checkIAMHealth(): Promise<HealthCheck> {
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

        return new HealthCheck(
          {
            healthy,
            status,
            responseTime,
            errors,
            timestamp: new Date(),
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          this as any,
        );
      } catch (error) {
        const responseTime = Date.now() - startTime;
        status = 'down';
        errors.push(`Service unreachable: ${error}`);

        return new HealthCheck(
          {
            healthy: false,
            status,
            responseTime,
            errors,
            timestamp: new Date(),
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          this as any,
        );
      }
    }
  };
}
