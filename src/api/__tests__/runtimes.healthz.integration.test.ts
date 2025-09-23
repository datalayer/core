/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { describe, it, expect } from 'vitest';
import { healthz } from '../runtimes';
import { testConfig, skipIfNoToken } from './test-config';

/**
 * Integration tests for Runtimes health check API
 * These tests run against the actual Datalayer Runtimes API
 */
describe('Runtimes Healthz Integration Tests', () => {
  describe.skipIf(skipIfNoToken())('ping endpoint', () => {
    it('should successfully ping the Runtimes service', async () => {
      console.log('Testing health check ping endpoint for Runtimes...');

      const response = await healthz.ping(testConfig.getBaseUrl('RUNTIMES'));

      // Log response for debugging
      console.log('Ping response:', JSON.stringify(response, null, 2));

      // Verify response structure
      expect(response).toBeDefined();
      expect(response.success).toBe(true);
      expect(response.message).toBeDefined();

      // Log success
      console.log('Runtimes health check successful');
      console.log('Success:', response.success);
      console.log('Message:', response.message);
      if (response.status) {
        console.log('Status:', response.status.status);
      }
      if (response.version) {
        console.log('Version:', response.version);
      }
    });

    it('should work with default URL if not specified', async () => {
      console.log('Testing health check with default URL...');

      // Use default URL (should use production)
      const response = await healthz.ping();

      expect(response).toBeDefined();
      expect(response.success).toBe(true);
      expect(response.message).toBeDefined();

      console.log('Successfully pinged Runtimes service with default URL');
    });

    it('should fail with invalid URL', async () => {
      console.log('Testing health check with invalid URL...');

      const invalidUrl = 'https://invalid.datalayer.run';

      await expect(healthz.ping(invalidUrl)).rejects.toThrow(
        'Health check failed',
      );

      console.log('Correctly failed with invalid URL');
    });
  });
});
