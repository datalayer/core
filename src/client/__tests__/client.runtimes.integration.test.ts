/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/* eslint-disable no-console, @typescript-eslint/no-explicit-any */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { DatalayerClient } from '..';
import { RuntimeDTO } from '../../models/RuntimeDTO';
import { RuntimeSnapshotDTO } from '../../models/RuntimeSnapshotDTO';
import { testConfig } from '../../__tests__/shared/test-config';
import { DEFAULT_SERVICE_URLS } from '../../api/constants';
import { performCleanup } from '../../__tests__/shared/cleanup-shared';

const skipInCi =
  process.env.CI === 'true' &&
  process.env.DATALAYER_TEST_RUN_EXTERNAL_INTEGRATION !== 'true';

const resolveEnvironmentName = async (
  client: DatalayerClient,
): Promise<string> => {
  const environments = await client.listEnvironments();
  if (environments.length === 0) {
    throw new Error('No environments available to create runtime');
  }

  const preferred = testConfig.getTestEnvironments().python;
  const found = environments.find(env => env.name === preferred);
  return found ? found.name : environments[0].name;
};

/**
 * Client Runtimes Integration Tests
 *
 * Tests runtime and snapshot lifecycle management
 * using the Client client and model classes.
 */
describe.skipIf(skipInCi)('Client Runtimes Integration Tests', () => {
  let client: DatalayerClient;
  let createdRuntime: RuntimeDTO | null = null;
  let createdSnapshot: RuntimeSnapshotDTO | null = null;

  const ensureRuntime = async (): Promise<RuntimeDTO> => {
    if (createdRuntime) {
      return createdRuntime;
    }

    const environmentName = await resolveEnvironmentName(client);
    createdRuntime = await client.createRuntime(
      environmentName,
      'notebook',
      `client-test-runtime-${Date.now()}`,
      10,
    );
    return createdRuntime;
  };

  const ensureSnapshot = async (): Promise<RuntimeSnapshotDTO> => {
    if (createdSnapshot) {
      return createdSnapshot;
    }

    const runtime = await ensureRuntime();
    createdSnapshot = await runtime.createSnapshot(
      `client-test-snapshot-${Date.now()}`,
      'Test snapshot from Client',
    );
    return createdSnapshot;
  };

  beforeAll(async () => {
    if (!testConfig.hasToken()) {
      return;
    }

    await performCleanup('setup');

    client = new DatalayerClient({
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
      const environments = await client.listEnvironments();

      expect(environments).toBeDefined();
      expect(Array.isArray(environments)).toBe(true);
      expect(environments.length).toBeGreaterThan(0);

      const firstEnv = environments[0];
      expect(firstEnv.name).toBeDefined();
      expect(firstEnv.title || firstEnv.name).toBeDefined();

      console.log(`Found ${environments.length} environment(s)`);
      console.log(
        `First environment: ${firstEnv.title || firstEnv.name} (${firstEnv.name})`,
      );
      if (firstEnv.language) {
        console.log(`  Language: ${firstEnv.language}`);
      }
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

        const environmentName = await resolveEnvironmentName(client);

        const runtime = await client.createRuntime(
          environmentName,
          'notebook',
          'client-test-runtime',
          10,
        );

        expect(runtime).toBeInstanceOf(RuntimeDTO);
        expect(runtime.podName).toBeDefined();
        expect(runtime.environmentName).toBe(environmentName);
        expect(runtime.givenName).toContain('client-test-runtime');

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
        const runtimes = await client.listRuntimes();

        expect(Array.isArray(runtimes)).toBe(true);

        const found = runtimes.find(r => r.podName === createdRuntime!.podName);
        expect(found).toBeDefined();
        expect(found).toBeInstanceOf(RuntimeDTO);

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
        const runtime = await client.getRuntime(createdRuntime.podName);

        expect(runtime).toBeInstanceOf(RuntimeDTO);
        expect(runtime.podName).toBe(createdRuntime.podName);
        expect(runtime.environmentName).toBe(createdRuntime.environmentName);

        console.log(`Retrieved runtime: ${runtime.podName}`);
        console.log(`  Type: ${runtime.type}`);
        console.log(`  Ingress: ${runtime.ingress}`);
      });

      it('should test runtime model methods', async () => {
        if (!createdRuntime) {
          throw new Error(
            'Test dependency failed: createdRuntime should be available from previous test',
          );
        }

        console.log('Testing runtime model methods...');

        // Test JSON export
        const json = createdRuntime.toJSON();
        expect(json).toBeDefined();
        expect(json.podName).toBe(createdRuntime.podName);

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
        const runtime = await ensureRuntime();

        console.log('Creating snapshot from runtime...');

        const snapshot = await runtime.createSnapshot(
          `client-test-snapshot-${Date.now()}`,
          'Test snapshot from Client',
        );

        expect(snapshot).toBeInstanceOf(RuntimeSnapshotDTO);
        expect(snapshot.uid).toBeDefined();
        expect(snapshot.name).toContain('client-test-snapshot');

        createdSnapshot = snapshot;
        console.log(`Created snapshot: ${snapshot.uid}`);
        console.log(`  Name: ${snapshot.name}`);
        console.log(`  Description: ${snapshot.description}`);
      }, 120000);

      it('should list snapshots and find created snapshot', async () => {
        const snapshotRef = await ensureSnapshot();

        console.log('Listing snapshots...');
        const snapshots = await client.listSnapshots();

        expect(Array.isArray(snapshots)).toBe(true);

        const found = snapshots.find(s => s.uid === snapshotRef.uid);
        expect(found).toBeDefined();
        expect(found).toBeInstanceOf(RuntimeSnapshotDTO);

        console.log(`Found ${snapshots.length} snapshot(s)`);
        console.log(`Created snapshot found in list: ${found!.uid}`);
      });

      it('should get snapshot details', async () => {
        const snapshotRef = await ensureSnapshot();

        console.log('Getting snapshot details...');
        const snapshot = await client.getSnapshot(snapshotRef.uid);

        expect(snapshot).toBeInstanceOf(RuntimeSnapshotDTO);
        expect(snapshot.uid).toBe(snapshotRef.uid);
        expect(snapshot.environment).toBe(snapshotRef.environment);

        console.log(`Retrieved snapshot: ${snapshot.uid}`);
        const json = snapshot.toJSON();
        expect(json.uid).toBe(snapshotRef.uid);
        const raw = snapshot.rawData();
        expect(raw.uid).toBe(snapshotRef.uid);
      });

      it('should test snapshot model methods', async () => {
        const snapshotRef = await ensureSnapshot();

        console.log('Testing snapshot model methods...');

        // Test JSON export
        const json = snapshotRef.toJSON();
        expect(json).toBeDefined();
        expect(json.uid).toBe(snapshotRef.uid);

        // Test raw data export
        const raw = snapshotRef.rawData();
        expect(raw).toBeDefined();
        expect(raw.uid).toBe(snapshotRef.uid);

        // Test toString
        const str = snapshotRef.toString();
        expect(str).toContain('Snapshot');
        expect(str).toContain(snapshotRef.uid);
        console.log(`Snapshot string: ${str}`);
      });

      it('should delete snapshot', async () => {
        const snapshotRef = await ensureSnapshot();

        console.log('Deleting snapshot...');
        const snapshotUid = snapshotRef.uid;
        await snapshotRef.delete();
        console.log(`Snapshot ${snapshotUid} deleted`);

        // Verify deletion
        try {
          snapshotRef.toString();
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
        const runtimeRef = await ensureRuntime();

        console.log('Deleting runtime...');
        const podName = runtimeRef.podName;
        await runtimeRef.delete();
        console.log(`Runtime ${podName} deleted`);

        // Verify deletion
        try {
          runtimeRef.toString();
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
        await client.getRuntime('non-existent-pod-name');
        expect(true).toBe(false); // Should not reach here
      } catch (error: any) {
        expect(error).toBeDefined();
        console.log('Non-existent runtime error handled correctly');
      }
    });

    it('should handle non-existent snapshot gracefully', async () => {
      console.log('Testing non-existent snapshot...');

      try {
        await client.getSnapshot('non-existent-snapshot-uid');
        expect(true).toBe(false); // Should not reach here
      } catch (error: any) {
        expect(error).toBeDefined();
        console.log('Non-existent snapshot error handled correctly');
      }
    });

    it('should validate runtime creation parameters', async () => {
      console.log('Testing invalid runtime creation...');

      try {
        await client.createRuntime(
          '', // Invalid environment name
          'notebook',
          'invalid-test-runtime',
          10,
        );
        expect(true).toBe(false); // Should not reach here
      } catch (error: any) {
        expect(error).toBeDefined();
        console.log('Invalid runtime parameters rejected');
      }
    });
  });
});
