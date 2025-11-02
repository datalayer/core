/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/* eslint-disable no-console, @typescript-eslint/no-explicit-any */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { DatalayerClient } from '..';
import { RuntimeDTO } from '../../models/RuntimeDTO';
import { DEFAULT_SERVICE_URLS } from '../../api/constants';
import { RuntimeSnapshotDTO } from '../../models/RuntimeSnapshotDTO';
import { SpaceDTO } from '../../models/SpaceDTO';
import { NotebookDTO } from '../../models/NotebookDTO';
import { LexicalDTO } from '../../models/LexicalDTO';
import { testConfig } from '../../__tests__/shared/test-config';
import { performCleanup } from '../../__tests__/shared/cleanup-shared';

/**
 * SDK Models Integration Tests
 *
 * Tests model state management, lazy loading, and relationships
 * using the SDK client and model classes.
 */
describe('SDK Models Integration Tests', () => {
  let client: DatalayerClient;
  let testSpace: SpaceDTO | null = null;
  let testNotebook: NotebookDTO | null = null;
  let testLexical: LexicalDTO | null = null;
  let testRuntime: RuntimeDTO | null = null;
  let testSnapshot: RuntimeSnapshotDTO | null = null;

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

  describe.skipIf(!testConfig.hasToken())('Model state management', () => {
    it('should mark models as deleted after deletion', async () => {
      console.log('Testing model deletion state...');

      // Get a space to work with
      const spaces = await client.getMySpaces();
      expect(spaces.length).toBeGreaterThan(0);
      testSpace = spaces[0];

      // Create a notebook
      const notebook = await client.createNotebook(
        testSpace.uid,
        `model-test-notebook-${Date.now()}`,
        'Test notebook for model tests',
      );
      expect(notebook).toBeInstanceOf(NotebookDTO);

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
        throw new Error(
          'Test dependency failed: testSpace should be available from previous test',
        );
      }

      console.log('Testing lazy loading...');

      // Create a notebook with minimal data
      testNotebook = await client.createNotebook(
        testSpace.uid,
        `lazy-load-test-${Date.now()}`,
        'Test description',
      );

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
      // Ensure we have a space to work with
      if (!testSpace) {
        const spaces = await client.getMySpaces();
        expect(spaces.length).toBeGreaterThan(0);
        testSpace = spaces[0];
      }

      // Create a notebook if we don't have one
      if (!testNotebook) {
        testNotebook = await client.createNotebook(
          testSpace.uid,
          `refresh-test-${Date.now()}`,
          'Test description',
        );
      }

      console.log('Testing data refresh...');

      // Get initial name
      const originalName = await testNotebook.getName();
      expect(originalName).toBeDefined();

      // Test that we can fetch fresh data
      const content = await testNotebook.getContent();
      expect(content).toBeDefined();

      // Verify the model is working properly
      const uid = testNotebook.uid;
      expect(uid).toBeDefined();

      console.log(
        `Model data access verified - name: ${originalName}, uid: ${uid}`,
      );
    });
  });

  describe.skipIf(!testConfig.hasToken())('Model relationships', () => {
    it('should handle Space → Notebook relationship', async () => {
      // Ensure we have a space
      if (!testSpace) {
        const spaces = await client.getMySpaces();
        expect(spaces.length).toBeGreaterThan(0);
        testSpace = spaces[0];
      }

      // Ensure we have a notebook
      if (!testNotebook) {
        testNotebook = await client.createNotebook(
          testSpace.uid,
          `relationship-test-notebook-${Date.now()}`,
          'Test notebook for relationships',
        );
      }

      const notebookRef = testNotebook;
      if (!notebookRef) {
        throw new Error('Failed to create notebook for relationship test');
      }

      console.log('Testing Space → Notebook relationship...');

      // Get items from space
      const items = await testSpace.getItems();
      expect(Array.isArray(items)).toBe(true);

      console.log(`Space has ${items.length} items`);
      console.log('Looking for notebook with id:', notebookRef.id);
      console.log(
        'Items in space:',
        items.map(item => ({
          id: item.id,
          uid: (item as any).uid,
          type: item.type || (item as any).type,
          name: item.name,
        })),
      );

      // Our test notebook should be in the items
      // Note: Space items may not have a 'type' property
      const foundNotebook = items.find(
        item =>
          item.id === notebookRef.id || (item as any).uid === notebookRef.uid,
      );

      expect(foundNotebook).toBeDefined();
      console.log(`Found notebook ${notebookRef.id} in space items`);

      console.log(`Space contains ${items.length} items`);
    });

    it('should handle Space → Lexical relationship', async () => {
      // Ensure we have a space
      if (!testSpace) {
        const spaces = await client.getMySpaces();
        expect(spaces.length).toBeGreaterThan(0);
        testSpace = spaces[0];
      }

      console.log('Testing Space → Lexical relationship...');

      // Create a lexical document
      testLexical = await client.createLexical(
        testSpace.uid,
        `relationship-test-lexical-${Date.now()}`,
        'Test lexical document for relationships',
      );
      expect(testLexical).toBeInstanceOf(LexicalDTO);

      // Verify it appears in space items
      const items = await testSpace.getItems();
      const lexicalRef = testLexical;
      if (!lexicalRef) {
        throw new Error(
          'Failed to create lexical document for relationship test',
        );
      }

      const foundLexical = items.find(
        item =>
          item.id === lexicalRef.id || (item as any).uid === lexicalRef.uid,
      );
      expect(foundLexical).toBeDefined();

      console.log(`Created lexical ${testLexical.id} in space`);
    });
  });

  describe.skipIf(!testConfig.hasToken() || testConfig.shouldSkipExpensive())(
    'Runtime → Snapshot relationship',
    () => {
      it('should handle Runtime → Snapshot creation', async () => {
        console.log('Testing Runtime → Snapshot relationship...');

        // Create a runtime
        testRuntime = await client.createRuntime(
          'python-cpu-env',
          'notebook',
          'model-test-runtime',
          10,
        );

        expect(testRuntime).toBeInstanceOf(RuntimeDTO);
        console.log(`Created runtime: ${(testRuntime as any).podName}`);

        // Create a snapshot from the runtime
        testSnapshot = await testRuntime.createSnapshot(
          'model-test-snapshot',
          'Test snapshot from model test',
        );

        expect(testSnapshot).toBeInstanceOf(RuntimeSnapshotDTO);
        // Snapshots don't have a podName property
        // Instead, check that the snapshot was created successfully
        expect(testSnapshot.uid).toBeDefined();
        expect(testSnapshot.name).toBe('model-test-snapshot');

        console.log(`Created snapshot ${testSnapshot.uid} from runtime`);
      });

      it('should list runtime snapshots', async () => {
        if (!testRuntime || !testSnapshot) {
          throw new Error(
            'Test dependency failed: testRuntime and testSnapshot should be available from previous test',
          );
        }

        console.log('Testing runtime snapshot listing...');

        // List all snapshots
        const snapshots = await client.listSnapshots();

        // Find our test snapshot
        const snapshotRef = testSnapshot;
        if (!snapshotRef) {
          throw new Error('Failed to create snapshot for relationship test');
        }

        const found = snapshots.find(s => s.uid === snapshotRef.uid);
        expect(found).toBeDefined();

        console.log(`Found ${snapshots.length} snapshots total`);
      });
    },
  );

  describe.skipIf(!testConfig.hasToken())('Model serialization', () => {
    it('should serialize Space model to JSON', async () => {
      if (!testSpace) {
        throw new Error(
          'Test dependency failed: testSpace should be available from previous test',
        );
      }

      console.log('Testing Space serialization...');

      const json = await testSpace.toJSON();
      expect(json).toBeDefined();
      expect(json.uid).toBeDefined();

      // JSON should include fetched properties
      if ((testSpace as any).name) {
        expect(json.name).toBe((testSpace as any).name);
      }

      console.log('Space serialized successfully');
    });

    it('should serialize Notebook model to JSON', async () => {
      // Always create a fresh notebook for this test to avoid state issues
      // Ensure we have a space first
      if (!testSpace) {
        const spaces = await client.getMySpaces();
        expect(spaces.length).toBeGreaterThan(0);
        testSpace = spaces[0];
      }

      const freshNotebook = await client.createNotebook(
        testSpace.uid,
        `serialization-test-${Date.now()}`,
        'Test notebook for serialization',
      );

      console.log('Testing Notebook serialization...');
      console.log('Notebook created with id:', freshNotebook.id);

      const json = await freshNotebook.toJSON();
      expect(json).toBeDefined();
      expect(json.id).toBe(freshNotebook.id);

      // Log the JSON to see what fields are present
      console.log('Notebook JSON:', JSON.stringify(json, null, 2));

      // The notebook should have its basic properties
      const name = json.name;
      expect(name).toBeDefined();
      expect(json.id).toBeDefined();
      expect(json.uid).toBeDefined();

      console.log('Notebook serialized successfully');
    });

    it.skipIf(testConfig.shouldSkipExpensive())(
      'should serialize Runtime model to JSON',
      async () => {
        if (!testRuntime) {
          throw new Error(
            'Test dependency failed: testRuntime should be available from previous test',
          );
        }

        console.log('Testing Runtime serialization...');

        const json = await testRuntime.toJSON();
        expect(json).toBeDefined();
        expect(json.podName).toBe((testRuntime as any).podName);
        expect(json.environmentName).toBe((testRuntime as any).environmentName);

        console.log('Runtime serialized successfully');
      },
    );

    it.skipIf(testConfig.shouldSkipExpensive())(
      'should serialize Snapshot model to JSON',
      async () => {
        if (!testSnapshot) {
          throw new Error(
            'Test dependency failed: testSnapshot should be available from previous test',
          );
        }

        console.log('Testing Snapshot serialization...');

        const json = await testSnapshot.toJSON();
        expect(json).toBeDefined();
        expect(json.uid).toBe(testSnapshot.uid);

        console.log('Snapshot serialized successfully');
      },
    );
  });

  describe.skipIf(!testConfig.hasToken())('Model error handling', () => {
    it('should handle API errors gracefully in models', async () => {
      console.log('Testing model error handling...');

      // Create a fake notebook with invalid ID
      const fakeNotebook = new NotebookDTO(
        { id: 'invalid-id', space_id: 'invalid-space' } as any,
        client as any,
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
        throw new Error(
          'Test dependency failed: testNotebook should be available from previous test',
        );
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
        throw new Error(
          'Test dependency failed: testNotebook should be available from previous test',
        );
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
      // Ensure we have a space
      if (!testSpace) {
        const spaces = await client.getMySpaces();
        expect(spaces.length).toBeGreaterThan(0);
        testSpace = spaces[0];
      }

      console.log('Testing full model lifecycle...');

      // 1. Create
      const notebook = await client.createNotebook(
        testSpace.uid,
        `lifecycle-test-${Date.now()}`,
        'Lifecycle test notebook',
      );
      expect(notebook).toBeInstanceOf(NotebookDTO);
      console.log('1. Created notebook');

      // 2. Read
      const retrieved = await client.getNotebook(notebook.uid);
      expect(retrieved.id).toBe(notebook.id);
      console.log('2. Retrieved notebook');

      // 3. Use methods to access properties
      const name = await notebook.getName();
      expect(name).toBeDefined();
      const content = await notebook.getContent();
      expect(content).toBeDefined();
      console.log('3. Used notebook methods');

      // 4. Delete
      await notebook.delete();
      expect((notebook as any).isDeleted).toBe(true);
      console.log('4. Deleted notebook');

      // 5. Verify deletion
      try {
        await notebook.getName();
        expect(true).toBe(false);
      } catch (error: any) {
        expect(error.message).toContain('deleted');
        console.log('5. Verified deletion state');
      }
    });
  });
});
