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
import type { User, LoginRequest, LoginResponse } from '../../../api/types/iam';
import type { Constructor } from '../utils/mixins';

/**
 * IAM mixin that provides authentication and user management functionality.
 *
 */
export function IAMMixin<TBase extends Constructor>(Base: TBase) {
  return class extends Base {
    /**
     * Get the current user's profile information.
     *
     * @returns Promise resolving to the current user's profile
     *
     * @example
     * ```typescript
     * const user = await sdk.whoami();
     * console.log('Current user:', user.username);
     * ```
     */
    async whoami(): Promise<User> {
      const iamRunUrl = (this as any).getIamRunUrl();
      const token = (this as any).getToken();

      if (!token) {
        throw new Error('Authentication token required');
      }

      const response = await profile.me(iamRunUrl, token);

      if (!response.success) {
        throw new Error(response.message || 'Failed to get user profile');
      }

      return response.user;
    }

    /**
     * Authenticate a user with email/password credentials.
     *
     * @param data - Login credentials
     * @returns Promise resolving to login response with tokens
     *
     * @example
     * ```typescript
     * const loginResponse = await sdk.login({
     *   email: 'user@example.com',
     *   password: 'secure-password'
     * });
     *
     * // Update SDK with new token
     * sdk.updateToken(loginResponse.access_token);
     * ```
     */
    async login(data: LoginRequest): Promise<LoginResponse> {
      const iamRunUrl = (this as any).getIamRunUrl();

      const response = await authentication.login(iamRunUrl, data);

      return response;
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
      const iamRunUrl = (this as any).getIamRunUrl();
      const token = (this as any).getToken();

      if (!token) {
        throw new Error('Authentication token required');
      }

      await authentication.logout(iamRunUrl, token);

      // Clear the token from the SDK
      (this as any).updateToken('');
    }
  };
}
