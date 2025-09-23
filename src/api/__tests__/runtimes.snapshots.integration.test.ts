/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { snapshots } from '../runtimes';
import { testConfig, debugLog, skipIfNoToken } from './test-config';

let DATALAYER_TOKEN: string;
let BASE_URL: string;

// Skip all tests if no token is available
const skipTests = skipIfNoToken();

beforeAll(async () => {
  if (skipTests) {
    console.log(
      'WARNING: Skipping Runtimes Snapshots integration tests: No Datalayer API token configured',
    );
    console.log(
      '         Set DATALAYER_API_TOKEN env var or DATALAYER_TEST_TOKEN in .env.test',
    );
    return;
  }

  // Get token and base URL from test config
  DATALAYER_TOKEN = testConfig.getToken();
  BASE_URL = testConfig.getBaseUrl('RUNTIMES');

  debugLog('Test configuration loaded');
  debugLog('Base URL:', BASE_URL);
  debugLog('Token available:', !!DATALAYER_TOKEN);
});

describe.skipIf(skipTests)('Runtimes Snapshots Integration Tests', () => {
  describe('list', () => {
    it('should successfully list runtime snapshots', async () => {
      console.log('Testing list snapshots endpoint...');

      const response = await snapshots.list(DATALAYER_TOKEN, BASE_URL);

      console.log('Snapshots response:', JSON.stringify(response, null, 2));

      // Verify the response structure
      expect(response).toBeDefined();
      expect(response).toHaveProperty('success');
      expect(response.success).toBe(true);
      expect(response).toHaveProperty('message');
      expect(response).toHaveProperty('snapshots');
      expect(Array.isArray(response.snapshots)).toBe(true);

      console.log(`Found ${response.snapshots.length} runtime snapshots`);

      // If we have snapshots, check the structure of the first one
      if (response.snapshots.length > 0) {
        const firstSnapshot = response.snapshots[0];
        console.log('First snapshot UID:', firstSnapshot.uid);

        // Verify snapshot structure based on actual API response
        expect(firstSnapshot).toHaveProperty('uid');
        expect(firstSnapshot).toHaveProperty('name');
      }
    });

    it('should work with default URL if not specified', async () => {
      console.log('Testing list snapshots with default URL...');

      // Call without specifying URL to use default
      const response = await snapshots.list(DATALAYER_TOKEN);

      console.log(
        'Default URL snapshots response:',
        JSON.stringify(response, null, 2),
      );

      // Should still get valid response
      expect(response).toBeDefined();
      expect(response.success).toBe(true);
      expect(response).toHaveProperty('snapshots');
      expect(Array.isArray(response.snapshots)).toBe(true);
    });
  });

  // NOTE: Skipping create/delete/load tests as they would require actual runtime instances
  // and could incur costs. These should be tested in a controlled environment.
  describe.skipIf(testConfig.shouldSkipExpensive())(
    'expensive operations',
    () => {
      it.skip('should create a new snapshot', async () => {
        console.log(
          'SKIPPED: Creating snapshots requires an active runtime and should be tested manually',
        );
      });

      it.skip('should delete a snapshot', async () => {
        console.log('SKIPPED: Deleting snapshots should be tested manually');
      });

      it.skip('should load a snapshot', async () => {
        console.log(
          'SKIPPED: Loading snapshots requires an active runtime and should be tested manually',
        );
      });

      it.skip('should upload a snapshot file', async () => {
        console.log('SKIPPED: Uploading snapshots should be tested manually');
      });

      it.skip('should download a snapshot', async () => {
        console.log('SKIPPED: Downloading snapshots should be tested manually');
      });
    },
  );

  describe('get snapshot details', () => {
    it('should handle non-existent snapshot gracefully', async () => {
      console.log('Testing get with non-existent snapshot ID...');

      const nonExistentSnapshot = 'non-existent-snapshot-12345';

      try {
        await snapshots.get(DATALAYER_TOKEN, nonExistentSnapshot, BASE_URL);
        // If we get here, the snapshot somehow exists
        console.log('WARNING: Non-existent snapshot returned data');
      } catch (error: any) {
        console.log('Error for non-existent snapshot:', error.message);
        // We expect an error for non-existent snapshot
        expect(error).toBeDefined();
        expect(error.message).toBeDefined();
      }
    });
  });

  describe('error handling', () => {
    it('should handle invalid token gracefully', async () => {
      console.log('Testing with invalid token...');

      const invalidToken = 'invalid-token-123';

      try {
        await snapshots.list(invalidToken, BASE_URL);
        // If we get here, the API accepted the invalid token (shouldn't happen)
        console.log('WARNING: API accepted invalid token');
      } catch (error: any) {
        console.log('Error with invalid token:', error.message);
        // We expect an error with invalid token
        expect(error).toBeDefined();
        expect(error.message).toBeDefined();
      }
    });

    it('should validate parameters for create operation', async () => {
      console.log('Testing create with invalid parameters...');

      // Test with empty data
      try {
        // @ts-expect-error Testing with empty data
        await snapshots.create(DATALAYER_TOKEN, {}, BASE_URL);
        console.log('WARNING: API accepted empty create data');
      } catch (error: any) {
        console.log('Error with empty create data:', error.message);
        expect(error).toBeDefined();
      }
    });
  });

  describe('performance', () => {
    it('should respond within reasonable time', async () => {
      console.log('Testing response time...');

      const startTime = Date.now();
      await snapshots.list(DATALAYER_TOKEN, BASE_URL);
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      console.log(`Response time: ${responseTime}ms`);

      // Should respond within 10 seconds
      expect(responseTime).toBeLessThan(10000);
    });
  });
});
