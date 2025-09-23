/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { describe, it, expect } from 'vitest';
import { profile } from '../iam';

describe('IAM Profile Unit Tests', () => {
  describe('parameter validation', () => {
    it('should handle undefined token parameter at runtime', async () => {
      console.log('Testing that undefined token is caught by validation...');

      // In JavaScript/TypeScript at runtime, calling a function without
      // required parameters just passes undefined for those parameters.
      // Our validation code inside the function should catch this.

      // Test me() with undefined token
      await expect(profile.me(undefined as any)).rejects.toThrow(
        'Authentication token is required',
      );

      // Test whoami() with undefined token
      await expect(profile.whoami(undefined as any)).rejects.toThrow(
        'Authentication token is required',
      );

      console.log('Validation correctly rejects undefined token');
    });

    it('should handle null token parameter at runtime', async () => {
      console.log('Testing that null token is caught by validation...');

      // Test me() with null token
      await expect(profile.me(null as any)).rejects.toThrow(
        'Authentication token is required',
      );

      // Test whoami() with null token
      await expect(profile.whoami(null as any)).rejects.toThrow(
        'Authentication token is required',
      );

      console.log('Validation correctly rejects null token');
    });

    it('should handle empty string token', async () => {
      console.log('Testing that empty string token is caught by validation...');

      // Test me() with empty string
      await expect(profile.me('')).rejects.toThrow(
        'Authentication token is required',
      );

      // Test whoami() with empty string
      await expect(profile.whoami('')).rejects.toThrow(
        'Authentication token is required',
      );

      console.log('Validation correctly rejects empty string token');
    });

    it('should handle whitespace-only token', async () => {
      console.log(
        'Testing that whitespace-only token is caught by validation...',
      );

      // Test me() with whitespace
      await expect(profile.me('   ')).rejects.toThrow(
        'Authentication token is required',
      );

      // Test whoami() with whitespace
      await expect(profile.whoami('   ')).rejects.toThrow(
        'Authentication token is required',
      );

      console.log('Validation correctly rejects whitespace-only token');
    });

    it('demonstrates JavaScript runtime behavior with missing parameters', () => {
      console.log('Demonstrating JS runtime behavior...');

      // This demonstrates that JavaScript doesn't throw errors for missing parameters
      // The function receives undefined for missing parameters
      function testFunction(required: string) {
        return required === undefined;
      }

      // @ts-expect-error TypeScript knows this is wrong, but JS allows it
      const result = testFunction();

      expect(result).toBe(true); // The parameter is undefined
      console.log('JavaScript passes undefined for missing parameters');
    });
  });
});
