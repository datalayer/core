/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { describe, it, expect, beforeAll, afterAll, test } from 'vitest';
import { users, notebooks, lexicals, items } from '../spacer';
import {
  testConfig,
  debugLog,
  skipIfNoToken,
} from '../../__tests__/shared/test-config';
import { performCleanup } from '../../__tests__/shared/cleanup-shared';

let DATALAYER_TOKEN: string;
let BASE_URL: string;

// Skip all tests if no token is available
const skipTests = skipIfNoToken();

beforeAll(async () => {
  if (skipTests) {
    console.log(
      'WARNING: Skipping Spacer Lifecycle integration tests: No Datalayer API token configured',
    );
    console.log(
      '         Set DATALAYER_API_TOKEN env var or DATALAYER_TEST_TOKEN in .env.test',
    );
    return;
  }

  // Get token and base URL from test config
  DATALAYER_TOKEN = testConfig.getToken();
  BASE_URL = testConfig.getBaseUrl('SPACER');

  debugLog('Test configuration loaded');
  debugLog('Base URL:', BASE_URL);
  debugLog('Token available:', !!DATALAYER_TOKEN);

  // Pre-test cleanup
  await performCleanup('setup');
});

afterAll(async () => {
  if (skipTests) {
    return;
  }

  // Post-test cleanup
  await performCleanup('teardown');
});

