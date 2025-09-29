/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { healthz } from '../iam';
import {
  testConfig,
  debugLog,
  skipIfNoToken,
} from '../../__tests__/shared/test-config';

let BASE_URL: string;

// Skip all tests if no token is available
const skipTests = skipIfNoToken();

beforeAll(async () => {
  if (skipTests) {
    console.log(
      'WARNING: Skipping IAM healthz integration tests: No Datalayer API token configured',
    );
    console.log(
      '         Set DATALAYER_API_TOKEN env var or TEST_DATALAYER_API_KEY in .env.test',
    );
    return;
  }

  // Get base URL from test config
  BASE_URL = testConfig.getBaseUrl('IAM');

  debugLog('Test configuration loaded');
  debugLog('Base URL:', BASE_URL);
});

describe.skipIf(skipTests)('IAM Healthz Integration Tests', () => {
  describe('ping endpoint', () => {
    it('should successfully ping the IAM service', async () => {
      console.log('Testing health check ping endpoint...');

      const response = await healthz.ping(BASE_URL);

      console.log('Ping response:', JSON.stringify(response, null, 2));

      // Verify the response structure matches actual API response
      expect(response).toBeDefined();
      expect(response.success).toBe(true);
      expect(response.message).toBeDefined();
      expect(response.message.toLowerCase()).toContain('running');
      expect(response.status).toBeDefined();
      expect(response.status.status).toBe('OK');
      expect(response.version).toBeDefined();
      expect(typeof response.version).toBe('string');

      console.log('Health check successful');
      console.log('Success:', response.success);
      console.log('Message:', response.message);
      console.log('Status:', response.status.status);
      console.log('Version:', response.version);
    });

    it('should work with default URL if not specified', async () => {
      console.log('Testing health check with default URL...');

      // Call without specifying URL to use default
      const response = await healthz.ping();

      console.log(
        'Default URL ping response:',
        JSON.stringify(response, null, 2),
      );

      // Should still get valid response
      expect(response).toBeDefined();
      expect(response.success).toBe(true);
      expect(response.status).toBeDefined();
      expect(response.status.status).toBe('OK');
    });
  });

  describe('error handling', () => {
    it('should handle malformed URLs gracefully', async () => {
      console.log('Testing error handling with malformed URL...');

      const malformedUrl = 'not-a-valid-url';

      // ping should throw an error
      await expect(healthz.ping(malformedUrl)).rejects.toThrow();
    });
  });
});
