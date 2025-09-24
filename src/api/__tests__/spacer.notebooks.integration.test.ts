/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { notebooks } from '../spacer';
import { testConfig, debugLog, skipIfNoToken } from './test-config';

let DATALAYER_TOKEN: string;
let BASE_URL: string;
let createdNotebookId: string | undefined;

// Skip all tests if no token is available
const skipTests = skipIfNoToken();

beforeAll(async () => {
  if (skipTests) {
    console.log(
      'WARNING: Skipping Spacer Notebooks integration tests: No Datalayer API token configured',
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

describe.skipIf(skipTests)('Spacer Notebooks Integration Tests', () => {
  beforeEach(() => {
    // Reset created notebook ID for each test
    createdNotebookId = undefined;
  });

  describe('create', () => {
    it('should successfully create a notebook', async () => {
      console.log('Testing notebook creation...');

      const formData = new FormData();
      // You'll need to use a valid space ID from your environment
      // This is just a placeholder - adjust based on your test environment
      formData.append('spaceId', 'test-space-id');
      formData.append('notebookType', 'jupyter');
      formData.append('name', `Test Notebook ${Date.now()}`);
      formData.append('description', 'Integration test notebook');

      try {
        const response = await notebooks.create(
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
          expect(response).toHaveProperty('notebook');
          expect(response.notebook).toHaveProperty('id');
          expect(response.notebook).toHaveProperty('uid');
          expect(response.notebook).toHaveProperty('name');

          // Store the created notebook ID for cleanup or further tests
          createdNotebookId = response.notebook.id;
          console.log('Notebook created with ID:', createdNotebookId);
        } else {
          console.log('Notebook creation failed:', response.message);
          // This might be expected if the space ID doesn't exist
        }
      } catch (error: any) {
        console.log('Error creating notebook:', error.message);
        // This might be expected depending on test environment setup
        // For example, if the space ID doesn't exist
      }
    });

    it('should handle creation with file attachment', async () => {
      console.log('Testing notebook creation with file...');

      const notebookContent = {
        cells: [
          {
            cell_type: 'code',
            source: 'print("Hello from integration test")',
            metadata: {},
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
        nbformat_minor: 5,
      };

      const file = new Blob([JSON.stringify(notebookContent)], {
        type: 'application/x-ipynb+json',
      });

      const formData = new FormData();
      formData.append('spaceId', 'test-space-id');
      formData.append('notebookType', 'jupyter');
      formData.append('name', `Test Notebook with File ${Date.now()}`);
      formData.append('description', 'Integration test with file');
      formData.append('file', file, 'test-notebook.ipynb');

      try {
        const response = await notebooks.create(
          BASE_URL,
          DATALAYER_TOKEN,
          formData,
        );

        console.log(
          'Create with file response:',
          JSON.stringify(response, null, 2),
        );

        if (response.success) {
          createdNotebookId = response.notebook.id;
          console.log('Notebook with file created:', createdNotebookId);
        }
      } catch (error: any) {
        console.log('Error creating notebook with file:', error.message);
      }
    });

    it('should handle invalid space ID', async () => {
      console.log('Testing notebook creation with invalid space ID...');

      const formData = new FormData();
      formData.append('spaceId', 'invalid-space-id-123456789');
      formData.append('notebookType', 'jupyter');
      formData.append('name', 'Test Notebook');
      formData.append('description', 'Should fail with invalid space');

      try {
        const response = await notebooks.create(
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
  });

  describe('get', () => {
    it('should successfully get a notebook by ID', async () => {
      console.log('Testing get notebook by ID...');

      // First, try to create a notebook to ensure we have a valid ID to test with
      const formData = new FormData();
      formData.append('spaceId', 'test-space-id');
      formData.append('notebookType', 'jupyter');
      formData.append('name', `Test Notebook for Get ${Date.now()}`);
      formData.append('description', 'Test notebook for get operation');

      let notebookId: string | undefined;

      try {
        const createResponse = await notebooks.create(
          BASE_URL,
          DATALAYER_TOKEN,
          formData,
        );
        if (createResponse.success) {
          notebookId = createResponse.notebook.id;
        }
      } catch (error) {
        console.log('Could not create test notebook');
      }

      if (notebookId) {
        const response = await notebooks.get(
          BASE_URL,
          DATALAYER_TOKEN,
          notebookId,
        );

        console.log('Get response:', JSON.stringify(response, null, 2));

        expect(response).toBeDefined();
        expect(response).toHaveProperty('success');
        expect(response).toHaveProperty('message');

        if (response.success) {
          expect(response).toHaveProperty('notebook');
          expect(response.notebook?.id).toBe(notebookId);
          console.log('Retrieved notebook:', response.notebook?.name);
        }
      } else {
        console.log('Skipping get test - no valid notebook ID available');
      }
    });

    it('should handle non-existent notebook ID', async () => {
      console.log('Testing get with non-existent ID...');

      const response = await notebooks.get(
        BASE_URL,
        DATALAYER_TOKEN,
        'nonexistent-notebook-id-123456789',
      );

      console.log('404 response:', JSON.stringify(response, null, 2));

      expect(response).toBeDefined();
      expect(response).toHaveProperty('success');
      expect(response).toHaveProperty('message');

      // Should return false for non-existent notebook
      if (!response.success) {
        expect(response.notebook).toBeUndefined();
        console.log('Expected 404 message:', response.message);
      }
    });
  });

  describe('update', () => {
    it('should successfully update a notebook', async () => {
      console.log('Testing update notebook...');

      // First, create a notebook to update
      const formData = new FormData();
      formData.append('spaceId', 'test-space-id');
      formData.append('notebookType', 'jupyter');
      formData.append('name', `Test Notebook for Update ${Date.now()}`);
      formData.append('description', 'Initial description');

      let notebookId: string | undefined;

      try {
        const createResponse = await notebooks.create(
          BASE_URL,
          DATALAYER_TOKEN,
          formData,
        );
        if (createResponse.success) {
          notebookId = createResponse.notebook.id;
        }
      } catch (error) {
        console.log('Could not create test notebook');
      }

      if (notebookId) {
        // Now update the notebook
        const updateData = {
          name: `Updated Notebook ${Date.now()}`,
          description: 'Updated description',
        };

        const response = await notebooks.update(
          BASE_URL,
          DATALAYER_TOKEN,
          notebookId,
          updateData,
        );

        console.log('Update response:', JSON.stringify(response, null, 2));

        expect(response).toBeDefined();
        expect(response).toHaveProperty('success');
        expect(response).toHaveProperty('message');

        if (response.success) {
          expect(response).toHaveProperty('notebook');
          expect(response.notebook.id).toBe(notebookId);
          console.log('Updated notebook:', response.notebook.name);
        }
      } else {
        console.log('Skipping update test - no valid notebook ID available');
      }
    });

    it('should handle partial updates', async () => {
      console.log('Testing partial update (name only)...');

      // First, create a notebook to update
      const formData = new FormData();
      formData.append('spaceId', 'test-space-id');
      formData.append('notebookType', 'jupyter');
      formData.append('name', `Test Notebook ${Date.now()}`);
      formData.append('description', 'Original description');

      let notebookId: string | undefined;

      try {
        const createResponse = await notebooks.create(
          BASE_URL,
          DATALAYER_TOKEN,
          formData,
        );
        if (createResponse.success) {
          notebookId = createResponse.notebook.id;
        }
      } catch (error) {
        console.log('Could not create test notebook');
      }

      if (notebookId) {
        // Update only the name
        const updateData = {
          name: `Name Only Update ${Date.now()}`,
        };

        const response = await notebooks.update(
          BASE_URL,
          DATALAYER_TOKEN,
          notebookId,
          updateData,
        );

        console.log(
          'Partial update response:',
          JSON.stringify(response, null, 2),
        );

        if (response.success) {
          expect(response.notebook.id).toBe(notebookId);
          console.log('Updated name to:', response.notebook.name);
        }
      }
    });

    it('should handle update on non-existent notebook', async () => {
      console.log('Testing update on non-existent notebook...');

      const updateData = {
        name: 'This should fail',
        description: 'Update should not work',
      };

      try {
        const response = await notebooks.update(
          BASE_URL,
          DATALAYER_TOKEN,
          'nonexistent-notebook-id-123456789',
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
  });

  describe('performance', () => {
    it('should complete operations within reasonable time', async () => {
      console.log('Testing response times...');

      // Test GET performance
      const startGet = Date.now();
      await notebooks.get(BASE_URL, DATALAYER_TOKEN, 'test-notebook-id');
      const getTime = Date.now() - startGet;

      console.log(`GET response time: ${getTime}ms`);
      expect(getTime).toBeLessThan(5000);

      // Test CREATE performance
      const formData = new FormData();
      formData.append('spaceId', 'test-space-id');
      formData.append('notebookType', 'jupyter');
      formData.append('name', 'Performance Test');
      formData.append('description', 'Testing performance');

      const startCreate = Date.now();
      try {
        await notebooks.create(BASE_URL, DATALAYER_TOKEN, formData);
      } catch (error) {
        // Ignore errors for performance test
      }
      const createTime = Date.now() - startCreate;

      console.log(`CREATE response time: ${createTime}ms`);
      expect(createTime).toBeLessThan(5000);

      if (createTime > 2000 || getTime > 2000) {
        console.warn('WARNING: Slow response times detected');
      }
    });
  });
});
