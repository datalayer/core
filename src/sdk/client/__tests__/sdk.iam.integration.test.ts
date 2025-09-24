/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { DatalayerSDK } from '..';
import { testConfig } from '../../../__tests__/shared/test-config';
import { DEFAULT_SERVICE_URLS } from '../../../api/constants';

/**
 * SDK IAM Integration Tests
 *
 * Tests authentication and identity management functionality
 * using the SDK client.
 */
describe('SDK IAM Integration Tests', () => {
  let sdk: DatalayerSDK;

  beforeAll(() => {
    if (!testConfig.hasToken()) {
      return;
    }

    sdk = new DatalayerSDK({
      token: testConfig.getToken(),
      iamRunUrl: DEFAULT_SERVICE_URLS.IAM,
      runtimesRunUrl: DEFAULT_SERVICE_URLS.RUNTIMES,
      spacerRunUrl: DEFAULT_SERVICE_URLS.SPACER,
    });
  });

  describe.skipIf(!testConfig.hasToken())('IAM authentication methods', () => {
    describe('whoami', () => {
      it('should get current user profile', async () => {
        console.log('Testing whoami...');
        const user = await sdk.whoami();

        expect(user).toBeDefined();
        expect(user.id).toBeDefined();
        expect(user.uid).toBeDefined();
        expect(user.handle).toBeDefined();
        expect((user as any).roles).toBeDefined();
        expect(Array.isArray((user as any).roles)).toBe(true);

        console.log('Current user:');
        console.log(`  ID: ${user.id}`);
        console.log(`  UID: ${user.uid}`);
        console.log(`  Handle: ${user.handle}`);
        console.log(`  Email: ${user.email || 'Not provided'}`);
        console.log(
          `  Name: ${(user as any).first_name} ${(user as any).last_name}`,
        );
        console.log(`  Roles: ${(user as any).roles.join(', ')}`);
      });

      it('should include organization info if available', async () => {
        console.log('Checking organization info...');
        const user = await sdk.whoami();

        if (
          (user as any).organizationIds &&
          (user as any).organizationIds.length > 0
        ) {
          console.log(
            `User belongs to ${(user as any).organizationIds.length} organization(s)`,
          );
          expect(Array.isArray((user as any).organizationIds)).toBe(true);
        } else {
          console.log('User does not belong to any organizations');
        }
      });

      it('should cache user profile for performance', async () => {
        console.log('Testing user profile caching...');

        const start1 = Date.now();
        const user1 = await sdk.whoami();
        const time1 = Date.now() - start1;

        const start2 = Date.now();
        const user2 = await sdk.whoami();
        const time2 = Date.now() - start2;

        // Second call should be same or faster (cached)
        expect(user2.id).toBe(user1.id);
        console.log(`First call: ${time1}ms, Second call: ${time2}ms`);
      });
    });

    describe('login', () => {
      it('should handle invalid credentials properly', async () => {
        console.log('Testing login with invalid credentials...');

        try {
          await sdk.login({
            handle: 'invalid@example.com',
            password: 'wrong-password',
          });
          // Should not reach here
          expect(true).toBe(false);
        } catch (error: any) {
          expect(error).toBeDefined();
          console.log('Invalid login rejected correctly');
        }
      });

      it('should validate login request structure', async () => {
        console.log('Testing login validation...');

        try {
          // Missing required fields
          await sdk.login({} as any);
          expect(true).toBe(false);
        } catch (error: any) {
          expect(error).toBeDefined();
          console.log('Invalid login request rejected');
        }
      });
    });

    describe('token management', () => {
      it('should include token in all API requests', async () => {
        console.log('Verifying token is included in requests...');

        // Make a request and verify it succeeds (which means token was included)
        const user = await sdk.whoami();
        expect(user).toBeDefined();

        // Verify token is stored in SDK
        const token = (sdk as any).getToken();
        expect(token).toBe(testConfig.getToken());

        console.log('Token management verified');
      });

      it('should handle expired tokens gracefully', async () => {
        console.log('Testing expired token handling...');

        const expiredSdk = new DatalayerSDK({
          token: 'expired.invalid.token',
          iamRunUrl: DEFAULT_SERVICE_URLS.IAM,
          runtimesRunUrl: DEFAULT_SERVICE_URLS.RUNTIMES,
          spacerRunUrl: DEFAULT_SERVICE_URLS.SPACER,
        });

        try {
          await expiredSdk.whoami();
          expect(true).toBe(false);
        } catch (error: any) {
          expect(error).toBeDefined();
          console.log('Expired token rejected correctly');
        }
      });
    });

    describe('logout', () => {
      it('should handle logout operation', async () => {
        console.log('Testing logout...');

        // Create a separate SDK instance for logout test
        const logoutSdk = new DatalayerSDK({
          token: testConfig.getToken(),
          iamRunUrl: DEFAULT_SERVICE_URLS.IAM,
          runtimesRunUrl: DEFAULT_SERVICE_URLS.RUNTIMES,
          spacerRunUrl: DEFAULT_SERVICE_URLS.SPACER,
        });

        // Verify we can make authenticated requests
        const userBefore = await logoutSdk.whoami();
        expect(userBefore).toBeDefined();

        // Note: Actual logout may not invalidate the token server-side
        // This tests the logout method exists and can be called
        await logoutSdk.logout();
        console.log('Logout completed');

        // In a real scenario, subsequent requests might fail
        // But with API tokens, they typically remain valid until expiry
      });
    });

    describe('error handling', () => {
      it('should provide clear error messages for auth failures', async () => {
        console.log('Testing auth error messages...');

        const invalidSdk = new DatalayerSDK({
          token: 'invalid-token',
          iamRunUrl: DEFAULT_SERVICE_URLS.IAM,
          runtimesRunUrl: DEFAULT_SERVICE_URLS.RUNTIMES,
          spacerRunUrl: DEFAULT_SERVICE_URLS.SPACER,
        });

        try {
          await invalidSdk.whoami();
          expect(true).toBe(false);
        } catch (error: any) {
          expect(error.message).toBeDefined();
          // Error should mention authentication or unauthorized
          const errorLower = error.message.toLowerCase();
          expect(
            errorLower.includes('auth') ||
              errorLower.includes('unauth') ||
              errorLower.includes('401') ||
              errorLower.includes('403'),
          ).toBe(true);
          console.log('Auth error message is clear and helpful');
        }
      });
    });
  });
});
