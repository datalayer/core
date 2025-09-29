/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { authentication, profile } from '../iam';
import {
  testConfig,
  debugLog,
  skipIfNoToken,
} from '../../__tests__/shared/test-config';

let DATALAYER_API_KEY: string;
let SESSION_TOKEN: string;
let BASE_URL: string;

// Skip all tests if no token is available
const skipTests = skipIfNoToken();

beforeAll(async () => {
  if (skipTests) {
    console.log(
      'WARNING: Skipping profile integration tests: No Datalayer API token configured',
    );
    console.log(
      '         Set DATALAYER_API_TOKEN env var or DATALAYER_TEST_API_KEY in .env.test',
    );
    return;
  }

  // Get token and base URL from test config
  DATALAYER_API_KEY = testConfig.getToken();
  BASE_URL = testConfig.getBaseUrl('IAM');

  debugLog('Test configuration loaded');
  debugLog('Base URL:', BASE_URL);
  debugLog('Token available:', !!DATALAYER_API_KEY);

  // Login to get a session token for profile tests
  try {
    const loginResponse = await authentication.login({
      token: DATALAYER_API_KEY,
    });
    SESSION_TOKEN = loginResponse.token;
    debugLog('Successfully logged in, got session token');
  } catch (error) {
    console.error('Failed to login for profile tests:', error);
    throw error;
  }
});

