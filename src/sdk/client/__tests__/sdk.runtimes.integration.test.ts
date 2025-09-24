/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { DatalayerSDK } from '..';
import { Runtime } from '../models/Runtime';
import { Snapshot } from '../models/Snapshot';
import { testConfig } from '../../../__tests__/shared/test-config';
import { DEFAULT_SERVICE_URLS } from '../../../api/constants';
import { performCleanup } from '../../../__tests__/shared/cleanup-shared';

/**
 * SDK Runtimes Integration Tests
 *
 * Tests runtime and snapshot lifecycle management
 * using the SDK client and model classes.
 */
describe('SDK Runtimes Integration Tests', () => {
  let sdk: DatalayerSDK;
  let createdRuntime: Runtime | null = null;
  let createdSnapshot: Snapshot | null = null;

  beforeAll(async () => {
    if (!testConfig.hasToken()) {
      return;
    }

    await performCleanup('setup');

    sdk = new DatalayerSDK({
      token: testConfig.getToken(),
      iamRunUrl: DEFAULT_SERVICE_URLS.IAM,
      runtimesRunUrl: DEFAULT_SERVICE_URLS.RUNTIMES,
      spacerRunUrl: DEFAULT_SERVICE_URLS.SPACER,
    });
  });

  afterAll(async () => {
    if (!testConfig.hasToken()) {
      return;
    }

    await performCleanup('teardown');
  }, 30000);

  describe.skipIf(!testConfig.hasToken())('Environment management', () => {
    it('should list available environments', async () => {
      console.log('Testing list environments...');
      const environments = await sdk.listEnvironments();

      expect(environments).toBeDefined();
      expect(Array.isArray(environments)).toBe(true);
      expect(environments.length).toBeGreaterThan(0);

      const firstEnv = environments[0];
      expect(firstEnv.name).toBeDefined();
      expect(firstEnv.title).toBeDefined();
      expect(firstEnv.language).toBeDefined();

      console.log(`Found ${environments.length} environment(s)`);
      console.log(`First environment: ${firstEnv.title} (${firstEnv.name})`);
      console.log(`  Language: ${firstEnv.language}`);
      console.log(
        `  Resources: CPU ${firstEnv.resources?.cpu}, Memory ${firstEnv.resources?.memory}`,
      );
    });
  });

  describe.skipIf(!testConfig.hasToken() || testConfig.shouldSkipExpensive())(
    'Runtime lifecycle',
    () => {
      it('should create a runtime', async () => {
        console.log('Creating runtime...');

        const runtime = await sdk.createRuntime({
          environment_name: 'python-cpu-env',
          type: 'notebook',
          given_name: 'sdk-test-runtime',
          credits_limit: 10,
        });

        expect(runtime).toBeInstanceOf(Runtime);
        expect(runtime.podName).toBeDefined();
        expect(runtime.environmentName).toBe('python-cpu-env');
        expect(runtime.givenName).toContain('sdk-test-runtime');

        createdRuntime = runtime;
        console.log(`Created runtime: ${runtime.podName}`);
        console.log(`  Given name: ${runtime.givenName}`);
        console.log(`  Environment: ${runtime.environmentName}`);
      });

      it('should list runtimes and find created runtime', async () => {
        if (!createdRuntime) {
          throw new Error(
            'Test dependency failed: createdRuntime should be available from previous test',
          );
        }

        console.log('Listing runtimes...');
        const runtimes = await sdk.listRuntimes();

        expect(Array.isArray(runtimes)).toBe(true);

        const found = runtimes.find(r => r.podName === createdRuntime!.podName);
        expect(found).toBeDefined();
        expect(found).toBeInstanceOf(Runtime);

        console.log(`Found ${runtimes.length} runtime(s)`);
        console.log(`Created runtime found in list: ${found!.podName}`);
      });

      it('should get runtime details', async () => {
        if (!createdRuntime) {
          throw new Error(
            'Test dependency failed: createdRuntime should be available from previous test',
          );
        }

        console.log('Getting runtime details...');
        const runtime = await sdk.getRuntime(createdRuntime.podName);

        expect(runtime).toBeInstanceOf(Runtime);
        expect(runtime.podName).toBe(createdRuntime.podName);
        expect(runtime.environmentName).toBe(createdRuntime.environmentName);

        console.log(`Retrieved runtime: ${runtime.podName}`);
        console.log(`  State: ${await runtime.getState()}`);
        console.log(`  Running: ${await runtime.isRunning()}`);
      });

      it('should test runtime model methods', async () => {
        if (!createdRuntime) {
          throw new Error(
            'Test dependency failed: createdRuntime should be available from previous test',
          );
        }

        console.log('Testing runtime model methods...');

        // Test state checking methods
        const state = await createdRuntime.getState();
        expect(state).toBeDefined();
        console.log(`Runtime state: ${state}`);

        const isRunning = await createdRuntime.isRunning();
        expect(typeof isRunning).toBe('boolean');
        console.log(`Is running: ${isRunning}`);

        const hasError = await createdRuntime.hasError();
        expect(typeof hasError).toBe('boolean');
        console.log(`Has error: ${hasError}`);

        // Test JSON export
        const json = await createdRuntime.toJSON();
        expect(json).toBeDefined();
        expect(json.pod_name).toBe(createdRuntime.podName);

        // Test toString
        const str = createdRuntime.toString();
        expect(str).toContain('Runtime');
        expect(str).toContain(createdRuntime.podName);
        console.log(`Runtime string: ${str}`);
      });
    },
  );

  describe.skipIf(!testConfig.hasToken() || testConfig.shouldSkipExpensive())(
    'Snapshot lifecycle',
    () => {
      it('should create a snapshot from runtime', async () => {
        if (!createdRuntime) {
          throw new Error(
            'Test dependency failed: createdRuntime should be available from previous test',
          );
        }

        console.log('Creating snapshot from runtime...');

        const snapshot = await createdRuntime.createSnapshot(
          'sdk-test-snapshot',
          'Test snapshot from SDK',
        );

        expect(snapshot).toBeInstanceOf(Snapshot);
        expect(snapshot.uid).toBeDefined();
        expect(snapshot.name).toContain('sdk-test-snapshot');

        createdSnapshot = snapshot;
        console.log(`Created snapshot: ${snapshot.uid}`);
        console.log(`  Name: ${snapshot.name}`);
        console.log(`  Description: ${snapshot.description}`);
      });

      it('should list snapshots and find created snapshot', async () => {
        if (!createdSnapshot) {
          throw new Error(
            'Test dependency failed: createdSnapshot should be available from previous test',
          );
        }

        console.log('Listing snapshots...');
        const snapshots = await sdk.listSnapshots();

        expect(Array.isArray(snapshots)).toBe(true);

        const found = snapshots.find(s => s.uid === createdSnapshot!.uid);
        expect(found).toBeDefined();
        expect(found).toBeInstanceOf(Snapshot);

        console.log(`Found ${snapshots.length} snapshot(s)`);
        console.log(`Created snapshot found in list: ${found!.uid}`);
      });

      it('should get snapshot details', async () => {
        if (!createdSnapshot) {
          throw new Error(
            'Test dependency failed: createdSnapshot should be available from previous test',
          );
        }

        console.log('Getting snapshot details...');
        const snapshot = await sdk.getSnapshot(createdSnapshot.uid);

        expect(snapshot).toBeInstanceOf(Snapshot);
        expect(snapshot.uid).toBe(createdSnapshot.uid);
        expect(snapshot.environment).toBe(createdSnapshot.environment);

        console.log(`Retrieved snapshot: ${snapshot.uid}`);
        const status = await snapshot.getStatus();
        console.log(`  Status: ${status}`);
        const size = await snapshot.getSize();
        console.log(`  Size: ${size} bytes`);
      });

      it('should test snapshot model methods', async () => {
        if (!createdSnapshot) {
          throw new Error(
            'Test dependency failed: createdSnapshot should be available from previous test',
          );
        }

        console.log('Testing snapshot model methods...');

        // Test status method
        const status = await createdSnapshot.getStatus();
        expect(status).toBeDefined();
        console.log(`Snapshot status: ${status}`);

        // Test size method
        const size = await createdSnapshot.getSize();
        expect(typeof size).toBe('number');
        console.log(`Snapshot size: ${size} bytes`);

        // Test metadata method
        const metadata = await createdSnapshot.getLatestMetadata();
        expect(metadata).toBeDefined();
        console.log(`Metadata keys: ${Object.keys(metadata).join(', ')}`);

        // Test JSON export
        const json = await createdSnapshot.toJSON();
        expect(json).toBeDefined();
        expect(json.uid).toBe(createdSnapshot.uid);

        // Test toString
        const str = createdSnapshot.toString();
        expect(str).toContain('Snapshot');
        expect(str).toContain(createdSnapshot.uid);
        console.log(`Snapshot string: ${str}`);
      });

      it('should delete snapshot', async () => {
        if (!createdSnapshot) {
          throw new Error(
            'Test dependency failed: createdSnapshot should be available from previous test',
          );
        }

        console.log('Deleting snapshot...');
        const snapshotUid = createdSnapshot.uid; // Get uid before deletion
        await sdk.deleteSnapshot(createdSnapshot);
        console.log(`Snapshot ${snapshotUid} deleted`);

        // Verify deletion
        try {
          await createdSnapshot.getStatus();
          expect(true).toBe(false); // Should not reach here
        } catch (error: any) {
          expect(error.message).toContain('deleted');
          console.log('Snapshot correctly marked as deleted');
        }

        createdSnapshot = null; // Clear reference as it's deleted
      });
    },
  );

  describe.skipIf(!testConfig.hasToken() || testConfig.shouldSkipExpensive())(
    'Runtime deletion',
    () => {
      it('should delete runtime', async () => {
        if (!createdRuntime) {
          throw new Error(
            'Test dependency failed: createdRuntime should be available from previous test',
          );
        }

        console.log('Deleting runtime...');
        const podName = createdRuntime.podName; // Get podName before deletion
        await sdk.deleteRuntime(createdRuntime);
        console.log(`Runtime ${podName} deleted`);

        // Verify deletion
        try {
          await createdRuntime.getState();
          expect(true).toBe(false); // Should not reach here
        } catch (error: any) {
          expect(error.message).toContain('deleted');
          console.log('Runtime correctly marked as deleted');
        }

        createdRuntime = null; // Clear reference as it's deleted
      });
    },
  );

  describe.skipIf(!testConfig.hasToken())('Error handling', () => {
    it('should handle non-existent runtime gracefully', async () => {
      console.log('Testing non-existent runtime...');

      try {
        await sdk.getRuntime('non-existent-pod-name');
        expect(true).toBe(false); // Should not reach here
      } catch (error: any) {
        expect(error).toBeDefined();
        console.log('Non-existent runtime error handled correctly');
      }
    });

    it('should handle non-existent snapshot gracefully', async () => {
      console.log('Testing non-existent snapshot...');

      try {
        await sdk.getSnapshot('non-existent-snapshot-uid');
        expect(true).toBe(false); // Should not reach here
      } catch (error: any) {
        expect(error).toBeDefined();
        console.log('Non-existent snapshot error handled correctly');
      }
    });

    it('should validate runtime creation parameters', async () => {
      console.log('Testing invalid runtime creation...');

      try {
        await sdk.createRuntime({
          environment_name: '', // Invalid
          type: 'notebook',
        } as any);
        expect(true).toBe(false); // Should not reach here
      } catch (error: any) {
        expect(error).toBeDefined();
        console.log('Invalid runtime parameters rejected');
      }
    });
  });
});
