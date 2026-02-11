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
import * as secrets from '../../api/iam/secrets';
import * as datasources from '../../api/iam/datasources';
import type { UserData as ApiUser } from '../../models/UserDTO';
import type { CreditsResponse } from '../../models/CreditsDTO';
import type { Constructor } from '../utils/mixins';
import { UserDTO } from '../../models/UserDTO';
import { CreditsDTO } from '../../models/CreditsDTO';
import { HealthCheck } from '../../models/HealthCheck';
import { SecretDTO } from '../../models/Secret';
import type {
  CreateSecretRequest,
  UpdateSecretRequest,
} from '../../models/Secret';
import { DatasourceDTO } from '../../models/Datasource';
import type {
  CreateDatasourceRequest,
  UpdateDatasourceRequest,
} from '../../models/Datasource';

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

    /** Log out the current user. */
    async logout(): Promise<void> {
      const token = (this as any).getToken();
      const iamRunUrl = (this as any).getIamRunUrl();
      await authentication.logout(token, iamRunUrl);
      // Clear the token from the Client and cached user
      (this as any).setToken('');
      this.currentUserCache = undefined;
    }

    /**
     * Get the current user's available credits and usage information.
     * @returns Credits model instance
     */
    async getCredits(): Promise<CreditsDTO> {
      const token = (this as any).getToken();
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
          this as any,
        );
      }
    }

    // ========================================================================
    // Secrets Management
    // ========================================================================

    /**
     * Create a new secret.
     * @param data - Secret configuration
     * @returns Created secret instance
     */
    async createSecret(data: CreateSecretRequest): Promise<SecretDTO> {
      const token = (this as any).getToken();
      const iamRunUrl = (this as any).getIamRunUrl();

      const response = await secrets.createSecret(token, data, iamRunUrl);
      return new SecretDTO(response.secret, this as any);
    }

    /**
     * List all secrets.
     * @returns Array of secret instances
     */
    async listSecrets(): Promise<SecretDTO[]> {
      const token = (this as any).getToken();
      const iamRunUrl = (this as any).getIamRunUrl();

      const response = await secrets.listSecrets(token, iamRunUrl);
      return response.secrets.map(s => new SecretDTO(s, this as any));
    }

    /**
     * Get a specific secret by ID.
     * @param secretId - Secret unique identifier
     * @returns Secret instance
     */
    async getSecret(secretId: string): Promise<SecretDTO> {
      const token = (this as any).getToken();
      const iamRunUrl = (this as any).getIamRunUrl();

      const response = await secrets.getSecret(token, secretId, iamRunUrl);
      return new SecretDTO(response.secret, this as any);
    }

    /**
     * Update a secret.
     * @param secretId - Secret unique identifier
     * @param updates - Fields to update
     * @returns Updated secret instance
     */
    async updateSecret(
      secretId: string,
      updates: UpdateSecretRequest,
    ): Promise<SecretDTO> {
      const token = (this as any).getToken();
      const iamRunUrl = (this as any).getIamRunUrl();

      const response = await secrets.updateSecret(
        token,
        secretId,
        updates,
        iamRunUrl,
      );
      return new SecretDTO(response.secret, this as any);
    }

    /**
     * Delete a secret.
     * @param secretId - Secret unique identifier
     */
    async deleteSecret(secretId: string): Promise<void> {
      const token = (this as any).getToken();
      const iamRunUrl = (this as any).getIamRunUrl();

      await secrets.deleteSecret(token, secretId, iamRunUrl);
    }

    // ========================================================================
    // Datasources Management
    // ========================================================================

    /**
     * Create a new datasource.
     * @param data - Datasource configuration
     * @returns Created datasource instance
     */
    async createDatasource(
      data: CreateDatasourceRequest,
    ): Promise<DatasourceDTO> {
      const token = (this as any).getToken();
      const iamRunUrl = (this as any).getIamRunUrl();

      const response = await datasources.createDatasource(
        token,
        data,
        iamRunUrl,
      );
      return new DatasourceDTO(response.datasource, this as any);
    }

    /**
     * List all datasources.
     * @returns Array of datasource instances
     */
    async listDatasources(): Promise<DatasourceDTO[]> {
      const token = (this as any).getToken();
      const iamRunUrl = (this as any).getIamRunUrl();

      const response = await datasources.listDatasources(token, iamRunUrl);
      return response.datasources.map(d => new DatasourceDTO(d, this as any));
    }

    /**
     * Get a specific datasource by ID.
     * @param datasourceId - Datasource unique identifier
     * @returns Datasource instance
     */
    async getDatasource(datasourceId: string): Promise<DatasourceDTO> {
      const token = (this as any).getToken();
      const iamRunUrl = (this as any).getIamRunUrl();

      const response = await datasources.getDatasource(
        token,
        datasourceId,
        iamRunUrl,
      );
      return new DatasourceDTO(response.datasource, this as any);
    }

    /**
     * Update a datasource.
     * @param datasourceId - Datasource unique identifier
     * @param updates - Fields to update
     * @returns Updated datasource instance
     */
    async updateDatasource(
      datasourceId: string,
      updates: UpdateDatasourceRequest,
    ): Promise<DatasourceDTO> {
      const token = (this as any).getToken();
      const iamRunUrl = (this as any).getIamRunUrl();

      const response = await datasources.updateDatasource(
        token,
        datasourceId,
        updates,
        iamRunUrl,
      );
      return new DatasourceDTO(response.datasource, this as any);
    }

    /**
     * Delete a datasource.
     * @param datasourceId - Datasource unique identifier
     */
    async deleteDatasource(datasourceId: string): Promise<void> {
      const token = (this as any).getToken();
      const iamRunUrl = (this as any).getIamRunUrl();

      await datasources.deleteDatasource(token, datasourceId, iamRunUrl);
    }
  };
}
