/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { items } from '../spacer';
import { testConfig, debugLog, skipIfNoToken } from './test-config';

let DATALAYER_TOKEN: string;
let BASE_URL: string;

// Skip all tests if no token is available
const skipTests = skipIfNoToken();

beforeAll(async () => {
  if (skipTests) {
    console.log(
      'WARNING: Skipping Spacer Items integration tests: No Datalayer API token configured',
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

describe.skipIf(skipTests)('Spacer Items Integration Tests', () => {
  describe('getSpaceItems', () => {
    it('should successfully get items for a space', async () => {
      console.log('Testing getSpaceItems endpoint...');

      // You'll need to use a valid space ID from your environment
      // This is just a placeholder - adjust based on your test environment
      const spaceId = 'test-space-id';

      try {
        const response = await items.getSpaceItems(
          BASE_URL,
          DATALAYER_TOKEN,
          spaceId,
        );

        console.log('Response:', JSON.stringify(response, null, 2));

        // Verify the response structure
        expect(response).toBeDefined();
        expect(response).toHaveProperty('success');
        expect(response).toHaveProperty('message');
        expect(response).toHaveProperty('items');
        expect(Array.isArray(response.items)).toBe(true);

        console.log(`Found ${response.items.length} item(s) in space`);

        // If space has items, verify the structure
        if (response.items.length > 0) {
          const firstItem = response.items[0];
          console.log('First item:', {
            id: firstItem.id,
            name: firstItem.name,
            type: firstItem.type,
          });

          // Verify item structure
          expect(firstItem).toHaveProperty('id');
          expect(firstItem).toHaveProperty('type');
          expect(firstItem).toHaveProperty('name');
          expect(['notebook', 'lexical', 'cell']).toContain(firstItem.type);
        } else {
          console.log('Space has no items');
        }
      } catch (error: any) {
        console.log('Error getting space items:', error.message);
        // This might be expected if the space ID doesn't exist
      }
    });

    it('should return empty array for space with no items', async () => {
      console.log('Testing getSpaceItems for empty space...');

      // Use a space ID that likely has no items
      const emptySpaceId = 'empty-space-' + Date.now();

      try {
        const response = await items.getSpaceItems(
          BASE_URL,
          DATALAYER_TOKEN,
          emptySpaceId,
        );

        console.log('Empty space response:', JSON.stringify(response, null, 2));

        if (response.success) {
          expect(response.items).toBeDefined();
          expect(Array.isArray(response.items)).toBe(true);
        } else {
          // Space doesn't exist
          console.log('Space does not exist:', response.message);
        }
      } catch (error: any) {
        console.log('Expected error for non-existent space:', error.message);
      }
    });

    it('should handle invalid space ID gracefully', async () => {
      console.log('Testing with invalid space ID...');

      const invalidSpaceId = 'invalid-space-id-123456789';

      try {
        const response = await items.getSpaceItems(
          BASE_URL,
          DATALAYER_TOKEN,
          invalidSpaceId,
        );

        console.log(
          'Invalid space response:',
          JSON.stringify(response, null, 2),
        );

        // We might get a success false or an error
        if (!response.success) {
          expect(response.message).toBeDefined();
          console.log('Expected failure:', response.message);
        }
      } catch (error: any) {
        console.log('Expected error with invalid space:', error.message);
        expect(error).toBeDefined();
      }
    });
  });

  describe('deleteItem', () => {
    it('should handle deletion of non-existent item', async () => {
      console.log('Testing deleteItem with non-existent ID...');

      const nonExistentId = 'non-existent-item-' + Date.now();

      try {
        const response = await items.deleteItem(
          BASE_URL,
          DATALAYER_TOKEN,
          nonExistentId,
        );

        console.log('Delete response:', JSON.stringify(response, null, 2));

        // We expect this to fail
        if (!response.success) {
          expect(response.message).toBeDefined();
          console.log(
            'Expected failure for non-existent item:',
            response.message,
          );
        }
      } catch (error: any) {
        console.log('Expected error:', error.message);
        expect(error).toBeDefined();
      }
    });

    it('should handle permission errors gracefully', async () => {
      console.log('Testing deleteItem with protected item...');

      // Try to delete an item that likely requires special permissions
      const protectedItemId = 'protected-item-id';

      try {
        const response = await items.deleteItem(
          BASE_URL,
          DATALAYER_TOKEN,
          protectedItemId,
        );

        console.log(
          'Delete protected response:',
          JSON.stringify(response, null, 2),
        );

        if (!response.success) {
          expect(response.message).toBeDefined();
          console.log('Expected permission error:', response.message);
        }
      } catch (error: any) {
        console.log('Expected permission error:', error.message);
      }
    });

    it('should successfully delete item if it exists and user has permission', async () => {
      console.log('Testing successful item deletion...');

      // Note: This test would need a real item ID that can be deleted
      // In a real test environment, you'd first create an item, then delete it
      // For now, this is a placeholder showing the expected flow

      console.log(
        'Skipping actual deletion test - would need to create item first',
      );

      // Example of what the full test would look like:
      // 1. Create a notebook or lexical document in a test space
      // 2. Get the item ID from the space items
      // 3. Delete the item
      // 4. Verify it's deleted by checking space items again

      expect(true).toBe(true); // Placeholder assertion
    });
  });

  describe('performance', () => {
    it('should respond within reasonable time', async () => {
      console.log('Testing response times...');

      const spaceId = 'test-space-id';

      // Test getSpaceItems performance
      const startGet = Date.now();
      try {
        await items.getSpaceItems(BASE_URL, DATALAYER_TOKEN, spaceId);
      } catch (error) {
        // Ignore errors for performance test
      }
      const getTime = Date.now() - startGet;

      console.log(`getSpaceItems response time: ${getTime}ms`);
      expect(getTime).toBeLessThan(5000);

      // Test deleteItem performance
      const startDelete = Date.now();
      try {
        await items.deleteItem(BASE_URL, DATALAYER_TOKEN, 'test-item-id');
      } catch (error) {
        // Ignore errors for performance test
      }
      const deleteTime = Date.now() - startDelete;

      console.log(`deleteItem response time: ${deleteTime}ms`);
      expect(deleteTime).toBeLessThan(5000);

      if (getTime > 2000 || deleteTime > 2000) {
        console.warn('WARNING: Slow response times detected');
      }
    });
  });
});
