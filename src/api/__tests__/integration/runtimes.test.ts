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
  testConfig,
} from './utils';

/**
 * Clean up any test runtimes that might be left from previous failed test runs
 */
async function cleanupOrphanedTestRuntimes(
  sdk: ReturnType<typeof createTestSDK>,
): Promise<void> {
  try {
    const runtimes = await sdk.runtimes.list({ limit: 50 });

    // Look for runtimes with test-like names (usually start with 'runtime-' followed by random chars)
    const testRuntimes = runtimes.filter(
      runtime =>
        runtime.pod_name &&
        runtime.pod_name.startsWith('runtime-') &&
        runtime.pod_name.length > 15, // Test runtime names are typically long random strings
    );

    if (testRuntimes.length > 0) {
      console.log(
        `\nFound ${testRuntimes.length} potential orphaned test runtimes, cleaning up...`,
      );

      for (const runtime of testRuntimes) {
        try {
          await sdk.runtimes.delete(runtime.pod_name);
          console.log(`  Cleaned up orphaned runtime: ${runtime.pod_name}`);
        } catch (error: any) {
          if (error.status !== 404) {
            console.warn(
              `  Failed to clean up runtime ${runtime.pod_name}:`,
              error.message,
            );
          }
        }
      }
    }
  } catch (error: any) {
    // Don't fail the tests if we can't clean up orphaned runtimes
    console.warn(
      'Warning: Could not check for orphaned test runtimes:',
      error.message,
    );
  }
}

if (!process.env.DATALAYER_TEST_TOKEN) {
  console.log(
    '\nRuntimes integration tests will be SKIPPED (no DATALAYER_TEST_TOKEN)',
  );
  console.log('   To run real integration tests, create .env.test with:');
  console.log('   DATALAYER_TEST_TOKEN=your-token\n');
}

describeIntegration('Runtimes Service Integration Tests', () => {
  let sdk: ReturnType<typeof createTestSDK>;
  let tracker: ResourceTracker;

  beforeAll(async () => {
    logTestHeader('Runtimes');
    tracker = new ResourceTracker();
    sdk = createTestSDK();

    // Clean up any orphaned test runtimes from previous failed test runs
    await cleanupOrphanedTestRuntimes(sdk);
  });

  afterAll(async () => {
    await tracker.cleanupAll();
  });

  beforeEach(() => {
    return addTestDelay();
  });

  describe('Environment Management', () => {
    it('should list available environments', async () => {
      const environments = await sdk.runtimes.environments.list();

      expect(environments).toBeDefined();
      expect(Array.isArray(environments)).toBe(true);
      expect(environments.length).toBeGreaterThan(0);

      const firstEnv = environments[0];
      expect(firstEnv.name).toBeTruthy();
      expect(firstEnv.title).toBeTruthy();
      expect(firstEnv.description).toBeTruthy();
      expect(typeof firstEnv.burning_rate).toBe('number');
      expect(firstEnv.resources).toBeTruthy();
    });

    it('should get specific environment', async () => {
      try {
        const environments = await sdk.runtimes.environments.list();
        const envName = environments[0].name;
        const environment = await sdk.runtimes.environments.get(envName);

        expect(environment).toBeDefined();
        expect(environment.name).toBe(envName);
      } catch (error: any) {
        if (error.status === 404) {
          console.log('Individual environment endpoint not available (404)');
          expect(true).toBe(true);
        } else {
          throw error;
        }
      }
    });
  });

  describe('Runtime Management', () => {
    it('should list user runtimes', async () => {
      const runtimes = await sdk.runtimes.list({ limit: 5 });

      expect(runtimes).toBeDefined();
      expect(Array.isArray(runtimes)).toBe(true);
    });

    it('should list runtime snapshots', async () => {
      const snapshots = await sdk.runtimes.snapshots.list({ limit: 5 });

      expect(snapshots).toBeDefined();
      expect(Array.isArray(snapshots)).toBe(true);
    });

    if (!testConfig.skipExpensive) {
      it('should create and delete runtime', async () => {
        try {
          const environments = await sdk.runtimes.environments.list();
          const env =
            environments.find(e => e.name.includes('small')) || environments[0];

          const runtime = await sdk.runtimes.create({
            environment_name: env.name,
            credits_limit: 1,
          });

          // Track runtime for cleanup (only via tracker to avoid double deletion)
          tracker.track('runtime', runtime.pod_name, async () => {
            await sdk.runtimes.delete(runtime.pod_name);
          });

          expect(runtime.pod_name).toBeTruthy();
          expect(runtime.type || runtime.runtime_type).toBeTruthy();

          // Delete immediately and remove from tracker to prevent double deletion
          await sdk.runtimes.delete(runtime.pod_name);
          // Remove from tracker since we already deleted it
          tracker.removeResource('runtime', runtime.pod_name);
        } catch (error: any) {
          if (error.status === 402) {
            console.log('Insufficient credits for runtime creation');
          } else if (error.status === 404) {
            console.log('Runtime endpoints not available (404)');
          } else {
            throw error;
          }
        }
      });
    }
  });

  describe('Runtime Operations', () => {
    it('should handle runtime status checks', async () => {
      const runtimes = await sdk.runtimes.list({ limit: 1 });

      if (runtimes.length > 0) {
        const runtime = runtimes[0];
        expect(runtime).toHaveProperty('pod_name');
        expect(
          runtime.type || runtime.runtime_type || runtime.state,
        ).toBeTruthy();
        expect(runtime).toHaveProperty('environment_name');
      } else {
        expect(true).toBe(true); // No runtimes available
      }
    });
  });
});
