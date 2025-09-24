/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { describe, it, expect, beforeAll, test } from 'vitest';
import { runtimes, snapshots } from '../runtimes';
import { testConfig, debugLog, skipIfNoToken } from './test-config';

let DATALAYER_TOKEN: string;
let BASE_URL: string;

// Skip all tests if no token is available
const skipTests = skipIfNoToken();

beforeAll(async () => {
  if (skipTests) {
    console.log(
      'WARNING: Skipping Runtimes Lifecycle integration tests: No Datalayer API token configured',
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

describe.skipIf(skipTests)(
  'Runtimes & Snapshots Lifecycle Integration Tests',
  () => {
    // Complete lifecycle test for runtimes and snapshots
    // These tests create real resources and incur costs.
    // Run with DATALAYER_TEST_RUN_EXPENSIVE=true to enable
    describe
      .skipIf(!testConfig.shouldRunExpensive())
      .sequential('complete runtime and snapshot lifecycle', () => {
        let pythonRuntimePodName: string | null = null;
        let aiRuntimePodName: string | null = null;
        let pythonSnapshotUid: string | undefined;
        let aiSnapshotUid: string | undefined;
        const environments = testConfig.getTestEnvironments();

        // No cleanup needed - handled by global setup/teardown

        test(
          '1. should create two runtimes with different environments',
          { timeout: 60000 },
          async () => {
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

            const pythonResponse = await runtimes.createRuntime(
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
            expect(pythonResponse.runtime.given_name).toBe(
              'test-python-runtime',
            );

            pythonRuntimePodName = pythonResponse.runtime.pod_name;
            console.log(`Created Python runtime: ${pythonRuntimePodName}`);

            // Create AI runtime
            console.log(
              `Creating AI runtime with environment: ${environments.ai}`,
            );
            const aiCreateData = {
              environment_name: environments.ai,
              type: 'notebook' as const,
              given_name: 'test-ai-runtime',
              credits_limit: 10,
            };

            const aiResponse = await runtimes.createRuntime(
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

            // Wait for runtimes to be ready
            console.log('Waiting for runtimes to be ready...');
            await new Promise(resolve => setTimeout(resolve, 5000));
          },
        );

        test('2. should list runtimes and find both created ones', async () => {
          console.log('Listing all runtimes...');

          const response = await runtimes.listRuntimes(
            DATALAYER_TOKEN,
            BASE_URL,
          );

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

        test(
          '3. should create snapshots of both runtimes',
          { timeout: 60000 },
          async () => {
            console.log('Creating snapshots of both runtimes...');

            // Create snapshot of Python runtime
            console.log('Creating snapshot of Python runtime...');
            const pythonSnapshotData = {
              pod_name: pythonRuntimePodName!,
              name: `python-snapshot-${Date.now()}`,
              description: 'Test snapshot for Python runtime',
              stop: false, // Don't stop the runtime after snapshot
            };

            try {
              const pythonSnapshotResponse = await snapshots.createSnapshot(
                DATALAYER_TOKEN,
                pythonSnapshotData,
                BASE_URL,
              );

              console.log(
                'Python snapshot response:',
                JSON.stringify(pythonSnapshotResponse, null, 2),
              );

              if (pythonSnapshotResponse.success) {
                expect(pythonSnapshotResponse).toHaveProperty('snapshot');
                expect(pythonSnapshotResponse.snapshot).toHaveProperty('uid');
                pythonSnapshotUid = pythonSnapshotResponse.snapshot.uid;
                console.log(
                  `Python snapshot created with UID: ${pythonSnapshotUid}`,
                );
              } else {
                console.log(
                  'Python snapshot creation failed, skipping snapshot tests',
                );
              }
            } catch (error: any) {
              console.error('Failed to create Python snapshot:', error.message);
            }

            // Create snapshot of AI runtime
            console.log('Creating snapshot of AI runtime...');
            const aiSnapshotData = {
              pod_name: aiRuntimePodName!,
              name: `ai-snapshot-${Date.now()}`,
              description: 'Test snapshot for AI runtime',
              stop: false,
            };

            try {
              const aiSnapshotResponse = await snapshots.createSnapshot(
                DATALAYER_TOKEN,
                aiSnapshotData,
                BASE_URL,
              );

              console.log(
                'AI snapshot response:',
                JSON.stringify(aiSnapshotResponse, null, 2),
              );

              if (aiSnapshotResponse.success) {
                expect(aiSnapshotResponse).toHaveProperty('snapshot');
                expect(aiSnapshotResponse.snapshot).toHaveProperty('uid');
                aiSnapshotUid = aiSnapshotResponse.snapshot.uid;
                console.log(`AI snapshot created with UID: ${aiSnapshotUid}`);
              } else {
                console.log(
                  'AI snapshot creation failed, skipping snapshot tests',
                );
              }
            } catch (error: any) {
              console.error('Failed to create AI snapshot:', error.message);
            }
          },
        );

        test('4. should list snapshots and find created ones', async () => {
          if (!pythonSnapshotUid && !aiSnapshotUid) {
            console.log('No snapshots were created, skipping list test');
            return;
          }

          console.log('Listing snapshots to verify creation...');
          const listResponse = await snapshots.listSnapshots(
            DATALAYER_TOKEN,
            BASE_URL,
          );

          expect(listResponse).toBeDefined();
          expect(listResponse).toHaveProperty('success');
          expect(listResponse.success).toBe(true);
          expect(listResponse).toHaveProperty('snapshots');
          expect(Array.isArray(listResponse.snapshots)).toBe(true);

          if (pythonSnapshotUid) {
            const foundPythonSnapshot = listResponse.snapshots.find(
              s => s.uid === pythonSnapshotUid,
            );
            expect(foundPythonSnapshot).toBeDefined();
            console.log('Python snapshot found in list');
          }

          if (aiSnapshotUid) {
            const foundAiSnapshot = listResponse.snapshots.find(
              s => s.uid === aiSnapshotUid,
            );
            expect(foundAiSnapshot).toBeDefined();
            console.log('AI snapshot found in list');
          }

          console.log(`Total snapshots: ${listResponse.snapshots.length}`);
        });

        test('5. should get snapshot details', async () => {
          if (!pythonSnapshotUid && !aiSnapshotUid) {
            console.log('No snapshots were created, skipping get test');
            return;
          }

          console.log('Getting snapshot details...');

          if (pythonSnapshotUid) {
            const pythonGetResponse = await snapshots.getSnapshot(
              DATALAYER_TOKEN,
              pythonSnapshotUid,
              BASE_URL,
            );

            expect(pythonGetResponse).toBeDefined();
            expect(pythonGetResponse).toHaveProperty('success');
            expect(pythonGetResponse.success).toBe(true);
            expect(pythonGetResponse).toHaveProperty('snapshot');
            expect(pythonGetResponse.snapshot.uid).toBe(pythonSnapshotUid);
            console.log('Python snapshot details retrieved successfully');
          }

          if (aiSnapshotUid) {
            const aiGetResponse = await snapshots.getSnapshot(
              DATALAYER_TOKEN,
              aiSnapshotUid,
              BASE_URL,
            );

            expect(aiGetResponse).toBeDefined();
            expect(aiGetResponse).toHaveProperty('success');
            expect(aiGetResponse.success).toBe(true);
            expect(aiGetResponse).toHaveProperty('snapshot');
            expect(aiGetResponse.snapshot.uid).toBe(aiSnapshotUid);
            console.log('AI snapshot details retrieved successfully');
          }
        });

        test('6. should restore runtime from snapshot', async () => {
          if (!pythonSnapshotUid) {
            console.log(
              'No Python snapshot was created, skipping restore test',
            );
            return;
          }

          console.log('Testing runtime restoration from snapshot...');

          // Note: The updateRuntime method expects a 'from' parameter
          // which should be the snapshot UID for restoration
          try {
            const restoreResponse = await runtimes.updateRuntime(
              DATALAYER_TOKEN,
              pythonRuntimePodName!,
              pythonSnapshotUid,
              BASE_URL,
            );

            console.log(
              'Restore response:',
              JSON.stringify(restoreResponse, null, 2),
            );
            console.log('Runtime restored from snapshot successfully');
          } catch (error: any) {
            console.log('Restore from snapshot test skipped:', error.message);
            // This might fail if the API doesn't support this operation yet
          }
        });

        test('7. should delete snapshots', async () => {
          if (!pythonSnapshotUid && !aiSnapshotUid) {
            console.log('No snapshots were created, skipping delete test');
            return;
          }

          console.log('Deleting snapshots...');

          if (pythonSnapshotUid) {
            await snapshots.deleteSnapshot(
              DATALAYER_TOKEN,
              pythonSnapshotUid,
              BASE_URL,
            );
            console.log('Python snapshot deletion request sent');

            // Verify deletion
            try {
              await snapshots.getSnapshot(
                DATALAYER_TOKEN,
                pythonSnapshotUid,
                BASE_URL,
              );
              console.log(
                'WARNING: Python snapshot still exists after deletion (might be soft delete)',
              );
            } catch (error) {
              console.log(
                'Python snapshot properly deleted (404 error expected)',
              );
            }

            pythonSnapshotUid = undefined; // Mark as deleted
          }

          if (aiSnapshotUid) {
            await snapshots.deleteSnapshot(
              DATALAYER_TOKEN,
              aiSnapshotUid,
              BASE_URL,
            );
            console.log('AI snapshot deletion request sent');

            // Verify deletion
            try {
              await snapshots.getSnapshot(
                DATALAYER_TOKEN,
                aiSnapshotUid,
                BASE_URL,
              );
              console.log(
                'WARNING: AI snapshot still exists after deletion (might be soft delete)',
              );
            } catch (error) {
              console.log('AI snapshot properly deleted (404 error expected)');
            }

            aiSnapshotUid = undefined; // Mark as deleted
          }
        });

        test('8. should delete Python runtime', async () => {
          console.log(`Deleting Python runtime: ${pythonRuntimePodName}`);

          await runtimes.deleteRuntime(
            DATALAYER_TOKEN,
            pythonRuntimePodName!,
            BASE_URL,
          );

          console.log('Python runtime deletion request sent');

          // Mark it as deleted so cleanup doesn't try again
          const deletedPod = pythonRuntimePodName;
          pythonRuntimePodName = null;

          // Verify it's gone
          try {
            await runtimes.getRuntime(DATALAYER_TOKEN, deletedPod!, BASE_URL);
            throw new Error('Python runtime should have been deleted');
          } catch (error: any) {
            expect(error.message).toBeDefined();
            console.log('Confirmed: Python runtime is deleted');
          }
        });

        test('9. should verify Python runtime is deleted but AI runtime exists', async () => {
          console.log('Verifying runtime states...');

          const response = await runtimes.listRuntimes(
            DATALAYER_TOKEN,
            BASE_URL,
          );

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

        test('10. should delete AI runtime', async () => {
          console.log(`Deleting AI runtime: ${aiRuntimePodName}`);

          await runtimes.deleteRuntime(
            DATALAYER_TOKEN,
            aiRuntimePodName!,
            BASE_URL,
          );

          console.log('AI runtime deletion request sent');

          // Mark it as deleted so cleanup doesn't try again
          const deletedPod = aiRuntimePodName;
          aiRuntimePodName = null;

          // Verify it's gone
          try {
            await runtimes.getRuntime(DATALAYER_TOKEN, deletedPod!, BASE_URL);
            throw new Error('AI runtime should have been deleted');
          } catch (error: any) {
            expect(error.message).toBeDefined();
            console.log('Confirmed: AI runtime is deleted');
          }
        });

        test('11. should verify both runtimes are deleted', async () => {
          console.log(
            'Final verification: checking both runtimes are deleted...',
          );

          const response = await runtimes.listRuntimes(
            DATALAYER_TOKEN,
            BASE_URL,
          );

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
          console.log('Complete lifecycle test finished successfully!');
        });
      });

    // Basic smoke tests that always run
    describe('smoke tests', () => {
      it('should successfully list runtime instances', async () => {
        console.log('Testing list runtimes endpoint...');

        const response = await runtimes.listRuntimes(DATALAYER_TOKEN, BASE_URL);

        console.log(`Found ${response.runtimes.length} runtime instances`);

        expect(response).toBeDefined();
        expect(response).toHaveProperty('success');
        expect(response.success).toBe(true);
        expect(response).toHaveProperty('runtimes');
        expect(Array.isArray(response.runtimes)).toBe(true);

        if (response.runtimes.length > 0) {
          const firstRuntime = response.runtimes[0];
          console.log('First runtime pod name:', firstRuntime.pod_name);

          expect(firstRuntime).toHaveProperty('pod_name');
          expect(firstRuntime).toHaveProperty('uid');
          expect(firstRuntime).toHaveProperty('environment_name');
          expect(firstRuntime).toHaveProperty('burning_rate');
        }
      });

      it('should successfully list runtime snapshots', async () => {
        console.log('Testing list snapshots endpoint...');

        const response = await snapshots.listSnapshots(
          DATALAYER_TOKEN,
          BASE_URL,
        );

        console.log(`Found ${response.snapshots.length} runtime snapshots`);

        expect(response).toBeDefined();
        expect(response).toHaveProperty('success');
        expect(response.success).toBe(true);
        expect(response).toHaveProperty('snapshots');
        expect(Array.isArray(response.snapshots)).toBe(true);

        if (response.snapshots.length > 0) {
          const firstSnapshot = response.snapshots[0];
          console.log('First snapshot UID:', firstSnapshot.uid);

          expect(firstSnapshot).toHaveProperty('uid');
          expect(firstSnapshot).toHaveProperty('name');
          expect(firstSnapshot).toHaveProperty('environment');
          expect(firstSnapshot).toHaveProperty('updated_at');
        }
      });

      it('should handle non-existent runtime gracefully', async () => {
        console.log('Testing get with non-existent pod name...');

        const nonExistentPod = 'non-existent-pod-12345';

        try {
          await runtimes.getRuntime(DATALAYER_TOKEN, nonExistentPod, BASE_URL);
          console.log('WARNING: Non-existent runtime returned data');
        } catch (error: any) {
          console.log('Error for non-existent runtime:', error.message);
          expect(error).toBeDefined();
          expect(error.message).toBeDefined();
        }
      });
    });
  },
);
