/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { DatalayerSDK } from '..';
import { testConfig } from '../../../__tests__/shared/test-config';
import { DEFAULT_SERVICE_URLS } from '../../../api/constants';

/**
 * SDK Health Integration Tests
 *
 * Tests health check functionality across all Datalayer services
 * using the SDK client.
 */
describe('SDK Health Integration Tests', () => {
  let sdk: DatalayerSDK;

  beforeAll(() => {
    if (!testConfig.hasToken()) {
      return;
    }

    sdk = new DatalayerSDK({
      token: testConfig.getToken(),
      iamRunUrl: DEFAULT_SERVICE_URLS.IAM,
      runtimesRunUrl: DEFAULT_SERVICE_URLS.RUNTIMES,
      spacerRunUrl: DEFAULT_SERVICE_URLS.SPACER,
    });
  });

  describe.skipIf(!testConfig.hasToken())('health check methods', () => {
    describe('individual service health checks', () => {
      it('should check IAM service health', async () => {
        console.log('Testing IAM health check...');
        const isHealthy = await sdk.isIAMHealthy();

        expect(isHealthy).toBe(true);
        console.log(`IAM service is ${isHealthy ? 'healthy' : 'unhealthy'}`);
      });

      it('should check Runtimes service health', async () => {
        console.log('Testing Runtimes health check...');
        const isHealthy = await sdk.isRuntimesHealthy();

        expect(isHealthy).toBe(true);
        console.log(
          `Runtimes service is ${isHealthy ? 'healthy' : 'unhealthy'}`,
        );
      });

      it('should check Spacer service health', async () => {
        console.log('Testing Spacer health check...');
        const isHealthy = await sdk.isSpacerHealthy();

        expect(isHealthy).toBe(true);
        console.log(`Spacer service is ${isHealthy ? 'healthy' : 'unhealthy'}`);
      });
    });

    describe('combined health checks', () => {
      it('should check all services health at once', async () => {
        console.log('Testing all services health check...');
        const allHealthy = await sdk.areAllServicesHealthy();

        expect(allHealthy).toBe(true);
        console.log(
          `All services are ${allHealthy ? 'healthy' : 'not all healthy'}`,
        );
      });

      it('should get detailed health status for all services', async () => {
        console.log('Getting detailed health status...');
        const status = await sdk.getHealthStatus();

        expect(status).toBeDefined();
        expect(status.iam).toBeDefined();
        expect(status.runtimes).toBeDefined();
        expect(status.spacer).toBeDefined();
        expect(status.allHealthy).toBeDefined();

        console.log('Health Status:');
        console.log(`  IAM: ${status.iam.healthy ? '✅' : '❌'}`);
        if (status.iam.version) {
          console.log(`    Version: ${status.iam.version}`);
        }
        console.log(`  Runtimes: ${status.runtimes.healthy ? '✅' : '❌'}`);
        if (status.runtimes.version) {
          console.log(`    Version: ${status.runtimes.version}`);
        }
        console.log(`  Spacer: ${status.spacer.healthy ? '✅' : '❌'}`);
        if (status.spacer.version) {
          console.log(`    Version: ${status.spacer.version}`);
        }
        console.log(
          `  Overall: ${status.allHealthy ? '✅ All Healthy' : '⚠️ Some Issues'}`,
        );
      });
    });

    describe('error handling', () => {
      it('should handle network errors gracefully', async () => {
        console.log('Testing health check with invalid URL...');

        // Create SDK with invalid URL
        const badSdk = new DatalayerSDK({
          token: testConfig.getToken(),
          iamRunUrl: 'https://invalid.example.com',
          runtimesRunUrl: DEFAULT_SERVICE_URLS.RUNTIMES,
          spacerRunUrl: DEFAULT_SERVICE_URLS.SPACER,
        });

        const isHealthy = await badSdk.isIAMHealthy();
        expect(isHealthy).toBe(false);

        const status = await badSdk.getHealthStatus();
        expect(status.iam.healthy).toBe(false);
        expect(status.allHealthy).toBe(false);

        console.log('Network error handled correctly');
      });
    });

    describe('configuration validation', () => {
      it('should use configured service URLs', async () => {
        console.log('Verifying SDK uses configured URLs...');

        // The SDK should be using the URLs we configured
        const config = sdk.getConfig();
        expect(config.iamRunUrl).toBe(DEFAULT_SERVICE_URLS.IAM);
        expect(config.runtimesRunUrl).toBe(DEFAULT_SERVICE_URLS.RUNTIMES);
        expect(config.spacerRunUrl).toBe(DEFAULT_SERVICE_URLS.SPACER);

        console.log('SDK configuration verified');
      });
    });
  });
});
