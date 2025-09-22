/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { describe } from 'vitest';
import { DatalayerSDK } from '../../index';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.test') });

export class ResourceTracker {
  private resources: Array<{
    type: string;
    id: string;
    cleanup: () => Promise<void>;
  }> = [];

  track(type: string, id: string, cleanup: () => Promise<void>): void {
    this.resources.unshift({ type, id, cleanup });
  }

  removeResource(type: string, id: string): void {
    this.resources = this.resources.filter(
      resource => !(resource.type === type && resource.id === id),
    );
  }

  async cleanupAll(): Promise<void> {
    if (this.resources.length === 0) return;

    console.log(`\nCleaning up ${this.resources.length} tracked resources...`);

    for (const resource of this.resources) {
      try {
        await resource.cleanup();
        console.log(`Cleaned up ${resource.type}: ${resource.id}`);
      } catch (error: any) {
        if (error.status !== 404) {
          console.warn(
            `Failed to clean up ${resource.type} ${resource.id}:`,
            error.message || error,
          );
        } else {
          console.log(`${resource.type} ${resource.id} already deleted (404)`);
        }
      }
    }
    this.resources = [];
  }

  listTrackedResources(): Array<{ type: string; id: string }> {
    return this.resources.map(({ type, id }) => ({ type, id }));
  }
}

export const testConfig = {
  hasToken: !!process.env.DATALAYER_TEST_TOKEN,
  skipExpensive: process.env.DATALAYER_TEST_SKIP_EXPENSIVE === 'true',
  baseUrl: process.env.DATALAYER_TEST_BASE_URL || 'https://prod1.datalayer.run',
};

export const describeIntegration: any = testConfig.hasToken
  ? describe
  : describe.skip;

export function createTestSDK(): DatalayerSDK {
  return new DatalayerSDK({
    baseUrl: testConfig.baseUrl,
    token: process.env.DATALAYER_TEST_TOKEN,
    timeout: 30000,
  });
}

export function logTestHeader(serviceName: string): void {
  if (testConfig.hasToken) {
    console.log(`\nRunning ${serviceName} integration tests`);
    console.log(`Base URL: ${testConfig.baseUrl}`);
    console.log(`Skip expensive: ${testConfig.skipExpensive}\n`);
  }
}

export function addTestDelay(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, 200));
}
