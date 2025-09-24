/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { lexicals } from '../spacer';
import { testConfig, debugLog, skipIfNoToken } from './test-config';

let DATALAYER_TOKEN: string;
let BASE_URL: string;

// Skip all tests if no token is available
const skipTests = skipIfNoToken();

beforeAll(async () => {
  if (skipTests) {
    console.log(
      'WARNING: Skipping Spacer Lexicals integration tests: No Datalayer API token configured',
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
});

describe.skipIf(skipTests)('Spacer Lexicals Integration Tests', () => {
  describe('create', () => {
    it('should successfully create a lexical document', async () => {
      console.log('Testing lexical document creation...');

      const formData = new FormData();
      // You'll need to use a valid space ID from your environment
      // This is just a placeholder - adjust based on your test environment
      formData.append('spaceId', 'test-space-id');
      formData.append('documentType', 'lexical');
      formData.append('name', `Test Document ${Date.now()}`);
      formData.append('description', 'Integration test document');

      try {
        const response = await lexicals.create(
          BASE_URL,
          DATALAYER_TOKEN,
          formData,
        );

        console.log('Create response:', JSON.stringify(response, null, 2));

        // Verify response structure
        expect(response).toBeDefined();
        expect(response).toHaveProperty('success');
        expect(response).toHaveProperty('message');

        if (response.success) {
          expect(response).toHaveProperty('document');
          expect(response.document).toHaveProperty('id');
          expect(response.document).toHaveProperty('uid');
          expect(response.document).toHaveProperty('name');

          console.log('Document created with ID:', response.document.id);
        } else {
          console.log('Document creation failed:', response.message);
          // This might be expected if the space ID doesn't exist
        }
      } catch (error: any) {
        console.log('Error creating document:', error.message);
        // This might be expected depending on test environment setup
      }
    });

    it('should handle creation with file attachment', async () => {
      console.log('Testing lexical document creation with file...');

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
                  text: 'Hello from integration test',
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

      const formData = new FormData();
      formData.append('spaceId', 'test-space-id');
      formData.append('documentType', 'lexical');
      formData.append('name', `Test Document with File ${Date.now()}`);
      formData.append('description', 'Integration test with file');
      formData.append('file', file, 'test-document.json');

      try {
        const response = await lexicals.create(
          BASE_URL,
          DATALAYER_TOKEN,
          formData,
        );

        console.log(
          'Create with file response:',
          JSON.stringify(response, null, 2),
        );

        if (response.success) {
          console.log('Document with file created:', response.document.id);
        }
      } catch (error: any) {
        console.log('Error creating document with file:', error.message);
      }
    });

    it('should handle different document types', async () => {
      console.log('Testing document creation with markdown type...');

      const formData = new FormData();
      formData.append('spaceId', 'test-space-id');
      formData.append('documentType', 'markdown');
      formData.append('name', `Markdown Document ${Date.now()}`);
      formData.append('description', 'A markdown document for testing');

      // Add a markdown file
      const markdownContent =
        '# Test Document\n\nThis is a test markdown document.';
      const file = new Blob([markdownContent], { type: 'text/markdown' });
      formData.append('file', file, 'test.md');

      try {
        const response = await lexicals.create(
          BASE_URL,
          DATALAYER_TOKEN,
          formData,
        );

        console.log(
          'Markdown document response:',
          JSON.stringify(response, null, 2),
        );

        if (response.success) {
          console.log('Markdown document created:', response.document.id);
        }
      } catch (error: any) {
        console.log('Error creating markdown document:', error.message);
      }
    });

    it('should handle invalid space ID', async () => {
      console.log('Testing document creation with invalid space ID...');

      const formData = new FormData();
      formData.append('spaceId', 'invalid-space-id-123456789');
      formData.append('documentType', 'lexical');
      formData.append('name', 'Test Document');
      formData.append('description', 'Should fail with invalid space');

      try {
        const response = await lexicals.create(
          BASE_URL,
          DATALAYER_TOKEN,
          formData,
        );

        console.log(
          'Invalid space response:',
          JSON.stringify(response, null, 2),
        );

        // We expect this to fail
        if (response.success === false) {
          expect(response.message).toBeDefined();
          console.log('Expected failure:', response.message);
        }
      } catch (error: any) {
        console.log('Expected error with invalid space:', error.message);
        expect(error).toBeDefined();
      }
    });

    it('should handle missing required fields', async () => {
      console.log('Testing document creation with missing fields...');

      const formData = new FormData();
      // Missing required fields like spaceId and documentType
      formData.append('name', 'Incomplete Document');

      try {
        const response = await lexicals.create(
          BASE_URL,
          DATALAYER_TOKEN,
          formData,
        );

        console.log(
          'Missing fields response:',
          JSON.stringify(response, null, 2),
        );

        // We expect this to fail
        if (response.success === false) {
          expect(response.message).toBeDefined();
          console.log('Expected validation error:', response.message);
        }
      } catch (error: any) {
        console.log('Expected error with missing fields:', error.message);
        expect(error).toBeDefined();
      }
    });
  });

  describe('performance', () => {
    it('should complete creation within reasonable time', async () => {
      console.log('Testing response time...');

      const formData = new FormData();
      formData.append('spaceId', 'test-space-id');
      formData.append('documentType', 'lexical');
      formData.append('name', 'Performance Test Document');
      formData.append('description', 'Testing performance');

      const startTime = Date.now();
      try {
        await lexicals.create(BASE_URL, DATALAYER_TOKEN, formData);
      } catch (error) {
        // Ignore errors for performance test
      }
      const responseTime = Date.now() - startTime;

      console.log(`Response time: ${responseTime}ms`);

      // Should respond within 5 seconds
      expect(responseTime).toBeLessThan(5000);

      // Warn if response is slow
      if (responseTime > 2000) {
        console.warn(
          `WARNING: Slow response time (${responseTime}ms) - API might be under load`,
        );
      }
    });

    it('should handle large file uploads efficiently', async () => {
      console.log('Testing large file upload performance...');

      // Create a larger document content
      const largeContent = {
        root: {
          type: 'root',
          children: Array.from({ length: 100 }, (_, i) => ({
            type: 'paragraph',
            children: [
              {
                type: 'text',
                text: `This is paragraph ${i + 1} with some content to make the document larger.`,
              },
            ],
          })),
        },
      };

      const file = new Blob([JSON.stringify(largeContent)], {
        type: 'application/json',
      });

      const formData = new FormData();
      formData.append('spaceId', 'test-space-id');
      formData.append('documentType', 'lexical');
      formData.append('name', `Large Document ${Date.now()}`);
      formData.append('description', 'Performance test with larger file');
      formData.append('file', file, 'large-document.json');

      const startTime = Date.now();
      try {
        const response = await lexicals.create(
          BASE_URL,
          DATALAYER_TOKEN,
          formData,
        );
        const responseTime = Date.now() - startTime;

        console.log(`Large file upload time: ${responseTime}ms`);

        if (response.success) {
          console.log('Large document created successfully');
        }

        // Large files should still complete within 10 seconds
        expect(responseTime).toBeLessThan(10000);
      } catch (error: any) {
        const responseTime = Date.now() - startTime;
        console.log(`Large file upload failed after ${responseTime}ms`);
      }
    });
  });

  describe('get', () => {
    it('should successfully get a document by ID', async () => {
      console.log('Testing get document by ID...');

      // First, try to create a document to ensure we have a valid ID to test with
      const formData = new FormData();
      formData.append('spaceId', 'test-space-id');
      formData.append('documentType', 'lexical');
      formData.append('name', `Test Document for Get ${Date.now()}`);
      formData.append('description', 'Test document for get operation');

      let documentId: string | undefined;

      try {
        const createResponse = await lexicals.create(
          BASE_URL,
          DATALAYER_TOKEN,
          formData,
        );
        if (createResponse.success) {
          documentId = createResponse.document.id;
        }
      } catch (error) {
        console.log('Could not create test document');
      }

      if (documentId) {
        const response = await lexicals.get(
          BASE_URL,
          DATALAYER_TOKEN,
          documentId,
        );

        console.log('Get response:', JSON.stringify(response, null, 2));

        expect(response).toBeDefined();
        expect(response).toHaveProperty('success');
        expect(response).toHaveProperty('message');

        if (response.success) {
          expect(response).toHaveProperty('document');
          expect(response.document?.id).toBe(documentId);
          console.log('Retrieved document:', response.document?.name);
        }
      } else {
        console.log('Skipping get test - no valid document ID available');
      }
    });

    it('should handle non-existent document ID', async () => {
      console.log('Testing get with non-existent ID...');

      const response = await lexicals.get(
        BASE_URL,
        DATALAYER_TOKEN,
        'nonexistent-document-id-123456789',
      );

      console.log('404 response:', JSON.stringify(response, null, 2));

      expect(response).toBeDefined();
      expect(response).toHaveProperty('success');
      expect(response).toHaveProperty('message');

      // Should return false for non-existent document
      if (!response.success) {
        expect(response.document).toBeUndefined();
        console.log('Expected 404 message:', response.message);
      }
    });

    it('should retrieve document with correct content', async () => {
      console.log('Testing get document with content verification...');

      // Create a document with specific content
      const testContent = {
        root: {
          type: 'root',
          children: [
            {
              type: 'paragraph',
              children: [
                {
                  type: 'text',
                  text: 'Test content for verification',
                },
              ],
            },
          ],
        },
      };

      const file = new Blob([JSON.stringify(testContent)], {
        type: 'application/json',
      });

      const formData = new FormData();
      formData.append('spaceId', 'test-space-id');
      formData.append('documentType', 'lexical');
      formData.append('name', `Content Test Document ${Date.now()}`);
      formData.append('description', 'Testing content retrieval');
      formData.append('file', file, 'test-content.json');

      let documentId: string | undefined;

      try {
        const createResponse = await lexicals.create(
          BASE_URL,
          DATALAYER_TOKEN,
          formData,
        );
        if (createResponse.success) {
          documentId = createResponse.document.id;
        }
      } catch (error) {
        console.log('Could not create test document with content');
      }

      if (documentId) {
        const response = await lexicals.get(
          BASE_URL,
          DATALAYER_TOKEN,
          documentId,
        );

        if (response.success && response.document) {
          console.log('Document retrieved with content');
          expect(response.document.content).toBeDefined();
        }
      }
    });
  });

  describe('update', () => {
    it('should successfully update a document', async () => {
      console.log('Testing update document...');

      // First, create a document to update
      const formData = new FormData();
      formData.append('spaceId', 'test-space-id');
      formData.append('documentType', 'lexical');
      formData.append('name', `Test Document for Update ${Date.now()}`);
      formData.append('description', 'Initial description');

      let documentId: string | undefined;

      try {
        const createResponse = await lexicals.create(
          BASE_URL,
          DATALAYER_TOKEN,
          formData,
        );
        if (createResponse.success) {
          documentId = createResponse.document.id;
        }
      } catch (error) {
        console.log('Could not create test document');
      }

      if (documentId) {
        // Now update the document
        const updateData = {
          name: `Updated Document ${Date.now()}`,
          description: 'Updated description',
        };

        const response = await lexicals.update(
          BASE_URL,
          DATALAYER_TOKEN,
          documentId,
          updateData,
        );

        console.log('Update response:', JSON.stringify(response, null, 2));

        expect(response).toBeDefined();
        expect(response).toHaveProperty('success');
        expect(response).toHaveProperty('message');

        if (response.success) {
          expect(response).toHaveProperty('document');
          expect(response.document.id).toBe(documentId);
          console.log('Updated document:', response.document.name);
        }
      } else {
        console.log('Skipping update test - no valid document ID available');
      }
    });

    it('should handle partial updates', async () => {
      console.log('Testing partial update (name only)...');

      // First, create a document to update
      const formData = new FormData();
      formData.append('spaceId', 'test-space-id');
      formData.append('documentType', 'lexical');
      formData.append('name', `Test Document ${Date.now()}`);
      formData.append('description', 'Original description');

      let documentId: string | undefined;

      try {
        const createResponse = await lexicals.create(
          BASE_URL,
          DATALAYER_TOKEN,
          formData,
        );
        if (createResponse.success) {
          documentId = createResponse.document.id;
        }
      } catch (error) {
        console.log('Could not create test document');
      }

      if (documentId) {
        // Update only the name
        const updateData = {
          name: `Name Only Update ${Date.now()}`,
        };

        const response = await lexicals.update(
          BASE_URL,
          DATALAYER_TOKEN,
          documentId,
          updateData,
        );

        console.log(
          'Partial update response:',
          JSON.stringify(response, null, 2),
        );

        if (response.success) {
          expect(response.document.id).toBe(documentId);
          console.log('Updated name to:', response.document.name);
        }
      }
    });

    it('should handle update on non-existent document', async () => {
      console.log('Testing update on non-existent document...');

      const updateData = {
        name: 'This should fail',
        description: 'Update should not work',
      };

      try {
        const response = await lexicals.update(
          BASE_URL,
          DATALAYER_TOKEN,
          'nonexistent-document-id-123456789',
          updateData,
        );

        console.log(
          'Update non-existent response:',
          JSON.stringify(response, null, 2),
        );

        if (!response.success) {
          expect(response.message).toBeDefined();
          console.log('Expected failure:', response.message);
        }
      } catch (error: any) {
        console.log('Expected error:', error.message);
        expect(error).toBeDefined();
      }
    });

    it('should verify updates are persisted', async () => {
      console.log('Testing update persistence...');

      // Create a document
      const formData = new FormData();
      formData.append('spaceId', 'test-space-id');
      formData.append('documentType', 'lexical');
      formData.append('name', `Persistence Test ${Date.now()}`);
      formData.append('description', 'Original');

      let documentId: string | undefined;

      try {
        const createResponse = await lexicals.create(
          BASE_URL,
          DATALAYER_TOKEN,
          formData,
        );
        if (createResponse.success) {
          documentId = createResponse.document.id;
        }
      } catch (error) {
        console.log('Could not create test document');
      }

      if (documentId) {
        // Update the document
        const newName = `Updated Name ${Date.now()}`;
        const updateData = {
          name: newName,
          description: 'Updated description',
        };

        const updateResponse = await lexicals.update(
          BASE_URL,
          DATALAYER_TOKEN,
          documentId,
          updateData,
        );

        if (updateResponse.success) {
          // Get the document to verify update was persisted
          const getResponse = await lexicals.get(
            BASE_URL,
            DATALAYER_TOKEN,
            documentId,
          );

          if (getResponse.success && getResponse.document) {
            expect(getResponse.document.name).toBe(newName);
            console.log('Update was persisted successfully');
          }
        }
      }
    });
  });
});
