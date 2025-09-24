/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { snapshots, runtimes } from '../runtimes';
import { testConfig } from './test-config';

/**
 * Shared cleanup logic for both setup and teardown
 */
export async function performCleanup(phase: 'setup' | 'teardown') {
  const phaseLabel = phase === 'setup' ? 'PRE-TEST' : 'POST-TEST';

  console.log('='.repeat(60));
  console.log(
    `${phaseLabel} CLEANUP: Starting ${phase === 'setup' ? 'pre' : 'post'}-test cleanup...`,
  );
  console.log('='.repeat(60));

  // Check if we have a token
  if (!testConfig.hasToken()) {
    console.log(
      'WARNING: No Datalayer API token configured - skipping cleanup',
    );
    return;
  }

  const DATALAYER_TOKEN = testConfig.getToken();
  const BASE_URL = testConfig.getBaseUrl('RUNTIMES');

  // Clean up runtimes
  await cleanupRuntimes(DATALAYER_TOKEN, BASE_URL, phaseLabel);

  // Clean up test snapshots
  await cleanupTestSnapshots(DATALAYER_TOKEN, BASE_URL, phaseLabel);

  // Final verification (only for teardown)
  if (phase === 'teardown') {
    await verifyFinalState(DATALAYER_TOKEN, BASE_URL);
  }

  console.log('='.repeat(60));
  console.log(
    `${phaseLabel} CLEANUP: ${phase === 'setup' ? 'Pre' : 'Post'}-test cleanup completed`,
  );
  console.log('='.repeat(60));
}

async function cleanupRuntimes(
  token: string,
  baseUrl: string,
  phaseLabel: string,
) {
  try {
    console.log(
      `Cleaning up ${phaseLabel === 'PRE-TEST' ? 'existing' : 'test'} runtimes...`,
    );
    const runtimesResponse = await runtimes.list(token, baseUrl);

    if (!runtimesResponse.runtimes || runtimesResponse.runtimes.length === 0) {
      console.log('✓ No runtimes to clean up');
      return;
    }

    console.log(
      `Found ${runtimesResponse.runtimes.length} runtime(s) to clean up`,
    );

    let removedCount = 0;
    let failedCount = 0;

    for (const runtime of runtimesResponse.runtimes) {
      try {
        await runtimes.remove(token, runtime.pod_name, baseUrl);
        console.log(`  ✓ Removed runtime: ${runtime.pod_name}`);
        removedCount++;
      } catch (error: any) {
        console.log(
          `  ✗ Failed to remove runtime ${runtime.pod_name}: ${error.message}`,
        );
        failedCount++;
      }
    }

    if (removedCount > 0 || failedCount > 0) {
      console.log(
        `Runtime cleanup summary: ${removedCount} removed, ${failedCount} failed`,
      );
    }
  } catch (error: any) {
    console.error('Error cleaning up runtimes:', error.message);
  }
}

async function cleanupTestSnapshots(
  token: string,
  baseUrl: string,
  phaseLabel: string,
) {
  try {
    console.log(
      `Cleaning up test snapshots${phaseLabel === 'POST-TEST' ? ' created during tests' : ''}...`,
    );
    const snapshotsResponse = await snapshots.list(token, baseUrl);

    if (
      !snapshotsResponse.snapshots ||
      snapshotsResponse.snapshots.length === 0
    ) {
      console.log('✓ No snapshots found');
      return;
    }

    // Filter for test snapshots (ones that start with "test-" or "test_")
    const testSnapshots = snapshotsResponse.snapshots.filter(
      s =>
        (s.name?.startsWith('test-') || s.name?.startsWith('test_')) &&
        s.status !== 'deleted',
    );

    if (testSnapshots.length === 0) {
      const totalSnapshots = snapshotsResponse.snapshots.length;
      if (totalSnapshots > 0) {
        console.log(
          `Found ${totalSnapshots} snapshot(s), but none are test snapshots`,
        );
      }
      console.log('✓ No test snapshots to clean up');
      return;
    }

    console.log(`Found ${testSnapshots.length} test snapshot(s) to clean up`);
    console.log(
      `(Out of ${snapshotsResponse.snapshots.length} total snapshots)`,
    );

    let removedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;

    for (const snapshot of testSnapshots) {
      try {
        await snapshots.remove(token, snapshot.uid, baseUrl);
        console.log(`  ✓ Removed snapshot: ${snapshot.name}`);
        removedCount++;
      } catch (error: any) {
        if (
          error.message?.includes('404') ||
          error.message?.includes('not found')
        ) {
          console.log(`  - Already removed: ${snapshot.name}`);
          skippedCount++;
        } else {
          console.log(
            `  ✗ Failed to remove snapshot ${snapshot.name}: ${error.message}`,
          );
          failedCount++;
        }
      }
    }

    if (removedCount > 0 || skippedCount > 0 || failedCount > 0) {
      console.log(
        `Snapshot cleanup summary: ${removedCount} removed, ${skippedCount} skipped, ${failedCount} failed`,
      );
    }
  } catch (error: any) {
    console.error('Error cleaning up snapshots:', error.message);
  }
}

async function verifyFinalState(token: string, baseUrl: string) {
  try {
    const finalRuntimes = await runtimes.list(token, baseUrl);
    const finalSnapshots = await snapshots.list(token, baseUrl);

    const remainingRuntimes = finalRuntimes.runtimes?.length || 0;
    const remainingTestSnapshots = (finalSnapshots.snapshots || []).filter(
      s =>
        (s.name?.startsWith('test-') || s.name?.startsWith('test_')) &&
        s.status !== 'deleted',
    ).length;

    console.log('-'.repeat(60));
    console.log('Final state after all tests:');
    console.log(`  - Remaining runtimes: ${remainingRuntimes}`);
    console.log(
      `  - Remaining active test snapshots: ${remainingTestSnapshots}`,
    );
    console.log(
      `  - Total snapshots: ${finalSnapshots.snapshots?.length || 0}`,
    );

    if (remainingRuntimes > 0) {
      console.log(
        `\nNOTE: ${remainingRuntimes} runtime(s) still active. These may require manual cleanup.`,
      );
    }

    if (remainingTestSnapshots > 0) {
      console.log(
        `\nNOTE: ${remainingTestSnapshots} test snapshot(s) still active. These may require manual cleanup.`,
      );
    }
  } catch (error: any) {
    console.error('Error during final verification:', error.message);
  }
}
