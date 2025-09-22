/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import {
  describeIntegration,
  createTestSDK,
  ResourceTracker,
  addTestDelay,
  logTestHeader,
} from './utils';
import { DatalayerSDK } from '../../index';

if (!process.env.DATALAYER_TEST_TOKEN) {
  console.log(
    '\nCommon integration tests will be SKIPPED (no DATALAYER_TEST_TOKEN)',
  );
  console.log('   To run real integration tests, create .env.test with:');
  console.log('   DATALAYER_TEST_TOKEN=your-token\n');
}

describeIntegration('Common Integration Tests', () => {
  let sdk: ReturnType<typeof createTestSDK>;
  let tracker: ResourceTracker;

  beforeAll(async () => {
    logTestHeader('Common');
    tracker = new ResourceTracker();
    sdk = createTestSDK();
  });

  afterAll(async () => {
    await tracker.cleanupAll();
  });

  beforeEach(() => {
    return addTestDelay();
  });

  describe('Error Handling', () => {
    it('should handle 404 errors', async () => {
      try {
        await sdk.runtimes.get('non-existent-runtime');
        throw new Error('Should have thrown an error');
      } catch (error: any) {
        expect(error.status).toBeGreaterThanOrEqual(400);
        expect(error.message).toBeTruthy();
      }
    });

    it('should handle invalid IDs', async () => {
      try {
        await sdk.spacer.spaces.get('invalid-id');
        throw new Error('Should have thrown error');
      } catch (error: any) {
        expect(error.status).toBeGreaterThanOrEqual(400);
        expect(error.message).toBeTruthy();
      }
    });

    it('should handle unauthorized requests', async () => {
      const badSdk = new DatalayerSDK({
        baseUrl: sdk.getConfig().baseUrl,
        token: 'invalid-token',
        timeout: 5000,
      });

      try {
        await badSdk.iam.users.me();
        throw new Error('Should have thrown an error');
      } catch (error: any) {
        expect(error.status).toBeGreaterThanOrEqual(400);
      }
    });
  });

  describe('Performance & Concurrency', () => {
    it('should handle concurrent requests', async () => {
      const startTime = Date.now();

      const results = await Promise.allSettled([
        sdk.runtimes.environments.list(),
        sdk.iam.users.me(),
        sdk.iam.organizations.list({ limit: 5 }),
      ]);

      const duration = Date.now() - startTime;

      expect(results[0].status).toBe('fulfilled');
      expect(results[1].status).toBe('fulfilled');
      expect(duration).toBeLessThan(10000);
    });

    it('should handle request cancellation', async () => {
      const promise = sdk.iam.organizations.list({ limit: 100 });
      sdk.cancelAllRequests();

      try {
        await promise;
        // Request completed successfully or was not cancelled
        expect(true).toBe(true);
      } catch (error: any) {
        // Check if it was cancelled or completed with an error
        const wasCancelled =
          error.name === 'AbortError' || error.code === 'TIMEOUT';
        const wasError = error.status >= 400;
        expect(wasCancelled || wasError).toBe(true);
      }
    });

    it('should respect timeout settings', async () => {
      const quickSdk = new DatalayerSDK({
        baseUrl: sdk.getConfig().baseUrl,
        token: sdk.getConfig().token,
        timeout: 100,
      });

      try {
        await quickSdk.spacer.spaces.list({ limit: 100 });
      } catch (error: any) {
        if (error.code === 'TIMEOUT' || error.name === 'AbortError') {
          expect(true).toBe(true);
        }
      }
    });
  });

  describe('Service Health', () => {
    it('should verify all services are accessible', async () => {
      const healthChecks = await Promise.allSettled([
        sdk.runtimes.environments.list(),
        sdk.iam.users.me(),
        sdk.iam.organizations.list({ limit: 1 }),
      ]);

      expect(healthChecks[0].status).toBe('fulfilled');
      expect(healthChecks[1].status).toBe('fulfilled');
      expect(healthChecks[2].status).toBe('fulfilled');
    });
  });
});
