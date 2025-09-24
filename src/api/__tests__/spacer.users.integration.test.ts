/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { users } from '../spacer';
import { testConfig, debugLog, skipIfNoToken } from './test-config';

let DATALAYER_TOKEN: string;
let BASE_URL: string;

// Skip all tests if no token is available
const skipTests = skipIfNoToken();

beforeAll(async () => {
  if (skipTests) {
    console.log(
      'WARNING: Skipping Spacer Users integration tests: No Datalayer API token configured',
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

describe.skipIf(skipTests)('Spacer Users Integration Tests', () => {
  describe('getMySpaces', () => {
    it('should successfully get spaces for authenticated user', async () => {
      console.log('Testing getMySpaces endpoint...');

      const response = await users.getMySpaces(DATALAYER_TOKEN, BASE_URL);

      console.log('Response:', JSON.stringify(response, null, 2));

      // Verify the response structure
      expect(response).toBeDefined();
      expect(response).toHaveProperty('success');
      expect(response.success).toBe(true);
      expect(response).toHaveProperty('message');
      expect(typeof response.message).toBe('string');
      expect(response).toHaveProperty('spaces');
      expect(Array.isArray(response.spaces)).toBe(true);

      console.log(`Found ${response.spaces.length} space(s) for user`);

      // If user has spaces, verify the structure
      if (response.spaces.length > 0) {
        const firstSpace = response.spaces[0];
        console.log('First space:', {
          uid: firstSpace.uid,
          name: firstSpace.name_t,
          handle: firstSpace.handle_s,
        });

        // Verify space structure
        expect(firstSpace).toHaveProperty('uid');
        expect(firstSpace).toHaveProperty('handle_s');
        expect(firstSpace).toHaveProperty('name_t');
        expect(firstSpace).toHaveProperty('description_t');
        expect(firstSpace).toHaveProperty('items');

        // Verify members array if present
        if (firstSpace.members !== undefined) {
          expect(Array.isArray(firstSpace.members)).toBe(true);
        }
      } else {
        console.log('User has no spaces');
      }
    });

    it('should work with default URL if not specified', async () => {
      console.log('Testing getMySpaces with default URL...');

      // Call without specifying URL to use default
      const response = await users.getMySpaces(DATALAYER_TOKEN);

      console.log('Default URL response:', JSON.stringify(response, null, 2));

      // Should still get valid response
      expect(response).toBeDefined();
      expect(response.success).toBe(true);
      expect(response).toHaveProperty('spaces');
      expect(Array.isArray(response.spaces)).toBe(true);
    });

    it('should handle invalid token gracefully', async () => {
      console.log('Testing with invalid token...');

      const invalidToken = 'invalid-token-123';

      try {
        await users.getMySpaces(invalidToken, BASE_URL);
        // If we get here, the API accepted the invalid token (shouldn't happen)
        console.log('WARNING: API accepted invalid token');
      } catch (error: any) {
        console.log('Error with invalid token:', error.message);
        // We expect an error with invalid token
        expect(error).toBeDefined();
        expect(error.message).toBeDefined();
        // The error message should indicate authentication failure
        expect(
          error.message.toLowerCase().includes('unauthorized') ||
            error.message.toLowerCase().includes('auth') ||
            error.message.toLowerCase().includes('token') ||
            error.message.toLowerCase().includes('401'),
        ).toBe(true);
      }
    });

    it('should handle empty spaces gracefully', async () => {
      console.log('Testing response for user with potentially no spaces...');

      const response = await users.getMySpaces(DATALAYER_TOKEN, BASE_URL);

      // Response should be valid even if spaces array is empty
      expect(response).toBeDefined();
      expect(response.success).toBe(true);
      expect(response).toHaveProperty('spaces');
      expect(Array.isArray(response.spaces)).toBe(true);

      if (response.spaces.length === 0) {
        console.log('User has no spaces (expected for new users)');
        expect(response.message).toBeDefined();
      }
    });
  });

  describe('performance', () => {
    it('should respond within reasonable time', async () => {
      console.log('Testing response time...');

      const startTime = Date.now();
      await users.getMySpaces(DATALAYER_TOKEN, BASE_URL);
      const endTime = Date.now();
      const responseTime = endTime - startTime;

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
  });

  describe('consistency', () => {
    it('should return consistent data on multiple calls', async () => {
      console.log('Testing data consistency...');

      // Make two calls
      const response1 = await users.getMySpaces(DATALAYER_TOKEN, BASE_URL);
      const response2 = await users.getMySpaces(DATALAYER_TOKEN, BASE_URL);

      // Both should be successful
      expect(response1.success).toBe(true);
      expect(response2.success).toBe(true);

      // Space count should be the same (unless user created/deleted between calls)
      expect(response1.spaces.length).toBe(response2.spaces.length);

      // If there are spaces, their UIDs should match
      if (response1.spaces.length > 0) {
        const uids1 = response1.spaces.map(s => s.uid).sort();
        const uids2 = response2.spaces.map(s => s.uid).sort();
        expect(uids1).toEqual(uids2);
        console.log('Data consistency verified across multiple calls');
      }
    });
  });
});
