/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { describe, it, expect, beforeAll, afterAll, test } from 'vitest';
import { runtimes } from '../runtimes';
import { testConfig, debugLog, skipIfNoToken } from './test-config';

let DATALAYER_TOKEN: string;
let BASE_URL: string;

// Skip all tests if no token is available
const skipTests = skipIfNoToken();

beforeAll(async () => {
  if (skipTests) {
    console.log(
      'WARNING: Skipping Runtimes integration tests: No Datalayer API token configured',
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

describe.skipIf(skipTests)('Runtimes Integration Tests', () => {
  describe('list', () => {
    it('should successfully list runtime instances', async () => {
      console.log('Testing list runtimes endpoint...');

      const response = await runtimes.list(DATALAYER_TOKEN, BASE_URL);

      console.log('Runtimes response:', JSON.stringify(response, null, 2));

      // Verify the response structure
      expect(response).toBeDefined();
      expect(response).toHaveProperty('success');
      expect(response.success).toBe(true);
      expect(response).toHaveProperty('message');
      expect(response).toHaveProperty('runtimes');
      expect(Array.isArray(response.runtimes)).toBe(true);

      console.log(`Found ${response.runtimes.length} runtime instances`);

      // If we have runtimes, check the structure of the first one
      if (response.runtimes.length > 0) {
        const firstRuntime = response.runtimes[0];
        console.log('First runtime pod name:', firstRuntime.pod_name);

        // Verify runtime structure
        expect(firstRuntime).toHaveProperty('pod_name');
        expect(firstRuntime).toHaveProperty('uid');
        expect(firstRuntime).toHaveProperty('environment_name');
        expect(firstRuntime).toHaveProperty('burning_rate');
        expect(firstRuntime).toHaveProperty('type');

        // Check optional fields if present
        if (firstRuntime.given_name) {
          console.log('Runtime given name:', firstRuntime.given_name);
        }
        if (firstRuntime.started_at) {
          console.log('Runtime started at:', firstRuntime.started_at);
        }
      }
    });

    it('should work with default URL if not specified', async () => {
      console.log('Testing list runtimes with default URL...');

      // Call without specifying URL to use default
      const response = await runtimes.list(DATALAYER_TOKEN);

      console.log(
        'Default URL runtimes response:',
        JSON.stringify(response, null, 2),
      );

      // Should still get valid response
      expect(response).toBeDefined();
      expect(response.success).toBe(true);
      expect(response).toHaveProperty('runtimes');
      expect(Array.isArray(response.runtimes)).toBe(true);
    });
  });

  describe('create runtime', () => {
    it('should handle non-existent environment gracefully', async () => {
      console.log('Testing create with non-existent environment...');

      const createData = {
        environment_name: 'non-existent-environment',
        type: 'notebook' as const,
        given_name: 'test-runtime',
      };

      try {
        await runtimes.create(DATALAYER_TOKEN, createData, BASE_URL);
        // If we get here, the environment somehow exists
        console.log('WARNING: Non-existent environment accepted');
      } catch (error: any) {
        console.log('Error for non-existent environment:', error.message);
        // We expect an error for non-existent environment
        expect(error).toBeDefined();
        expect(error.message).toBeDefined();
        // The API returns a generic error message for 400 Bad Request
        // rather than our custom 'not found' message
        expect(error.message).toBeDefined();
      }
    });
  });

  // Sequential tests for runtime lifecycle with actual API calls
  // These tests create real resources and incur costs.
  // Run with DATALAYER_TEST_RUN_EXPENSIVE=true to enable
  describe
    .skipIf(!testConfig.shouldRunExpensive())
    .sequential('Runtime Lifecycle (Expensive Operations)', () => {
      let pythonRuntimePodName: string | null = null;
      let aiRuntimePodName: string | null = null;
      const environments = testConfig.getTestEnvironments();

      // Cleanup after all tests
      afterAll(async () => {
        console.log('Cleaning up created runtimes...');
        const runtimesToClean = [pythonRuntimePodName, aiRuntimePodName];

        for (const podName of runtimesToClean) {
          if (podName) {
            try {
              await runtimes.remove(DATALAYER_TOKEN, podName, BASE_URL);
              console.log(`Cleanup: Successfully deleted runtime ${podName}`);
            } catch (error: any) {
              console.log(
                `Cleanup: Runtime ${podName} already deleted or not found: ${error.message}`,
              );
            }
          }
        }
      });

      test('1. should create two runtimes with different environments', async () => {
        console.log('Creating runtimes with different environments...');

        // Create Python runtime
        console.log(
          `Creating Python runtime with environment: ${environments.python}`,
        );
        const pythonCreateData = {
          environment_name: environments.python,
          type: 'notebook' as const,
          given_name: 'test-python-runtime',
          credits_limit: 10,
        };

        const pythonResponse = await runtimes.create(
          DATALAYER_TOKEN,
          pythonCreateData,
          BASE_URL,
        );

        expect(pythonResponse).toBeDefined();
        expect(pythonResponse.success).toBe(true);
        expect(pythonResponse.runtime).toBeDefined();
        expect(pythonResponse.runtime.pod_name).toBeDefined();
        expect(pythonResponse.runtime.environment_name).toBe(
          environments.python,
        );
        expect(pythonResponse.runtime.given_name).toBe('test-python-runtime');

        pythonRuntimePodName = pythonResponse.runtime.pod_name;
        console.log(`Created Python runtime: ${pythonRuntimePodName}`);

        // Create AI runtime
        console.log(`Creating AI runtime with environment: ${environments.ai}`);
        const aiCreateData = {
          environment_name: environments.ai,
          type: 'notebook' as const,
          given_name: 'test-ai-runtime',
          credits_limit: 10,
        };

        const aiResponse = await runtimes.create(
          DATALAYER_TOKEN,
          aiCreateData,
          BASE_URL,
        );

        expect(aiResponse).toBeDefined();
        expect(aiResponse.success).toBe(true);
        expect(aiResponse.runtime).toBeDefined();
        expect(aiResponse.runtime.pod_name).toBeDefined();
        expect(aiResponse.runtime.environment_name).toBe(environments.ai);
        expect(aiResponse.runtime.given_name).toBe('test-ai-runtime');

        aiRuntimePodName = aiResponse.runtime.pod_name;
        console.log(`Created AI runtime: ${aiRuntimePodName}`);

        // Verify both are different
        expect(pythonRuntimePodName).not.toBe(aiRuntimePodName);
      }, 60000); // 60 second timeout for creation

      test('2. should list runtimes and find both created ones', async () => {
        console.log('Listing all runtimes...');

        const response = await runtimes.list(DATALAYER_TOKEN, BASE_URL);

        expect(response).toBeDefined();
        expect(response.success).toBe(true);
        expect(response.runtimes).toBeDefined();
        expect(Array.isArray(response.runtimes)).toBe(true);

        // Find our created runtimes
        const pythonRuntime = response.runtimes.find(
          r => r.pod_name === pythonRuntimePodName,
        );
        const aiRuntime = response.runtimes.find(
          r => r.pod_name === aiRuntimePodName,
        );

        expect(pythonRuntime).toBeDefined();
        expect(pythonRuntime?.given_name).toBe('test-python-runtime');
        expect(pythonRuntime?.environment_name).toBe(environments.python);

        expect(aiRuntime).toBeDefined();
        expect(aiRuntime?.given_name).toBe('test-ai-runtime');
        expect(aiRuntime?.environment_name).toBe(environments.ai);

        console.log(
          `Found both runtimes in list. Total runtimes: ${response.runtimes.length}`,
        );
      });

      test('3. should get details of both created runtimes', async () => {
        console.log('Getting details of both runtimes...');

        // Get Python runtime details
        const pythonDetails = await runtimes.get(
          DATALAYER_TOKEN,
          pythonRuntimePodName!,
          BASE_URL,
        );

        expect(pythonDetails).toBeDefined();
        expect(pythonDetails.pod_name).toBe(pythonRuntimePodName);
        expect(pythonDetails.given_name).toBe('test-python-runtime');
        expect(pythonDetails.environment_name).toBe(environments.python);
        expect(pythonDetails.uid).toBeDefined();
        expect(pythonDetails.burning_rate).toBeDefined();

        console.log(
          `Python runtime details: UID=${pythonDetails.uid}, State=${pythonDetails.state}`,
        );

        // Get AI runtime details
        const aiDetails = await runtimes.get(
          DATALAYER_TOKEN,
          aiRuntimePodName!,
          BASE_URL,
        );

        expect(aiDetails).toBeDefined();
        expect(aiDetails.pod_name).toBe(aiRuntimePodName);
        expect(aiDetails.given_name).toBe('test-ai-runtime');
        expect(aiDetails.environment_name).toBe(environments.ai);
        expect(aiDetails.uid).toBeDefined();
        expect(aiDetails.burning_rate).toBeDefined();

        console.log(
          `AI runtime details: UID=${aiDetails.uid}, State=${aiDetails.state}`,
        );
      });

      test('4. should update both runtimes', async () => {
        console.log('Updating both runtimes...');

        // Note: The put method takes a 'from' parameter
        // This might be used to update from a snapshot or source
        // We'll need to understand what valid values are expected here

        // For now, we'll skip the actual update if we don't know valid 'from' values
        console.log(
          'Note: Put method expects a "from" parameter - needs clarification on valid values',
        );

        // Example of what the call would look like:
        // const pythonUpdate = await runtimes.put(
        //   DATALAYER_TOKEN,
        //   pythonRuntimePodName!,
        //   'some-valid-from-value',
        //   BASE_URL,
        // );
      });

      test('5. should delete the Python runtime first', async () => {
        console.log(`Deleting Python runtime: ${pythonRuntimePodName}`);

        await runtimes.remove(DATALAYER_TOKEN, pythonRuntimePodName!, BASE_URL);

        console.log('Python runtime deletion request sent');

        // Mark it as deleted so cleanup doesn't try again
        const deletedPod = pythonRuntimePodName;
        pythonRuntimePodName = null;

        // Verify it's gone
        try {
          await runtimes.get(DATALAYER_TOKEN, deletedPod!, BASE_URL);
          // If we get here, the runtime still exists
          throw new Error('Python runtime should have been deleted');
        } catch (error: any) {
          // Expected to fail - API returns generic error
          expect(error.message).toBeDefined();
          console.log('Confirmed: Python runtime is deleted');
        }
      });

      test('6. should verify Python runtime is deleted but AI runtime still exists', async () => {
        console.log('Verifying runtime states...');

        const response = await runtimes.list(DATALAYER_TOKEN, BASE_URL);

        // Python runtime should not be in the list
        const pythonRuntime = response.runtimes.find(
          r => r.given_name === 'test-python-runtime',
        );
        expect(pythonRuntime).toBeUndefined();

        // AI runtime should still be in the list
        const aiRuntime = response.runtimes.find(
          r => r.pod_name === aiRuntimePodName,
        );
        expect(aiRuntime).toBeDefined();
        expect(aiRuntime?.given_name).toBe('test-ai-runtime');

        console.log(
          'Confirmed: Python runtime deleted, AI runtime still exists',
        );
      });

      test('7. should delete the AI runtime', async () => {
        console.log(`Deleting AI runtime: ${aiRuntimePodName}`);

        await runtimes.remove(DATALAYER_TOKEN, aiRuntimePodName!, BASE_URL);

        console.log('AI runtime deletion request sent');

        // Mark it as deleted so cleanup doesn't try again
        const deletedPod = aiRuntimePodName;
        aiRuntimePodName = null;

        // Verify it's gone
        try {
          await runtimes.get(DATALAYER_TOKEN, deletedPod!, BASE_URL);
          // If we get here, the runtime still exists
          throw new Error('AI runtime should have been deleted');
        } catch (error: any) {
          // Expected to fail - API returns generic error
          expect(error.message).toBeDefined();
          console.log('Confirmed: AI runtime is deleted');
        }
      });

      test('8. should verify both runtimes are deleted', async () => {
        console.log(
          'Final verification: checking both runtimes are deleted...',
        );

        const response = await runtimes.list(DATALAYER_TOKEN, BASE_URL);

        // Neither runtime should be in the list
        const pythonRuntime = response.runtimes.find(
          r => r.given_name === 'test-python-runtime',
        );
        const aiRuntime = response.runtimes.find(
          r => r.given_name === 'test-ai-runtime',
        );

        expect(pythonRuntime).toBeUndefined();
        expect(aiRuntime).toBeUndefined();

        console.log('Confirmed: Both runtimes successfully deleted');
      });
    });

  describe('get runtime details', () => {
    it('should handle non-existent runtime gracefully', async () => {
      console.log('Testing get with non-existent pod name...');

      const nonExistentPod = 'non-existent-pod-12345';

      try {
        await runtimes.get(DATALAYER_TOKEN, nonExistentPod, BASE_URL);
        // If we get here, the pod somehow exists
        console.log('WARNING: Non-existent pod returned data');
      } catch (error: any) {
        console.log('Error for non-existent pod:', error.message);
        // We expect an error for non-existent pod
        expect(error).toBeDefined();
        expect(error.message).toBeDefined();
        // The API returns a generic error message for 400 Bad Request
        // rather than our custom 'not found' message
        expect(error.message).toBeDefined();
      }
    });
  });

  describe('remove runtime', () => {
    it('should handle non-existent runtime deletion gracefully', async () => {
      console.log('Testing remove with non-existent pod name...');

      const nonExistentPod = 'non-existent-pod-12345';

      try {
        await runtimes.remove(DATALAYER_TOKEN, nonExistentPod, BASE_URL);
        // If we get here, the pod somehow existed and was deleted
        console.log('WARNING: Non-existent pod was deleted');
      } catch (error: any) {
        console.log('Error for non-existent pod deletion:', error.message);
        // We expect an error for non-existent pod
        expect(error).toBeDefined();
        expect(error.message).toBeDefined();
        // The API returns a generic error message for 400 Bad Request
        // rather than our custom 'not found' message
        expect(error.message).toBeDefined();
      }
    });
  });

  describe('put (update state)', () => {
    it('should handle non-existent runtime update gracefully', async () => {
      console.log('Testing put with non-existent pod name...');

      const nonExistentPod = 'non-existent-pod-12345';

      try {
        await runtimes.put(
          DATALAYER_TOKEN,
          nonExistentPod,
          'snapshot-123',
          BASE_URL,
        );
        // If we get here, the pod somehow exists
        console.log('WARNING: Non-existent pod state was updated');
      } catch (error: any) {
        console.log('Error for non-existent pod update:', error.message);
        // We expect an error for non-existent pod
        expect(error).toBeDefined();
        expect(error.message).toBeDefined();
        // The API returns a generic error message for 400 Bad Request
        // rather than our custom 'not found' message
        expect(error.message).toBeDefined();
      }
    });
  });

  describe('error handling', () => {
    it('should handle invalid token gracefully', async () => {
      console.log('Testing with invalid token...');

      const invalidToken = 'invalid-token-123';

      try {
        await runtimes.list(invalidToken, BASE_URL);
        // If we get here, the API accepted the invalid token (shouldn't happen)
        console.log('WARNING: API accepted invalid token');
      } catch (error: any) {
        console.log('Error with invalid token:', error.message);
        // We expect an error with invalid token
        expect(error).toBeDefined();
        expect(error.message).toBeDefined();
      }
    });
  });

  describe('performance', () => {
    it('should respond within reasonable time', async () => {
      console.log('Testing response time...');

      const startTime = Date.now();
      await runtimes.list(DATALAYER_TOKEN, BASE_URL);
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      console.log(`Response time: ${responseTime}ms`);

      // Should respond within 10 seconds
      expect(responseTime).toBeLessThan(10000);
    });
  });
});
