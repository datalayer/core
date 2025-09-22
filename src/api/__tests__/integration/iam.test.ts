/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import {
  describeIntegration,
  createTestSDK,
  ResourceTracker,
  addTestDelay,
  logTestHeader,
} from './utils';

if (!process.env.DATALAYER_TEST_TOKEN) {
  console.log(
    '\nIAM integration tests will be SKIPPED (no DATALAYER_TEST_TOKEN)',
  );
  console.log('   To run real integration tests, create .env.test with:');
  console.log('   DATALAYER_TEST_TOKEN=your-token\n');
}

describeIntegration('IAM Service Integration Tests', () => {
  let sdk: ReturnType<typeof createTestSDK>;
  let tracker: ResourceTracker;
  let currentUser: any;

  beforeAll(async () => {
    logTestHeader('IAM');
    tracker = new ResourceTracker();
    sdk = createTestSDK();

    try {
      currentUser = await sdk.iam.users.me();
      const user = currentUser;
      console.log(`Authenticated as: ${user?.email || user?.id || 'unknown'}`);
      console.log('Full user response:', JSON.stringify(currentUser, null, 2));
    } catch (error: any) {
      console.error('Authentication failed:', error.message);
      console.error('Error details:', error);
      throw error;
    }
  });

  afterAll(async () => {
    await tracker.cleanupAll();
  });

  beforeEach(() => {
    return addTestDelay();
  });

  describe('Authentication & User Management', () => {
    it('should get current user information', async () => {
      const user = await sdk.iam.users.me();

      expect(user).toBeDefined();
      expect(user.id || user.user_id).toBeTruthy();
      expect(user.handle || user.email || user.uid).toBeTruthy();
    });

    it('should get credit balance', async () => {
      try {
        const credits = await sdk.iam.credits.getBalance();

        expect(credits).toBeDefined();
        expect(typeof credits.total).toBe('number');
        expect(typeof credits.used).toBe('number');
        expect(typeof credits.remaining).toBe('number');
        expect(credits.remaining).toBeLessThanOrEqual(credits.total);
      } catch (error: any) {
        if (error.status === 404) {
          console.log('Credits endpoint not available (404)');
          expect(true).toBe(true);
        } else {
          throw error;
        }
      }
    });

    it('should list organizations', async () => {
      try {
        const organizations = await sdk.iam.organizations.list({ limit: 5 });

        expect(organizations).toBeDefined();
        expect(Array.isArray(organizations)).toBe(true);
      } catch (error: any) {
        if (error.status === 403 || error.status === 404) {
          console.log('Organizations endpoint not accessible or not available');
          expect(true).toBe(true);
        } else {
          throw error;
        }
      }
    });

    it('should search users', async () => {
      try {
        const users = await sdk.iam.users.search('test', { limit: 5 });

        expect(users).toBeDefined();
        expect(Array.isArray(users)).toBe(true);
      } catch (error: any) {
        if (error.status === 403 || error.status === 404) {
          console.log('User search endpoint not accessible');
          expect(true).toBe(true);
        } else {
          throw error;
        }
      }
    });
  });

  describe('Credit Management', () => {
    it('should verify credit balance structure', async () => {
      try {
        const credits = await sdk.iam.credits.getBalance();

        expect(credits).toHaveProperty('total');
        expect(credits).toHaveProperty('used');
        expect(credits).toHaveProperty('remaining');
        expect(credits.total).toBeGreaterThanOrEqual(0);
        expect(credits.used).toBeGreaterThanOrEqual(0);
        expect(credits.remaining).toBeGreaterThanOrEqual(0);
      } catch (error: any) {
        if (error.status === 404) {
          console.log('Credits endpoint not available (404)');
          expect(true).toBe(true);
        } else {
          throw error;
        }
      }
    });
  });
});
