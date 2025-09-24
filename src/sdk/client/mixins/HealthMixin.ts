/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * @module sdk/client/mixins/HealthMixin
 * @description Health check functionality for the Datalayer SDK.
 *
 * Provides methods to check the health status of all Datalayer services.
 */

import { iam, runtimes, spacer } from '../../../api';
import type { DatalayerSDKBase } from '../base';

/**
 * Interface for health check methods.
 */
export interface HealthMixinInterface {
  /** Check if IAM service is healthy */
  isIAMHealthy(): Promise<boolean>;
  /** Check if Runtimes service is healthy */
  isRuntimesHealthy(): Promise<boolean>;
  /** Check if Spacer service is healthy */
  isSpacerHealthy(): Promise<boolean>;
  /** Check if all services are healthy */
  areAllServicesHealthy(): Promise<boolean>;
  /** Get detailed health status for all services */
  getHealthStatus(): Promise<{
    iam: { healthy: boolean; details?: any; error?: string };
    runtimes: { healthy: boolean; details?: any; error?: string };
    spacer: { healthy: boolean; details?: any; error?: string };
  }>;
}

/**
 * Mixin that provides health check functionality for the SDK.
 */
export function HealthMixin<T extends new (...args: any[]) => DatalayerSDKBase>(
  Base: T,
) {
  return class extends Base implements HealthMixinInterface {
    /**
     * Check if the IAM service is healthy.
     *
     * @returns True if service is healthy, false otherwise
     */
    async isIAMHealthy(): Promise<boolean> {
      try {
        await iam.healthz.ping(this.iamRunUrl);
        return true;
      } catch {
        return false;
      }
    }

    /**
     * Check if the Runtimes service is healthy.
     *
     * @returns True if service is healthy, false otherwise
     */
    async isRuntimesHealthy(): Promise<boolean> {
      try {
        await runtimes.healthz.ping(this.runtimesRunUrl);
        return true;
      } catch {
        return false;
      }
    }

    /**
     * Check if the Spacer service is healthy.
     *
     * @returns True if service is healthy, false otherwise
     */
    async isSpacerHealthy(): Promise<boolean> {
      try {
        await spacer.healthz.ping(this.spacerRunUrl);
        return true;
      } catch {
        return false;
      }
    }

    /**
     * Check if all Datalayer services are healthy.
     *
     * @returns True if all services are healthy, false otherwise
     */
    async areAllServicesHealthy(): Promise<boolean> {
      const [iamHealthy, runtimesHealthy, spacerHealthy] = await Promise.all([
        this.isIAMHealthy(),
        this.isRuntimesHealthy(),
        this.isSpacerHealthy(),
      ]);

      return iamHealthy && runtimesHealthy && spacerHealthy;
    }

    /**
     * Get detailed health status for all services.
     *
     * @returns Object containing health status and details for each service
     */
    async getHealthStatus(): Promise<{
      iam: {
        healthy: boolean;
        details?: any;
        error?: string;
        version?: string;
      };
      runtimes: {
        healthy: boolean;
        details?: any;
        error?: string;
        version?: string;
      };
      spacer: {
        healthy: boolean;
        details?: any;
        error?: string;
        version?: string;
      };
      allHealthy: boolean;
    }> {
      const [iamStatus, runtimesStatus, spacerStatus] =
        await Promise.allSettled([
          iam.healthz.ping(this.iamRunUrl),
          runtimes.healthz.ping(this.runtimesRunUrl),
          spacer.healthz.ping(this.spacerRunUrl),
        ]);

      const result = {
        iam: {
          healthy: false as boolean,
          details: undefined as any,
          error: undefined as string | undefined,
        },
        runtimes: {
          healthy: false as boolean,
          details: undefined as any,
          error: undefined as string | undefined,
        },
        spacer: {
          healthy: false as boolean,
          details: undefined as any,
          error: undefined as string | undefined,
        },
      };

      // Process IAM status
      if (iamStatus.status === 'fulfilled') {
        result.iam.healthy = true;
        result.iam.details = iamStatus.value;
        result.iam.version = iamStatus.value?.version;
      } else {
        result.iam.error = iamStatus.reason?.message || 'Unknown error';
      }

      // Process Runtimes status
      if (runtimesStatus.status === 'fulfilled') {
        result.runtimes.healthy = true;
        result.runtimes.details = runtimesStatus.value;
        result.runtimes.version = runtimesStatus.value?.version;
      } else {
        result.runtimes.error =
          runtimesStatus.reason?.message || 'Unknown error';
      }

      // Process Spacer status
      if (spacerStatus.status === 'fulfilled') {
        result.spacer.healthy = true;
        result.spacer.details = spacerStatus.value;
        result.spacer.version = spacerStatus.value?.version;
      } else {
        result.spacer.error = spacerStatus.reason?.message || 'Unknown error';
      }

      return {
        ...result,
        allHealthy:
          result.iam.healthy &&
          result.runtimes.healthy &&
          result.spacer.healthy,
      };
    }
  };
}
