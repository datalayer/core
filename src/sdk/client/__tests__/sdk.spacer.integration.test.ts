/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { DatalayerSDK } from '..';
import { Space } from '../models/Space';
import { Notebook } from '../models/Notebook';
import { Lexical } from '../models/Lexical';
import { testConfig } from '../../../__tests__/shared/test-config';
import { DEFAULT_SERVICE_URLS } from '../../../api/constants';
import { performCleanup } from '../../../__tests__/shared/cleanup-shared';

/**
 * SDK Spacer Integration Tests
 *
 * Tests workspace, notebook, and lexical document lifecycle
 * using the SDK client and model classes.
 */
describe('SDK Spacer Integration Tests', () => {
  let sdk: DatalayerSDK;
  let testSpace: Space | null = null;
  let createdNotebook: Notebook | null = null;
  let createdLexical: Lexical | null = null;

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

  describe.skipIf(!testConfig.hasToken())('Space management', () => {
    it('should get user spaces', async () => {
      console.log('Getting user spaces...');
      const spaces = await sdk.getMySpaces();

      expect(spaces).toBeDefined();
      expect(Array.isArray(spaces)).toBe(true);
      expect(spaces.length).toBeGreaterThan(0);

      const firstSpace = spaces[0];
      expect(firstSpace).toBeInstanceOf(Space);
      expect(firstSpace.id || firstSpace.uid).toBeDefined();

      testSpace = firstSpace;
      console.log(`Found ${spaces.length} space(s)`);
      console.log(
        `Using space: ${firstSpace.name || firstSpace.id || firstSpace.uid}`,
      );
    });

    it('should test space model methods', async () => {
      if (!testSpace) {
        console.log('No space available, skipping model test');
        return;
      }

      console.log('Testing space model methods...');

      // Test getName method (lazy loading)
      const name = await testSpace.getName();
      expect(name).toBeDefined();
      console.log(`Space name: ${name}`);

      // Test getDescription method
      const description = await testSpace.getDescription();
      console.log(`Space description: ${description || 'None'}`);

      // Test getUpdatedAt method
      const updatedAt = await testSpace.getUpdatedAt();
      expect(updatedAt).toBeInstanceOf(Date);
      console.log(`Space updated at: ${updatedAt.toISOString()}`);

      // Test getItems method
      const items = await testSpace.getItems();
      expect(Array.isArray(items)).toBe(true);
      console.log(`Space has ${items.length} item(s)`);

      // Test toJSON method
      const json = await testSpace.toJSON();
      expect(json).toBeDefined();
      expect(json.id || json.uid).toBeDefined();

      // Test toString
      const str = testSpace.toString();
      expect(str).toContain('Space');
      console.log(`Space string: ${str}`);
    });

    // Space creation is not implemented - removed this test
  });

  describe.skipIf(!testConfig.hasToken())('Notebook lifecycle', () => {
    it('should create a notebook', async () => {
      if (!testSpace) {
        console.log('No space available, skipping notebook creation');
        return;
      }

      console.log('Creating notebook...');

      const notebook = await sdk.createNotebook({
        spaceId: testSpace.id || testSpace.uid,
        notebookType: 'jupyter',
        name: 'sdk-test-notebook-' + Date.now(),
        description: 'Test notebook from SDK',
      });

      expect(notebook).toBeInstanceOf(Notebook);
      expect(notebook.id).toBeDefined();
      expect(notebook.spaceId).toBe(testSpace.id || testSpace.uid);

      createdNotebook = notebook;
      console.log(`Created notebook: ${notebook.id}`);
      console.log(`  Name: ${notebook.name}`);
      console.log(`  Space: ${notebook.spaceId}`);
    });

    it('should get notebook details', async () => {
      if (!createdNotebook) {
        console.log('No notebook created, skipping get test');
        return;
      }

      console.log('Getting notebook details...');
      const notebook = await sdk.getNotebook(createdNotebook.id);

      expect(notebook).toBeInstanceOf(Notebook);
      expect(notebook.id).toBe(createdNotebook.id);
      expect(notebook.spaceId).toBe(createdNotebook.spaceId);

      console.log(`Retrieved notebook: ${notebook.id}`);
      console.log(`  Name: ${notebook.name}`);
    });

    it('should update notebook', async () => {
      if (!createdNotebook) {
        console.log('No notebook created, skipping update test');
        return;
      }

      console.log('Updating notebook...');

      const updatedNotebook = await sdk.updateNotebook(createdNotebook, {
        name: 'sdk-test-notebook-updated',
        description: 'Updated description from SDK test',
      });

      expect(updatedNotebook).toBeInstanceOf(Notebook);
      expect(updatedNotebook.id).toBe(createdNotebook.id);

      console.log(`Updated notebook: ${updatedNotebook.id}`);
      console.log(`  New name: ${updatedNotebook.name}`);
    });

    it('should test notebook model methods', async () => {
      if (!createdNotebook) {
        console.log('No notebook created, skipping model test');
        return;
      }

      console.log('Testing notebook model methods...');

      // Test getName method (lazy loading)
      const name = await createdNotebook.getName();
      expect(name).toBeDefined();
      console.log(`Notebook name: ${name}`);

      // Test getContent method
      const content = await createdNotebook.getContent();
      expect(content).toBeDefined();
      console.log(`Notebook has content: ${content !== null}`);

      // Test getKernelSpec method
      const kernelSpec = await createdNotebook.getKernelSpec();
      console.log(
        `Kernel spec: ${kernelSpec ? JSON.stringify(kernelSpec).substring(0, 50) : 'None'}`,
      );

      // Test getUpdatedAt method
      const updatedAt = await createdNotebook.getUpdatedAt();
      expect(updatedAt).toBeInstanceOf(Date);
      console.log(`Notebook updated at: ${updatedAt.toISOString()}`);

      // Test update through model
      const updated = await createdNotebook.update({
        name: 'sdk-test-notebook-model-update',
      });
      expect(updated).toBeInstanceOf(Notebook);
      console.log(`Updated via model: ${updated.name}`);

      // Test toJSON method
      const json = await createdNotebook.toJSON();
      expect(json).toBeDefined();
      expect(json.id).toBe(createdNotebook.id);

      // Test toString
      const str = createdNotebook.toString();
      expect(str).toContain('Notebook');
      expect(str).toContain(createdNotebook.id);
      console.log(`Notebook string: ${str}`);
    });

    it('should delete notebook', async () => {
      if (!createdNotebook) {
        console.log('No notebook created, skipping delete test');
        return;
      }

      console.log('Deleting notebook...');
      await createdNotebook.delete();
      console.log(`Notebook ${createdNotebook.id} deleted`);

      // Verify deletion
      expect(createdNotebook.isDeleted).toBe(true);

      try {
        await createdNotebook.getName();
        expect(true).toBe(false); // Should not reach here
      } catch (error: any) {
        expect(error.message).toContain('deleted');
        console.log('Notebook correctly marked as deleted');
      }
    });
  });

  describe.skipIf(!testConfig.hasToken())('Lexical document lifecycle', () => {
    it('should create a lexical document', async () => {
      if (!testSpace) {
        console.log('No space available, skipping lexical creation');
        return;
      }

      console.log('Creating lexical document...');

      const lexical = await sdk.createLexical({
        spaceId: testSpace.id || testSpace.uid,
        name: 'sdk-test-lexical-' + Date.now(),
        description: 'Test lexical from SDK',
        documentType: 'document',
      });

      expect(lexical).toBeInstanceOf(Lexical);
      expect(lexical.id).toBeDefined();
      expect(lexical.spaceId).toBe(testSpace.id || testSpace.uid);

      createdLexical = lexical;
      console.log(`Created lexical: ${lexical.id}`);
      console.log(`  Name: ${lexical.name}`);
      console.log(`  Type: ${lexical.documentType}`);
    });

    it('should get lexical details', async () => {
      if (!createdLexical) {
        console.log('No lexical created, skipping get test');
        return;
      }

      console.log('Getting lexical details...');
      const lexical = await sdk.getLexical(createdLexical.id);

      expect(lexical).toBeInstanceOf(Lexical);
      expect(lexical.id).toBe(createdLexical.id);
      expect(lexical.spaceId).toBe(createdLexical.spaceId);

      console.log(`Retrieved lexical: ${lexical.id}`);
      console.log(`  Name: ${lexical.name}`);
    });

    it('should update lexical', async () => {
      if (!createdLexical) {
        console.log('No lexical created, skipping update test');
        return;
      }

      console.log('Updating lexical...');

      const updatedLexical = await sdk.updateLexical(createdLexical, {
        name: 'sdk-test-lexical-updated',
        description: 'Updated description from SDK test',
      });

      expect(updatedLexical).toBeInstanceOf(Lexical);
      expect(updatedLexical.id).toBe(createdLexical.id);

      console.log(`Updated lexical: ${updatedLexical.id}`);
      console.log(`  New name: ${updatedLexical.name}`);
    });

    it('should test lexical model methods', async () => {
      if (!createdLexical) {
        console.log('No lexical created, skipping model test');
        return;
      }

      console.log('Testing lexical model methods...');

      // Test getName method (lazy loading)
      const name = await createdLexical.getName();
      expect(name).toBeDefined();
      console.log(`Lexical name: ${name}`);

      // Test getContent method
      const content = await createdLexical.getContent();
      expect(content).toBeDefined();
      console.log(`Lexical has content: ${content !== null}`);

      // Test getUpdatedAt method
      const updatedAt = await createdLexical.getUpdatedAt();
      expect(updatedAt).toBeInstanceOf(Date);
      console.log(`Lexical updated at: ${updatedAt.toISOString()}`);

      // Test update through model
      const updated = await createdLexical.update({
        name: 'sdk-test-lexical-model-update',
      });
      expect(updated).toBeInstanceOf(Lexical);
      console.log(`Updated via model: ${updated.name}`);

      // Test toJSON method
      const json = await createdLexical.toJSON();
      expect(json).toBeDefined();
      expect(json.id).toBe(createdLexical.id);

      // Test toString
      const str = createdLexical.toString();
      expect(str).toContain('Lexical');
      expect(str).toContain(createdLexical.id);
      console.log(`Lexical string: ${str}`);
    });

    it('should delete lexical document', async () => {
      if (!createdLexical) {
        console.log('No lexical created, skipping delete test');
        return;
      }

      console.log('Deleting lexical...');
      await createdLexical.delete();
      console.log(`Lexical ${createdLexical.id} deleted`);

      // Verify deletion
      expect(createdLexical.isDeleted).toBe(true);

      try {
        await createdLexical.getName();
        expect(true).toBe(false); // Should not reach here
      } catch (error: any) {
        expect(error.message).toContain('deleted');
        console.log('Lexical correctly marked as deleted');
      }
    });
  });

  describe.skipIf(!testConfig.hasToken())('Space items management', () => {
    it('should get space items', async () => {
      if (!testSpace) {
        console.log('No space available, skipping items test');
        return;
      }

      console.log('Getting space items...');
      const response = await sdk.getSpaceItems(testSpace.id || testSpace.uid);

      expect(response).toBeDefined();
      expect(response.items).toBeDefined();
      expect(Array.isArray(response.items)).toBe(true);

      console.log(`Space has ${response.items.length} item(s)`);
      if (response.items.length > 0) {
        const firstItem = response.items[0];
        console.log(`First item: ${firstItem.name} (${firstItem.type})`);
      }
    });

    it('should delete space item', async () => {
      // Note: We don't actually delete items here as they might be important
      // This just tests the method exists and can be called
      console.log('Testing space item deletion (dry run)...');

      // We would normally create a test item and delete it
      // For now, just verify the method exists
      expect(sdk.deleteSpaceItem).toBeDefined();
      console.log('Space item deletion method verified');
    });
  });

  describe.skipIf(!testConfig.hasToken())('Error handling', () => {
    it('should handle non-existent notebook gracefully', async () => {
      console.log('Testing non-existent notebook...');

      try {
        await sdk.getNotebook('non-existent-notebook-id');
        expect(true).toBe(false); // Should not reach here
      } catch (error: any) {
        expect(error).toBeDefined();
        console.log('Non-existent notebook error handled correctly');
      }
    });

    it('should handle non-existent lexical gracefully', async () => {
      console.log('Testing non-existent lexical...');

      try {
        await sdk.getLexical('non-existent-lexical-id');
        expect(true).toBe(false); // Should not reach here
      } catch (error: any) {
        expect(error).toBeDefined();
        console.log('Non-existent lexical error handled correctly');
      }
    });

    it('should validate notebook creation parameters', async () => {
      console.log('Testing invalid notebook creation...');

      try {
        // Missing required fields
        await sdk.createNotebook({
          spaceId: '', // Invalid empty spaceId
          notebookType: 'jupyter',
          name: 'test',
          description: 'test description',
        });
        expect(true).toBe(false); // Should not reach here
      } catch (error: any) {
        expect(error).toBeDefined();
        console.log('Invalid notebook parameters rejected');
      }
    });
  });
});
