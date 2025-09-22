/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { beforeAll, afterAll, beforeEach } from 'vitest';
import { DatalayerSDK } from '../index';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load test environment
dotenv.config({ path: path.resolve(process.cwd(), '.env.test') });

/**
 * Global test setup for Datalayer API tests
 */

export interface TestContext {
  sdk: DatalayerSDK;
  testData: {
    timestamp: number;
    prefix: string;
  };
  resources: Array<{
    type: string;
    id: string;
    cleanup: () => Promise<void>;
  }>;
}

/**
 * Setup test SDK with proper configuration
 */
export function setupTestSDK(): DatalayerSDK {
  const config = {
    baseUrl:
      process.env.DATALAYER_TEST_BASE_URL || 'https://prod1.datalayer.run',
    token: process.env.DATALAYER_TEST_TOKEN || 'test-token',
    timeout: parseInt(process.env.DATALAYER_TEST_TIMEOUT || '30000'),
  };

  return new DatalayerSDK(config);
}

/**
 * Create test context for each test suite
 */
export function createTestContext(): TestContext {
  const timestamp = Date.now();

  return {
    sdk: setupTestSDK(),
    testData: {
      timestamp,
      prefix: `test-${timestamp}`,
    },
    resources: [],
  };
}

/**
 * Track resource for cleanup
 */
export function trackResource(
  context: TestContext,
  type: string,
  id: string,
  cleanup: () => Promise<void>,
): void {
  context.resources.unshift({ type, id, cleanup });
}

/**
 * Clean up all tracked resources
 */
export async function cleanupResources(context: TestContext): Promise<void> {
  if (context.resources.length === 0) return;

  console.log(`\n🧹 Cleaning up ${context.resources.length} resources...`);

  for (const resource of context.resources) {
    try {
      await resource.cleanup();
      console.log(`  ✓ Cleaned up ${resource.type}: ${resource.id}`);
    } catch (error: any) {
      if (error.status !== 404) {
        console.warn(
          `  ⚠ Failed to clean up ${resource.type} ${resource.id}:`,
          error.message,
        );
      }
    }
  }

  context.resources = [];
}

/**
 * Test utilities for assertions
 */
export const testUtils = {
  /**
   * Assert API response has expected structure
   */
  assertApiResponse(response: any, expectedFields: string[]): void {
    expectedFields.forEach(field => {
      if (!(field in response)) {
        throw new Error(`Expected field '${field}' not found in response`);
      }
    });
  },

  /**
   * Assert pagination works correctly
   */
  async assertPagination<T>(
    fetchFn: (params: { limit: number; offset: number }) => Promise<T[]>,
    minExpected: number = 0,
  ): Promise<void> {
    const page1 = await fetchFn({ limit: 2, offset: 0 });
    const page2 = await fetchFn({ limit: 2, offset: 2 });

    if (page1.length >= 2 && page2.length > 0) {
      // @ts-ignore
      if (page1[0].id === page2[0].id) {
        throw new Error(
          'Pagination not working: same items in different pages',
        );
      }
    }
  },

  /**
   * Generate unique test name
   */
  uniqueName(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  },

  /**
   * Wait for condition with timeout
   */
  async waitFor(
    condition: () => Promise<boolean>,
    timeout: number = 5000,
    interval: number = 100,
  ): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      if (await condition()) return;
      await new Promise(resolve => setTimeout(resolve, interval));
    }

    throw new Error(`Timeout waiting for condition after ${timeout}ms`);
  },

  /**
   * Retry operation with exponential backoff
   */
  async retry<T>(
    operation: () => Promise<T>,
    maxAttempts: number = 3,
    baseDelay: number = 1000,
  ): Promise<T> {
    let lastError: any;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;

        if (attempt < maxAttempts) {
          const delay = baseDelay * Math.pow(2, attempt - 1);
          console.log(`  Retry ${attempt}/${maxAttempts} after ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  },

  /**
   * Measure operation performance
   */
  async measurePerformance<T>(
    name: string,
    operation: () => Promise<T>,
  ): Promise<T> {
    const startTime = performance.now();

    try {
      const result = await operation();
      const duration = performance.now() - startTime;
      console.log(`  ⏱️  ${name}: ${duration.toFixed(2)}ms`);
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      console.log(`  ⏱️  ${name} (failed): ${duration.toFixed(2)}ms`);
      throw error;
    }
  },
};

/**
 * Global test hooks for common setup/teardown
 */
export function setupGlobalHooks() {
  let globalContext: TestContext;

  beforeAll(() => {
    globalContext = createTestContext();
    console.log('\n🚀 Test suite starting...');
    return globalContext;
  });

  afterAll(async () => {
    if (globalContext) {
      await cleanupResources(globalContext);
    }
    console.log('✨ Test suite completed\n');
  });

  beforeEach(() => {
    // Add small delay between tests to avoid rate limiting
    return new Promise(resolve => setTimeout(resolve, 100));
  });

  return () => globalContext;
}

/**
 * Skip tests based on environment
 */
export const skipIf = (condition: boolean, message?: string) => {
  return condition ? it.skip : it;
};

export const skipUnless = (condition: boolean, message?: string) => {
  return !condition ? it.skip : it;
};

// Environment checks
export const isCI = process.env.CI === 'true';
export const hasToken = !!process.env.DATALAYER_TEST_TOKEN;
export const skipExpensive =
  process.env.DATALAYER_TEST_SKIP_EXPENSIVE === 'true';

// Test decorators
export const describeAPI = hasToken ? describe : describe.skip;
export const describeExpensive = skipExpensive ? describe.skip : describe;
export const testWithRetry = (name: string, fn: () => Promise<void>) => {
  return it(name, () => testUtils.retry(fn));
};
