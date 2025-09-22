#!/usr/bin/env node

/*
 * Script to verify runtime cleanup is working properly
 * Runs before and after tests to ensure no runtimes are left behind
 */

const { DatalayerSDK } = require('../dist/api/index.js');
const dotenv = require('dotenv');
const path = require('path');

// Load test environment
dotenv.config({ path: path.resolve(process.cwd(), '.env.test') });

async function checkRuntimes() {
  if (!process.env.DATALAYER_TEST_TOKEN) {
    console.log('No test token available - skipping runtime check');
    return;
  }

  const sdk = new DatalayerSDK({
    baseUrl: process.env.DATALAYER_TEST_BASE_URL || 'https://prod1.datalayer.run',
    token: process.env.DATALAYER_TEST_TOKEN,
    timeout: 30000,
  });

  try {
    console.log('\n🔍 Checking for existing runtimes...');
    const runtimes = await sdk.runtimes.list({ limit: 50 });

    if (runtimes.length === 0) {
      console.log('✅ No runtimes found - cleanup is working properly');
      return;
    }

    console.log(`Found ${runtimes.length} runtime(s):`);

    // Group by likely test vs non-test runtimes
    const testRuntimes = [];
    const otherRuntimes = [];

    for (const runtime of runtimes) {
      if (runtime.pod_name &&
          runtime.pod_name.startsWith('runtime-') &&
          runtime.pod_name.length > 15) {
        testRuntimes.push(runtime);
      } else {
        otherRuntimes.push(runtime);
      }
    }

    if (testRuntimes.length > 0) {
      console.log(`⚠️  Found ${testRuntimes.length} potential test runtime(s):`);
      testRuntimes.forEach(r =>
        console.log(`   - ${r.pod_name} (${r.state || 'unknown state'})`)
      );
    }

    if (otherRuntimes.length > 0) {
      console.log(`ℹ️  Found ${otherRuntimes.length} other runtime(s):`);
      otherRuntimes.forEach(r =>
        console.log(`   - ${r.pod_name} (${r.state || 'unknown state'})`)
      );
    }

    // Optionally clean up test runtimes
    if (process.argv.includes('--cleanup') && testRuntimes.length > 0) {
      console.log('\n🧹 Cleaning up test runtimes...');
      for (const runtime of testRuntimes) {
        try {
          await sdk.runtimes.delete(runtime.pod_name);
          console.log(`   ✅ Deleted ${runtime.pod_name}`);
        } catch (error) {
          if (error.status !== 404) {
            console.log(`   ❌ Failed to delete ${runtime.pod_name}: ${error.message}`);
          }
        }
      }
    }

  } catch (error) {
    console.error('❌ Error checking runtimes:', error.message);
    process.exit(1);
  }
}

checkRuntimes().catch(console.error);