describe.skipIf(skipTests)('IAM Profile Integration Tests', () => {
  describe('me', () => {
    it('should successfully get current user profile with token', async () => {
      console.log('Testing /me endpoint with session token...');

      const response = await profile.me(SESSION_TOKEN, BASE_URL);

      console.log('Profile response:', JSON.stringify(response, null, 2));

      // Verify response structure
      expect(response).toBeDefined();
      expect(response.success).toBe(true);
      expect(response.message).toBeDefined();
      expect(typeof response.message).toBe('string');

      // Verify me object structure
      expect(response.me).toBeDefined();
      expect(response.me.id).toBeDefined();
      expect(typeof response.me.id).toBe('string');
      expect(response.me.uid).toBeDefined();
      expect(typeof response.me.uid).toBe('string');
      expect(response.me.handle).toBeDefined();
      expect(typeof response.me.handle).toBe('string');
      expect(response.me.email).toBeDefined();
      expect(typeof response.me.email).toBe('string');
      expect(response.me.firstName).toBeDefined();
      expect(typeof response.me.firstName).toBe('string');
      expect(response.me.lastName).toBeDefined();
      expect(typeof response.me.lastName).toBe('string');
      expect(response.me.avatarUrl).toBeDefined();
      expect(typeof response.me.avatarUrl).toBe('string');
      expect(response.me.roles).toBeDefined();
      expect(Array.isArray(response.me.roles)).toBe(true);

      console.log('Successfully retrieved user profile');
      console.log('ID:', response.me.id);
      console.log('UID:', response.me.uid);
      console.log('Email:', response.me.email);
      console.log('Handle:', response.me.handle);
      console.log('Name:', response.me.firstName, response.me.lastName);
      console.log('Roles:', response.me.roles.join(', '));
    });

    it('should successfully get current user profile using default URL', async () => {
      console.log('Testing /me endpoint with default URL...');

      const response = await profile.me(SESSION_TOKEN);

      console.log(
        'Profile response with default URL:',
        JSON.stringify(response, null, 2),
      );

      // Verify response structure
      expect(response).toBeDefined();
      expect(response.success).toBe(true);
      expect(response.message).toBeDefined();
      expect(response.me).toBeDefined();
      expect(response.me.uid).toBeDefined();
      expect(response.me.handle).toBeDefined();
      expect(response.me.email).toBeDefined();
      expect(Array.isArray(response.me.roles)).toBe(true);

      console.log('Successfully retrieved user profile with default URL');
      console.log('UID:', response.me.uid);
      console.log('Handle:', response.me.handle);
    });

    it('should fail when using invalid token', async () => {
      console.log('Testing /me endpoint with invalid token...');

      const invalidToken =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJpbnZhbGlkIiwiaWF0IjoxNTE2MjM5MDIyfQ.invalid_signature_here';

      try {
        await profile.me(invalidToken, BASE_URL);

        // If we get here, the API accepted an invalid token (shouldn't happen)
        throw new Error('Expected API to reject invalid token');
      } catch (error: any) {
        console.log('API correctly rejected invalid token:', error.message);
        expect(error).toBeDefined();
        expect(error.message).toBeDefined();
        // The error message should indicate server error or authentication failure
        expect(
          error.message.includes('401') ||
            error.message.includes('Unauthorized') ||
            error.message.includes('Invalid') ||
            error.message.includes('credentials') ||
            error.message.includes('Server Error') ||
            error.message.includes('500'),
        ).toBe(true);
      }
    });

    it('should fail when no token is provided', async () => {
      console.log('Testing /me endpoint without token...');

      try {
        // @ts-expect-error Testing missing required parameter
        await profile.me();

        // Should not reach here
        throw new Error('Expected function to throw for missing token');
      } catch (error: any) {
        console.log('Correctly rejected request without token:', error.message);
        expect(error).toBeDefined();
        expect(error.message).toBe('Authentication token is required');
      }
    });

    it('should fail when empty token is provided', async () => {
      console.log('Testing /me endpoint with empty token...');

      try {
        await profile.me('', BASE_URL);

        // Should not reach here
        throw new Error('Expected function to throw for empty token');
      } catch (error: any) {
        console.log(
          'Correctly rejected request with empty token:',
          error.message,
        );
        expect(error).toBeDefined();
        expect(error.message).toBe('Authentication token is required');
      }
    });
  });

  describe('whoami', () => {
    it('should successfully get current user identity with token', async () => {
      console.log('Testing /whoami endpoint with session token...');

      const response = await profile.whoami(SESSION_TOKEN, BASE_URL);

      console.log('WhoAmI response:', JSON.stringify(response, null, 2));

      // Verify response structure
      expect(response).toBeDefined();
      expect(response.success).toBe(true);
      expect(response.message).toBeDefined();
      expect(typeof response.message).toBe('string');

      // Verify profile object structure
      expect(response.profile).toBeDefined();
      expect(response.profile.id).toBeDefined();
      expect(typeof response.profile.id).toBe('string');
      expect(response.profile.uid).toBeDefined();
      expect(typeof response.profile.uid).toBe('string');
      expect(response.profile.handle_s).toBeDefined();
      expect(typeof response.profile.handle_s).toBe('string');
      expect(response.profile.email_s).toBeDefined();
      expect(typeof response.profile.email_s).toBe('string');
      expect(response.profile.first_name_t).toBeDefined();
      expect(typeof response.profile.first_name_t).toBe('string');
      expect(response.profile.last_name_t).toBeDefined();
      expect(typeof response.profile.last_name_t).toBe('string');
      expect(response.profile.type_s).toBeDefined();
      expect(typeof response.profile.type_s).toBe('string');
      expect(response.profile.origin_s).toBeDefined();
      expect(typeof response.profile.origin_s).toBe('string');
      expect(response.profile.creation_ts_dt).toBeDefined();
      expect(typeof response.profile.creation_ts_dt).toBe('string');
      expect(response.profile.last_update_ts_dt).toBeDefined();
      expect(typeof response.profile.last_update_ts_dt).toBe('string');
      expect(response.profile.join_ts_dt).toBeDefined();
      expect(typeof response.profile.join_ts_dt).toBe('string');
      // join_request_ts_dt can be null
      if (response.profile.join_request_ts_dt !== null) {
        expect(typeof response.profile.join_request_ts_dt).toBe('string');
      }

      console.log('Successfully retrieved user identity');
      console.log('ID:', response.profile.id);
      console.log('UID:', response.profile.uid);
      console.log('Email:', response.profile.email_s);
      console.log('Handle:', response.profile.handle_s);
      console.log(
        'Name:',
        response.profile.first_name_t,
        response.profile.last_name_t,
      );
      console.log('Type:', response.profile.type_s);
    });

    it('should successfully get current user identity using default URL', async () => {
      console.log('Testing /whoami endpoint with default URL...');

      const response = await profile.whoami(SESSION_TOKEN);

      console.log(
        'WhoAmI response with default URL:',
        JSON.stringify(response, null, 2),
      );

      // Verify response structure
      expect(response).toBeDefined();
      expect(response.success).toBe(true);
      expect(response.message).toBeDefined();
      expect(response.profile).toBeDefined();
      expect(response.profile.uid).toBeDefined();
      expect(response.profile.handle_s).toBeDefined();
      expect(response.profile.email_s).toBeDefined();

      console.log('Successfully retrieved user identity with default URL');
      console.log('UID:', response.profile.uid);
      console.log('Handle:', response.profile.handle_s);
    });

    it('should fail whoami when using invalid token', async () => {
      console.log('Testing /whoami endpoint with invalid token...');

      const invalidToken =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJpbnZhbGlkIiwiaWF0IjoxNTE2MjM5MDIyfQ.invalid_signature_here';

      try {
        await profile.whoami(invalidToken, BASE_URL);

        // If we get here, the API accepted an invalid token (shouldn't happen)
        throw new Error('Expected API to reject invalid token');
      } catch (error: any) {
        console.log('API correctly rejected invalid token:', error.message);
        expect(error).toBeDefined();
        expect(error.message).toBeDefined();
        // The error message should indicate server error or authentication failure
        expect(
          error.message.includes('401') ||
            error.message.includes('Unauthorized') ||
            error.message.includes('Invalid') ||
            error.message.includes('credentials') ||
            error.message.includes('Server Error') ||
            error.message.includes('500'),
        ).toBe(true);
      }
    });

    it('should fail whoami when no token is provided', async () => {
      console.log('Testing /whoami endpoint without token...');

      try {
        // @ts-expect-error Testing missing required parameter
        await profile.whoami();

        // Should not reach here
        throw new Error('Expected function to throw for missing token');
      } catch (error: any) {
        console.log('Correctly rejected request without token:', error.message);
        expect(error).toBeDefined();
        expect(error.message).toBe('Authentication token is required');
      }
    });

    it('should fail whoami when empty token is provided', async () => {
      console.log('Testing /whoami endpoint with empty token...');

      try {
        await profile.whoami('', BASE_URL);

        // Should not reach here
        throw new Error('Expected function to throw for empty token');
      } catch (error: any) {
        console.log(
          'Correctly rejected request with empty token:',
          error.message,
        );
        expect(error).toBeDefined();
        expect(error.message).toBe('Authentication token is required');
      }
    });
  });
});
