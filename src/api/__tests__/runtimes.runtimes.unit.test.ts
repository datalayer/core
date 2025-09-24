/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { describe, it, expect } from 'vitest';
import { runtimes } from '../runtimes';
import { MOCK_JWT_TOKEN } from './test-constants';

describe('Runtimes Unit Tests', () => {
  describe('create parameter validation', () => {
    const mockBaseUrl = 'https://example.com';
    const mockData = {
      environment_name: 'python-cpu-env',
      type: 'notebook' as const,
      given_name: 'test-runtime',
      credits_limit: 100,
    };

    it('should fail when token is missing', async () => {
      console.log('Testing create with missing token...');

      await expect(
        // @ts-expect-error Testing undefined token
        runtimes.createRuntime(undefined, mockData, mockBaseUrl),
      ).rejects.toThrow('Authentication token is required');

      console.log('Correctly rejected create with missing token');
    });

    it('should fail when token is empty', async () => {
      console.log('Testing create with empty token...');

      await expect(runtimes.create('', mockData, mockBaseUrl)).rejects.toThrow(
        'Authentication token is required',
      );

      console.log('Correctly rejected create with empty token');
    });

    it('should fail when token is only whitespace', async () => {
      console.log('Testing create with whitespace token...');

      await expect(
        runtimes.createRuntime('   ', mockData, mockBaseUrl),
      ).rejects.toThrow('Authentication token is required');

      console.log('Correctly rejected create with whitespace token');
    });
  });

  describe('list parameter validation', () => {
    const mockBaseUrl = 'https://example.com';

    it('should fail when token is missing', async () => {
      console.log('Testing list with missing token...');

      await expect(
        // @ts-expect-error Testing undefined token
        runtimes.listRuntimes(undefined, mockBaseUrl),
      ).rejects.toThrow('Authentication token is required');

      console.log('Correctly rejected list with missing token');
    });

    it('should fail when token is null', async () => {
      console.log('Testing list with null token...');

      await expect(
        // @ts-expect-error Testing null token
        runtimes.listRuntimes(null, mockBaseUrl),
      ).rejects.toThrow('Authentication token is required');

      console.log('Correctly rejected list with null token');
    });

    it('should fail when token is empty', async () => {
      console.log('Testing list with empty token...');

      await expect(runtimes.listRuntimes('', mockBaseUrl)).rejects.toThrow(
        'Authentication token is required',
      );

      console.log('Correctly rejected list with empty token');
    });

    it('should fail when token is only whitespace', async () => {
      console.log('Testing list with whitespace token...');

      await expect(runtimes.listRuntimes('   ', mockBaseUrl)).rejects.toThrow(
        'Authentication token is required',
      );

      console.log('Correctly rejected list with whitespace token');
    });
  });

  describe('get parameter validation', () => {
    const mockBaseUrl = 'https://example.com';

    it('should fail when token is missing', async () => {
      console.log('Testing get with missing token...');

      await expect(
        // @ts-expect-error Testing undefined token
        runtimes.getRuntime(undefined, 'pod-123', mockBaseUrl),
      ).rejects.toThrow('Authentication token is required');

      console.log('Correctly rejected get with missing token');
    });

    it('should fail when pod name is missing', async () => {
      console.log('Testing get with missing pod name...');

      await expect(
        // @ts-expect-error Testing undefined pod name
        runtimes.getRuntime(MOCK_JWT_TOKEN, undefined, mockBaseUrl),
      ).rejects.toThrow('Pod name is required');

      console.log('Correctly rejected get with missing pod name');
    });

    it('should fail when pod name is empty', async () => {
      console.log('Testing get with empty pod name...');

      await expect(
        runtimes.getRuntime(MOCK_JWT_TOKEN, '', mockBaseUrl),
      ).rejects.toThrow('Pod name is required');

      console.log('Correctly rejected get with empty pod name');
    });

    it('should fail when pod name is only whitespace', async () => {
      console.log('Testing get with whitespace pod name...');

      await expect(
        runtimes.getRuntime(MOCK_JWT_TOKEN, '   ', mockBaseUrl),
      ).rejects.toThrow('Pod name is required');

      console.log('Correctly rejected get with whitespace pod name');
    });
  });

  describe('remove parameter validation', () => {
    const mockBaseUrl = 'https://example.com';

    it('should fail when token is missing', async () => {
      console.log('Testing remove with missing token...');

      await expect(
        // @ts-expect-error Testing undefined token
        runtimes.deleteRuntime(undefined, 'pod-123', mockBaseUrl),
      ).rejects.toThrow('Authentication token is required');

      console.log('Correctly rejected remove with missing token');
    });

    it('should fail when pod name is missing', async () => {
      console.log('Testing remove with missing pod name...');

      await expect(
        // @ts-expect-error Testing undefined pod name
        runtimes.deleteRuntime(MOCK_JWT_TOKEN, undefined, mockBaseUrl),
      ).rejects.toThrow('Pod name is required');

      console.log('Correctly rejected remove with missing pod name');
    });

    it('should fail when pod name is empty', async () => {
      console.log('Testing remove with empty pod name...');

      await expect(
        runtimes.deleteRuntime(MOCK_JWT_TOKEN, '', mockBaseUrl),
      ).rejects.toThrow('Pod name is required');

      console.log('Correctly rejected remove with empty pod name');
    });

    it('should fail when pod name is only whitespace', async () => {
      console.log('Testing remove with whitespace pod name...');

      await expect(
        runtimes.deleteRuntime(MOCK_JWT_TOKEN, '   ', mockBaseUrl),
      ).rejects.toThrow('Pod name is required');

      console.log('Correctly rejected remove with whitespace pod name');
    });
  });

  describe('put parameter validation', () => {
    const mockBaseUrl = 'https://example.com';

    it('should fail when token is missing', async () => {
      console.log('Testing put with missing token...');

      await expect(
        // @ts-expect-error Testing undefined token
        runtimes.updateRuntime(
          undefined,
          'pod-123',
          'snapshot-123',
          mockBaseUrl,
        ),
      ).rejects.toThrow('Authentication token is required');

      console.log('Correctly rejected put with missing token');
    });

    it('should fail when pod name is missing', async () => {
      console.log('Testing put with missing pod name...');

      await expect(
        // @ts-expect-error Testing undefined pod name
        runtimes.updateRuntime(
          MOCK_JWT_TOKEN,
          undefined,
          'snapshot-123',
          mockBaseUrl,
        ),
      ).rejects.toThrow('Pod name is required');

      console.log('Correctly rejected put with missing pod name');
    });

    it('should fail when pod name is empty', async () => {
      console.log('Testing put with empty pod name...');

      await expect(
        runtimes.updateRuntime(MOCK_JWT_TOKEN, '', 'snapshot-123', mockBaseUrl),
      ).rejects.toThrow('Pod name is required');

      console.log('Correctly rejected put with empty pod name');
    });

    it('should fail when pod name is only whitespace', async () => {
      console.log('Testing put with whitespace pod name...');

      await expect(
        runtimes.updateRuntime(
          MOCK_JWT_TOKEN,
          '   ',
          'snapshot-123',
          mockBaseUrl,
        ),
      ).rejects.toThrow('Pod name is required');

      console.log('Correctly rejected put with whitespace pod name');
    });
  });
});