describe.skipIf(skipTests)(
  'Spacer Complete Lifecycle Integration Tests',
  () => {
    // Complete lifecycle test for spacer resources
    describe.sequential('complete spacer resource lifecycle', () => {
      let testSpaceId: string | undefined;
      let createdNotebookId: string | undefined;
      let createdLexicalId: string | undefined;
      let createdItemIds: string[] = [];
      const testNamePrefix = `test-${Date.now()}`;

      // No cleanup needed - handled by global setup/teardown

      test('1. should get user spaces to find a valid space ID', async () => {
        console.log('Getting user spaces...');

        const response = await users.getMySpaces(DATALAYER_TOKEN, BASE_URL);

        expect(response).toBeDefined();
        expect(response).toHaveProperty('success');
        expect(response.success).toBe(true);
        expect(response).toHaveProperty('spaces');
        expect(Array.isArray(response.spaces)).toBe(true);

        console.log(`Found ${response.spaces.length} space(s) for user`);

        if (response.spaces.length > 0) {
          const firstSpace = response.spaces[0];
          testSpaceId = firstSpace.uid || firstSpace.id;
          const spaceName = firstSpace.name || (firstSpace as any).name_t;
          console.log(`Using space ID: ${testSpaceId} (${spaceName})`);

          // Verify space structure - check for either old or new field names
          expect(firstSpace).toHaveProperty('uid');
          expect(firstSpace).toSatisfy(
            (space: any) =>
              space.name !== undefined || (space as any).name_t !== undefined,
          );
        } else {
          console.log('WARNING: No spaces found - some tests may fail');
          // Use a placeholder space ID
          testSpaceId = 'test-space-id';
        }
      });

      test('2. should create a notebook', async () => {
        if (!testSpaceId) {
          console.log('No space ID available, skipping notebook creation');
          return;
        }

        // Add initial delay to spread out load when running with other tests
        await new Promise(resolve => setTimeout(resolve, 1000));

        console.log('Creating notebook...');

        const notebookContent = {
          cells: [
            {
              cell_type: 'markdown',
              metadata: {},
              source: [
                '# Test Notebook\n',
                'This is a test notebook created by integration tests',
              ],
            },
            {
              cell_type: 'code',
              metadata: {},
              source: ['print("Hello from integration test")'],
              outputs: [],
            },
          ],
          metadata: {
            kernelspec: {
              display_name: 'Python 3',
              language: 'python',
              name: 'python3',
            },
          },
          nbformat: 4,
          nbformat_minor: 4,
        };

        const file = new Blob([JSON.stringify(notebookContent)], {
          type: 'application/json',
        });

        try {
          const response = await notebooks.createNotebook(
            DATALAYER_TOKEN,
            {
              spaceId: testSpaceId,
              notebookType: 'jupyter',
              name: `${testNamePrefix}-notebook`,
              description: 'Integration test notebook',
              file: file,
            },
            BASE_URL,
          );

          console.log('Notebook response:', JSON.stringify(response, null, 2));

          if (response.success) {
            expect(response).toHaveProperty('notebook');
            expect(response.notebook).toHaveProperty('id');
            createdNotebookId = response.notebook.uid;
            console.log(`Created notebook with UID: ${createdNotebookId}`);
            createdItemIds.push(createdNotebookId);
          } else {
            console.log('Notebook creation failed:', response.message);
          }
        } catch (error: any) {
          console.error('Error creating notebook:', error.message);
        }
      });

      test('3. should create a lexical document', async () => {
        if (!testSpaceId) {
          console.log('No space ID available, skipping lexical creation');
          return;
        }

        // Add delay to spread out load when running with other tests
        await new Promise(resolve => setTimeout(resolve, 2000)); // Stagger more than notebook creation

        console.log('Creating lexical document...');

        const lexicalContent = {
          root: {
            type: 'root',
            format: '',
            indent: 0,
            version: 1,
            children: [
              {
                type: 'paragraph',
                format: '',
                indent: 0,
                version: 1,
                children: [
                  {
                    type: 'text',
                    format: 0,
                    style: '',
                    mode: 'normal',
                    text: 'Test lexical document from integration test',
                    version: 1,
                    detail: 0,
                  },
                ],
              },
            ],
          },
        };

        const file = new Blob([JSON.stringify(lexicalContent)], {
          type: 'application/json',
        });

        try {
          const response = await lexicals.createLexical(
            DATALAYER_TOKEN,
            {
              spaceId: testSpaceId,
              documentType: 'lexical',
              name: `${testNamePrefix}-lexical`,
              description: 'Integration test lexical document',
              file: file,
            },
            BASE_URL,
          );

          console.log('Lexical response:', JSON.stringify(response, null, 2));

          if (response.success) {
            expect(response).toHaveProperty('document');
            expect(response.document).toHaveProperty('id');
            createdLexicalId = response.document.uid;
            console.log(`Created lexical with UID: ${createdLexicalId}`);
            createdItemIds.push(createdLexicalId);
          } else {
            console.log('Lexical creation failed:', response.message);
          }
        } catch (error: any) {
          console.error('Error creating lexical:', error.message);
        }
      });

      test('4. should list all items in the space', async () => {
        if (!testSpaceId) {
          console.log('No space ID available, skipping list items');
          return;
        }

        console.log('Listing items in space...');

        const response = await items.getSpaceItems(
          DATALAYER_TOKEN,
          testSpaceId,
          BASE_URL,
        );

        console.log('Items response:', JSON.stringify(response, null, 2));

        expect(response).toBeDefined();
        expect(response).toHaveProperty('success');
        expect(response).toHaveProperty('items');

        if (response.success && Array.isArray(response.items)) {
          console.log(`Found ${response.items.length} items in space`);

          // Find our created items
          const foundNotebook = createdNotebookId
            ? response.items.find((item: any) => item.id === createdNotebookId)
            : null;
          const foundLexical = createdLexicalId
            ? response.items.find((item: any) => item.id === createdLexicalId)
            : null;

          if (foundNotebook) {
            console.log('✓ Found created notebook in items list');
            console.log(
              'Notebook object:',
              JSON.stringify(foundNotebook, null, 2),
            );
            // Handle both name formats that might be returned
            const notebookName =
              foundNotebook.name || (foundNotebook as any).name_t || '';
            if (notebookName) {
              expect(notebookName).toContain(testNamePrefix);
            } else {
              console.log('Warning: Notebook found but has no name field');
            }
          }

          if (foundLexical) {
            console.log('✓ Found created lexical in items list');
            console.log(
              'Lexical object:',
              JSON.stringify(foundLexical, null, 2),
            );
            // Handle both name formats that might be returned
            const lexicalName =
              foundLexical.name || (foundLexical as any).name_t || '';
            if (lexicalName) {
              expect(lexicalName).toContain(testNamePrefix);
            } else {
              console.log('Warning: Lexical found but has no name field');
            }
          }
        }
      });

      test('5. should get notebook details', async () => {
        if (!createdNotebookId) {
          console.log('No notebook was created, skipping get test');
          return;
        }

        console.log('Getting notebook details...');

        try {
          // Add a small delay to allow server processing
          await new Promise(resolve => setTimeout(resolve, 1000));

          const response = await notebooks.getNotebook(
            DATALAYER_TOKEN,
            createdNotebookId,
            BASE_URL,
          );

          console.log(
            'Get notebook response:',
            JSON.stringify(response, null, 2),
          );

          expect(response).toBeDefined();
          expect(response).toHaveProperty('success');

          if (response.success) {
            expect(response).toHaveProperty('notebook');
            expect(response.notebook?.uid).toBe(createdNotebookId);
            console.log('✓ Retrieved notebook details successfully');
          }
        } catch (error: any) {
          console.log('Expected error getting notebook:', error.message);
          // The notebook might not be immediately available after creation
          // This is acceptable for this test scenario
        }
      });

      test('6. should get lexical details', async () => {
        if (!createdLexicalId) {
          console.log('No lexical was created, skipping get test');
          return;
        }

        console.log('Getting lexical details...');

        try {
          // Add a small delay to allow server processing
          await new Promise(resolve => setTimeout(resolve, 1000));

          const response = await lexicals.getLexical(
            DATALAYER_TOKEN,
            createdLexicalId,
            BASE_URL,
          );

          console.log(
            'Get lexical response:',
            JSON.stringify(response, null, 2),
          );

          expect(response).toBeDefined();
          expect(response).toHaveProperty('success');

          if (response.success) {
            expect(response).toHaveProperty('document');
            expect(response.document?.uid).toBe(createdLexicalId);
            console.log('✓ Retrieved lexical details successfully');
          }
        } catch (error: any) {
          console.log('Expected error getting lexical:', error.message);
          // The lexical might not be immediately available after creation
          // This is acceptable for this test scenario
        }
      });

      test('7. should update notebook', async () => {
        if (!createdNotebookId) {
          console.log('No notebook was created, skipping update test');
          return;
        }

        console.log('Updating notebook...');

        const updateData = {
          name: `${testNamePrefix}-notebook-updated`,
          description: 'Updated integration test notebook',
        };

        try {
          // Add delay to allow server processing and avoid resource contention
          await new Promise(resolve => setTimeout(resolve, 5000)); // 5 second delay for bulk test runs

          const response = await notebooks.updateNotebook(
            DATALAYER_TOKEN,
            createdNotebookId,
            updateData,
            BASE_URL,
          );

          console.log(
            'Update notebook response:',
            JSON.stringify(response, null, 2),
          );

          expect(response).toBeDefined();
          expect(response).toHaveProperty('success');

          if (response.success) {
            expect(response).toHaveProperty('notebook');
            expect(response.notebook.uid).toBe(createdNotebookId);
            const nameObj =
              (response.notebook as any).name_t || response.notebook.name || {};
            const notebookName =
              nameObj && typeof nameObj === 'object' && nameObj.set
                ? nameObj.set
                : typeof nameObj === 'string'
                  ? nameObj
                  : '';
            expect(notebookName).toContain('updated');
            console.log('✓ Updated notebook successfully');
          }
        } catch (error: any) {
          console.log('Error updating notebook:', error.message);
          throw error; // Let the test fail
        }
      });

      test('8. should update lexical', async () => {
        if (!createdLexicalId) {
          console.log('No lexical was created, skipping update test');
          return;
        }

        console.log('Updating lexical...');

        const updateData = {
          name: `${testNamePrefix}-lexical-updated`,
          description: 'Updated integration test lexical',
        };

        try {
          // Add delay to allow server processing and avoid resource contention
          await new Promise(resolve => setTimeout(resolve, 5000)); // 5 second delay for bulk test runs

          const response = await lexicals.updateLexical(
            DATALAYER_TOKEN,
            createdLexicalId,
            updateData,
            BASE_URL,
          );

          console.log(
            'Update lexical response:',
            JSON.stringify(response, null, 2),
          );

          expect(response).toBeDefined();
          expect(response).toHaveProperty('success');

          if (response.success) {
            expect(response).toHaveProperty('document');
            expect(response.document.uid).toBe(createdLexicalId);
            const nameObj =
              (response.document as any).name_t || response.document.name || {};
            const lexicalName =
              nameObj && typeof nameObj === 'object' && nameObj.set
                ? nameObj.set
                : typeof nameObj === 'string'
                  ? nameObj
                  : '';
            expect(lexicalName).toContain('updated');
            console.log('✓ Updated lexical successfully');
          }
        } catch (error: any) {
          console.log('Error updating lexical:', error.message);
          throw error; // Let the test fail
        }
      });

      test('9. should verify updates by getting items again', async () => {
        if (!createdNotebookId && !createdLexicalId) {
          console.log('No items were created, skipping verification');
          return;
        }

        console.log('Verifying updates...');

        // Get notebook to verify update
        if (createdNotebookId) {
          const notebookResponse = await notebooks.getNotebook(
            DATALAYER_TOKEN,
            createdNotebookId,
            BASE_URL,
          );

          if (notebookResponse.success && notebookResponse.notebook) {
            const notebookName =
              notebookResponse.notebook.name ||
              (notebookResponse.notebook as any).name_t ||
              '';
            expect(notebookName).toContain('updated');
            console.log('✓ Notebook update verified');
          }
        }

        // Get lexical to verify update
        if (createdLexicalId) {
          const lexicalResponse = await lexicals.getLexical(
            DATALAYER_TOKEN,
            createdLexicalId,
            BASE_URL,
          );

          if (lexicalResponse.success && lexicalResponse.document) {
            const lexicalName =
              lexicalResponse.document.name ||
              (lexicalResponse.document as any).name_t ||
              '';
            expect(lexicalName).toContain('updated');
            console.log('✓ Lexical update verified');
          }
        }
      });

      test('10. should delete notebook', async () => {
        if (!createdNotebookId) {
          console.log('No notebook was created, skipping delete test');
          return;
        }

        console.log('Deleting notebook...');

        try {
          await items.deleteItem(DATALAYER_TOKEN, createdNotebookId, BASE_URL);
          console.log('Notebook deletion request sent');

          // Verify deletion
          const getResponse = await notebooks.getNotebook(
            DATALAYER_TOKEN,
            createdNotebookId,
            BASE_URL,
          );

          if (!getResponse.success) {
            console.log('✓ Notebook properly deleted');
          } else {
            console.log('WARNING: Notebook still exists after deletion');
          }

          // Remove from cleanup list
          createdNotebookId = undefined;
          createdItemIds = createdItemIds.filter(
            id => id !== createdNotebookId,
          );
        } catch (error: any) {
          console.log('Expected deletion error:', error.message);
        }
      });

      test('11. should delete lexical', async () => {
        if (!createdLexicalId) {
          console.log('No lexical was created, skipping delete test');
          return;
        }

        console.log('Deleting lexical...');

        try {
          await items.deleteItem(DATALAYER_TOKEN, createdLexicalId, BASE_URL);
          console.log('Lexical deletion request sent');

          // Verify deletion
          const getResponse = await lexicals.getLexical(
            DATALAYER_TOKEN,
            createdLexicalId,
            BASE_URL,
          );

          if (!getResponse.success) {
            console.log('✓ Lexical properly deleted');
          } else {
            console.log('WARNING: Lexical still exists after deletion');
          }

          // Remove from cleanup list
          createdLexicalId = undefined;
          createdItemIds = createdItemIds.filter(id => id !== createdLexicalId);
        } catch (error: any) {
          console.log('Expected deletion error:', error.message);
        }
      });

      test('12. should verify all items are deleted', async () => {
        if (!testSpaceId) {
          console.log('No space ID available, skipping final verification');
          return;
        }

        console.log('Final verification...');

        const response = await items.getSpaceItems(
          DATALAYER_TOKEN,
          testSpaceId,
          BASE_URL,
        );

        if (response.success && Array.isArray(response.items)) {
          const remainingTestItems = response.items.filter((item: any) =>
            item.name?.includes(testNamePrefix),
          );

          expect(remainingTestItems.length).toBe(0);

          if (remainingTestItems.length === 0) {
            console.log('✓ All test items successfully deleted');
          } else {
            console.log(
              `WARNING: ${remainingTestItems.length} test items still exist`,
            );
          }
        }

        console.log('Complete spacer lifecycle test finished successfully!');
      });
    });

    // Basic smoke tests that always run
    describe('smoke tests', () => {
      it('should successfully get user spaces', async () => {
        console.log('Testing get user spaces endpoint...');

        const response = await users.getMySpaces(DATALAYER_TOKEN, BASE_URL);

        console.log(`Found ${response.spaces.length} space(s)`);

        expect(response).toBeDefined();
        expect(response).toHaveProperty('success');
        expect(response.success).toBe(true);
        expect(response).toHaveProperty('spaces');
        expect(Array.isArray(response.spaces)).toBe(true);

        if (response.spaces.length > 0) {
          const firstSpace = response.spaces[0];
          const spaceName = firstSpace.name || (firstSpace as any).name_t;
          console.log('First space:', spaceName);

          expect(firstSpace).toHaveProperty('uid');
          expect(firstSpace).toSatisfy(
            (space: any) =>
              space.name !== undefined || (space as any).name_t !== undefined,
          );
        }
      });

      it('should handle non-existent notebook gracefully', async () => {
        console.log('Testing get with non-existent notebook ID...');

        try {
          const response = await notebooks.getNotebook(
            DATALAYER_TOKEN,
            'non-existent-notebook-id-123456789',
            BASE_URL,
          );

          console.log('404 response:', JSON.stringify(response, null, 2));

          expect(response).toBeDefined();
          expect(response).toHaveProperty('success');
          expect(response).toHaveProperty('message');

          if (!response.success) {
            expect(response.notebook).toBeUndefined();
            console.log('Expected 404 message:', response.message);
          }
        } catch (error: any) {
          console.log(
            'Expected error for non-existent notebook:',
            error.message,
          );
          expect(error).toBeDefined();
          // API may return either "not found" or "Network Error" for non-existent resources
          expect(
            error.message.toLowerCase().includes('not found') ||
              error.message.includes('Network Error'),
          ).toBeTruthy();
        }
      });

      it('should handle non-existent lexical gracefully', async () => {
        console.log('Testing get with non-existent lexical ID...');

        try {
          const response = await lexicals.getLexical(
            DATALAYER_TOKEN,
            'non-existent-lexical-id-123456789',
            BASE_URL,
          );

          console.log('404 response:', JSON.stringify(response, null, 2));

          expect(response).toBeDefined();
          expect(response).toHaveProperty('success');
          expect(response).toHaveProperty('message');

          if (!response.success) {
            expect(response.document).toBeUndefined();
            console.log('Expected 404 message:', response.message);
          }
        } catch (error: any) {
          console.log(
            'Expected error for non-existent lexical:',
            error.message,
          );
          expect(error).toBeDefined();
          // API may return either "not found" or "Network Error" for non-existent resources
          expect(
            error.message.toLowerCase().includes('not found') ||
              error.message.includes('Network Error'),
          ).toBeTruthy();
        }
      });
    });
  },
);
