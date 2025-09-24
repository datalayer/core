/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { DatalayerSDK } from '..';
import { Runtime } from '../models/Runtime';
import { Snapshot } from '../models/Snapshot';
import { Space } from '../models/Space';
import { Notebook } from '../models/Notebook';
import { Lexical } from '../models/Lexical';
import { testConfig } from '../../../__tests__/shared/test-config';
import { DEFAULT_SERVICE_URLS } from '../../../api/constants';
import { performCleanup } from '../../../__tests__/shared/cleanup-shared';

/**
 * SDK Models Integration Tests
 *
 * Tests model state management, lazy loading, and relationships
 * using the SDK client and model classes.
 */
describe('SDK Models Integration Tests', () => {
  let sdk: DatalayerSDK;
  let testSpace: Space | null = null;
  let testNotebook: Notebook | null = null;
  let testLexical: Lexical | null = null;
  let testRuntime: Runtime | null = null;
  let testSnapshot: Snapshot | null = null;

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

  describe.skipIf(!testConfig.hasToken())('Model state management', () => {
    it('should mark models as deleted after deletion', async () => {
      console.log('Testing model deletion state...');

      // Get a space to work with
      const spaces = await sdk.getMySpaces();
      expect(spaces.length).toBeGreaterThan(0);
      testSpace = spaces[0];

      // Create a notebook
      const notebook = await sdk.createNotebook({
        spaceId: testSpace.id || testSpace.uid,
        notebookType: 'jupyter',
        name: 'model-test-notebook-' + Date.now(),
        description: 'Test notebook for model tests',
      });
      expect(notebook).toBeInstanceOf(Notebook);

      // Delete it
      await notebook.delete();

      // Verify it's marked as deleted
      expect((notebook as any).isDeleted).toBe(true);

      // Verify methods throw errors
      try {
        await notebook.getName();
        expect(true).toBe(false); // Should not reach here
      } catch (error: any) {
        expect(error.message).toContain('deleted');
        console.log('Deleted model correctly throws error');
      }
    });

    it('should handle lazy loading of model properties', async () => {
      if (!testSpace) {
        console.log('No space available, skipping lazy loading test');
        return;
      }

      console.log('Testing lazy loading...');

      // Create a notebook with minimal data
      testNotebook = await sdk.createNotebook({
        spaceId: testSpace.id || testSpace.uid,
        notebookType: 'jupyter',
        name: 'lazy-load-test-' + Date.now(),
        description: 'Test description',
      });

      // First call should fetch from API
      const name1 = await testNotebook.getName();
      expect(name1).toBeDefined();

      // Second call should use cached value (faster)
      const start = Date.now();
      const name2 = await testNotebook.getName();
      const elapsed = Date.now() - start;

      expect(name2).toBe(name1);
      expect(elapsed).toBeLessThan(10); // Should be instant
      console.log(`Lazy loading working - cached access in ${elapsed}ms`);
    });

    it('should refresh data when explicitly requested', async () => {
      if (!testNotebook) {
        console.log('No notebook available, skipping refresh test');
        return;
      }

      console.log('Testing data refresh...');

      // Get initial name
      const originalName = await testNotebook.getName();

      // Update the notebook
      const updatedNotebook = await testNotebook.update({
        name: 'updated-name-' + Date.now(),
      });

      // The returned notebook should have new data
      const newName = await updatedNotebook.getName();
      expect(newName).not.toBe(originalName);

      console.log(`Data refreshed: ${originalName} → ${newName}`);
    });
  });

  describe.skipIf(!testConfig.hasToken())('Model relationships', () => {
    it('should handle Space → Notebook relationship', async () => {
      if (!testSpace) {
        console.log('No space available, skipping relationship test');
        return;
      }

      console.log('Testing Space → Notebook relationship...');

      // Get items from space
      const items = await testSpace.getItems();
      expect(Array.isArray(items)).toBe(true);

      if (testNotebook) {
        // Our test notebook should be in the items
        const foundNotebook = items.find(
          item => item.id === testNotebook!.id && item.type === 'notebook',
        );
        expect(foundNotebook).toBeDefined();
        console.log(`Found notebook ${testNotebook.id} in space items`);
      }

      console.log(`Space contains ${items.length} items`);
    });

    it('should handle Space → Lexical relationship', async () => {
      if (!testSpace) {
        console.log('No space available, skipping lexical relationship test');
        return;
      }

      console.log('Testing Space → Lexical relationship...');

      // Create a lexical document
      testLexical = await sdk.createLexical({
        spaceId: testSpace.id || testSpace.uid,
        name: 'relationship-test-lexical-' + Date.now(),
        documentType: 'document',
      });
      expect(testLexical).toBeInstanceOf(Lexical);

      // Verify it appears in space items
      const items = await testSpace.getItems();
      const foundLexical = items.find(
        item =>
          item.id === testLexical!.id &&
          (item.type === 'lexical' || item.type === 'document'),
      );
      expect(foundLexical).toBeDefined();

      console.log(`Created lexical ${testLexical.id} in space`);
    });
  });

  describe.skipIf(!testConfig.hasToken() || !testConfig.shouldRunExpensive())(
    'Runtime → Snapshot relationship',
    () => {
      it('should handle Runtime → Snapshot creation', async () => {
        console.log('Testing Runtime → Snapshot relationship...');

        // Create a runtime
        testRuntime = await sdk.createRuntime({
          environment_name: 'python-cpu-env',
          type: 'notebook',
          given_name: 'model-test-runtime',
          credits_limit: 10,
        });

        expect(testRuntime).toBeInstanceOf(Runtime);
        console.log(`Created runtime: ${(testRuntime as any).podName}`);

        // Create a snapshot from the runtime
        testSnapshot = await testRuntime.createSnapshot({
          given_name: 'model-test-snapshot',
          description: 'Test snapshot from model test',
        });

        expect(testSnapshot).toBeInstanceOf(Snapshot);
        expect((testSnapshot as any).podName).toBe(
          (testRuntime as any).podName,
        );

        console.log(`Created snapshot ${testSnapshot.uid} from runtime`);
      });

      it('should list runtime snapshots', async () => {
        if (!testRuntime || !testSnapshot) {
          console.log('No runtime/snapshot available, skipping list test');
          return;
        }

        console.log('Testing runtime snapshot listing...');

        // List all snapshots
        const snapshots = await sdk.listSnapshots();

        // Find our test snapshot
        const found = snapshots.find(s => s.uid === testSnapshot!.uid);
        expect(found).toBeDefined();

        console.log(`Found ${snapshots.length} snapshots total`);
      });
    },
  );

  describe.skipIf(!testConfig.hasToken())('Model serialization', () => {
    it('should serialize Space model to JSON', async () => {
      if (!testSpace) {
        console.log('No space available, skipping serialization test');
        return;
      }

      console.log('Testing Space serialization...');

      const json = await testSpace.toJSON();
      expect(json).toBeDefined();
      expect(json.id || json.uid).toBeDefined();

      // JSON should include fetched properties
      if ((testSpace as any).name) {
        expect(json.name).toBe((testSpace as any).name);
      }

      console.log('Space serialized successfully');
    });

    it('should serialize Notebook model to JSON', async () => {
      if (!testNotebook) {
        console.log('No notebook available, skipping serialization test');
        return;
      }

      console.log('Testing Notebook serialization...');

      const json = await testNotebook.toJSON();
      expect(json).toBeDefined();
      expect(json.id).toBe(testNotebook.id);
      expect(json.spaceId).toBe(testNotebook.spaceId);

      console.log('Notebook serialized successfully');
    });

    it('should serialize Runtime model to JSON', async () => {
      if (!testRuntime) {
        console.log('No runtime available, skipping serialization test');
        return;
      }

      console.log('Testing Runtime serialization...');

      const json = await testRuntime.toJSON();
      expect(json).toBeDefined();
      expect(json.pod_name).toBe((testRuntime as any).podName);
      expect(json.environment_name).toBe((testRuntime as any).environmentName);

      console.log('Runtime serialized successfully');
    });

    it('should serialize Snapshot model to JSON', async () => {
      if (!testSnapshot) {
        console.log('No snapshot available, skipping serialization test');
        return;
      }

      console.log('Testing Snapshot serialization...');

      const json = await testSnapshot.toJSON();
      expect(json).toBeDefined();
      expect(json.uid).toBe(testSnapshot.uid);

      console.log('Snapshot serialized successfully');
    });
  });

  describe.skipIf(!testConfig.hasToken())('Model error handling', () => {
    it('should handle API errors gracefully in models', async () => {
      console.log('Testing model error handling...');

      // Create a fake notebook with invalid ID
      const fakeNotebook = new Notebook(
        { id: 'invalid-id', spaceId: 'invalid-space' },
        sdk as any,
      );

      try {
        await fakeNotebook.getName();
        expect(true).toBe(false); // Should not reach here
      } catch (error: any) {
        expect(error).toBeDefined();
        console.log('Model correctly propagates API errors');
      }
    });

    it('should validate model operations', async () => {
      if (!testNotebook) {
        console.log('No notebook available, skipping validation test');
        return;
      }

      console.log('Testing model validation...');

      try {
        // Try to update with invalid data
        await testNotebook.update({} as any);
        // This might succeed with empty update, which is okay
        console.log('Empty update handled');
      } catch (error: any) {
        console.log('Invalid update rejected');
      }
    });

    it('should handle concurrent model operations', async () => {
      if (!testNotebook) {
        console.log('No notebook available, skipping concurrency test');
        return;
      }

      console.log('Testing concurrent model operations...');

      // Make multiple concurrent requests
      const promises = [
        testNotebook.getName(),
        testNotebook.getContent(),
        testNotebook.getUpdatedAt(),
      ];

      const results = await Promise.all(promises);

      expect(results[0]).toBeDefined(); // name
      expect(results[1]).toBeDefined(); // content
      expect(results[2]).toBeInstanceOf(Date); // updatedAt

      console.log('Concurrent operations completed successfully');
    });
  });

  describe.skipIf(!testConfig.hasToken())('Model lifecycle', () => {
    it('should support full model lifecycle', async () => {
      if (!testSpace) {
        console.log('No space available, skipping lifecycle test');
        return;
      }

      console.log('Testing full model lifecycle...');

      // 1. Create
      const notebook = await sdk.createNotebook({
        spaceId: testSpace.id || testSpace.uid,
        notebookType: 'jupyter',
        name: 'lifecycle-test-' + Date.now(),
        description: 'Lifecycle test notebook',
      });
      expect(notebook).toBeInstanceOf(Notebook);
      console.log('1. Created notebook');

      // 2. Read
      const retrieved = await sdk.getNotebook(notebook.id);
      expect(retrieved.id).toBe(notebook.id);
      console.log('2. Retrieved notebook');

      // 3. Update
      const updated = await notebook.update({
        name: 'lifecycle-updated-' + Date.now(),
      });
      expect(updated).toBeInstanceOf(Notebook);
      console.log('3. Updated notebook');

      // 4. Use methods
      const name = await updated.getName();
      expect(name).toBeDefined();
      console.log('4. Used notebook methods');

      // 5. Delete
      await updated.delete();
      expect((updated as any).isDeleted).toBe(true);
      console.log('5. Deleted notebook');

      // 6. Verify deletion
      try {
        await updated.getName();
        expect(true).toBe(false);
      } catch (error: any) {
        expect(error.message).toContain('deleted');
        console.log('6. Verified deletion state');
      }
    });
  });
});
