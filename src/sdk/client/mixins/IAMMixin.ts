/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * IAM mixin providing authentication and user management functionality.
 * @module sdk/client/mixins/IAMMixin
 */

import * as authentication from '../../../api/iam/authentication';
import * as profile from '../../../api/iam/profile';
import * as credits from '../../../api/iam/credits';
import type {
  LoginRequest,
  LoginResponse,
  User as ApiUser,
} from '../../../api/types/iam';
import type { CreditsResponse } from '../../../api/iam/credits';
import type { Constructor } from '../utils/mixins';
import { User } from '../models/User';
import { Credits } from '../models/Credits';

/** IAM mixin providing authentication and user management. */
export function IAMMixin<TBase extends Constructor>(Base: TBase) {
  return class extends Base {
    // Cache for current user
    public currentUserCache?: User;

    /**
     * Get the current user's profile information.
     * @returns User model instance
     */
    async whoami(): Promise<User> {
      const token = (this as any).getToken();
      const iamRunUrl = (this as any).getIamRunUrl();

      console.log(
        '[IAMMixin] whoami called with token:',
        token ? 'present' : 'missing',
      );
      console.log('[IAMMixin] IAM URL:', iamRunUrl);

      let response;
      try {
        response = await profile.whoami(token, iamRunUrl);
        console.log('[IAMMixin] API raw response:', response);
        console.log('[IAMMixin] Response type:', typeof response);
        console.log(
          '[IAMMixin] Response keys:',
          response ? Object.keys(response) : 'null',
        );
      } catch (error) {
        console.error('[IAMMixin] API call failed:', error);
        throw error;
      }

      // Handle the whoami response format
      let userData: ApiUser;

      if (!response) {
        console.error('[IAMMixin] No response received from API');
        throw new Error(`No response from profile.whoami API`);
      }

      // Check if response has the expected wrapper structure with profile
      if (response.profile) {
        console.log(
          '[IAMMixin] Response has wrapper structure with .profile property',
        );
        // Transform the API response to match the User interface
        // Note: whoami returns fields with suffixes like _s, _t
        userData = {
          id: response.profile.id,
          uid: response.profile.uid,
          email: response.profile.email_s,
          handle: response.profile.handle_s,
          first_name: response.profile.first_name_t,
          last_name: response.profile.last_name_t,
          // whoami doesn't return avatar_url, so we leave it undefined
          avatar_url: undefined,
        };
      }
      // Fallback for unexpected format
      else {
        console.error('[IAMMixin] Unexpected response format:', response);
        throw new Error(
          `Unexpected response format from profile.whoami API: ${JSON.stringify(response)}`,
        );
      }

      // Create or update cached User instance
      if (this.currentUserCache) {
        this.currentUserCache.update(userData);
      } else {
        this.currentUserCache = new User(userData, this as any);
      }

      return this.currentUserCache;
    }

    /**
     * Authenticate a user with credentials or token.
     * @param data - Login credentials
     * @returns Login response with tokens
     */
    async login(data: LoginRequest): Promise<LoginResponse> {
      const iamRunUrl = (this as any).getIamRunUrl();
      return await authentication.login(data, iamRunUrl);
    }

    /** Log out the current user. */
    async logout(): Promise<void> {
      const token = (this as any).getToken();
      const iamRunUrl = (this as any).getIamRunUrl();
      await authentication.logout(token, iamRunUrl);
      // Clear the token from the SDK and cached user
      (this as any).updateToken('');
      this.currentUserCache = undefined;
    }

    /**
     * Get the current user's available credits and usage information.
     * @returns Credits model instance
     */
    async getCredits(): Promise<Credits> {
      const token = (this as any).getToken();
      const iamRunUrl = (this as any).getIamRunUrl();

      const response: CreditsResponse = await credits.getCredits(
        token,
        iamRunUrl,
      );

      if (!response || !response.credits) {
        throw new Error('Invalid response from credits API');
      }

      return new Credits(response.credits, response.reservations || []);
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
      if (burningRate <= 0) return 0;
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
      if (burningRate <= 0 || minutes <= 0) return 0;
      const burningRatePerMinute = burningRate * 60;
      return Math.ceil(minutes * burningRatePerMinute);
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
     * @returns Health check result with status and response time
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
  };
}
