/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { describe, it, expect } from 'vitest';
import { snapshots } from '../runtimes';
import { MOCK_JWT_TOKEN } from './test-constants';

describe('Runtimes Snapshots Unit Tests', () => {
  describe('create parameter validation', () => {
    const mockBaseUrl = 'https://example.com';
    const mockData = {
      runtime_id: 'runtime-123',
      name: 'my-snapshot',
      description: 'Test snapshot',
    };

    it('should fail when token is missing', async () => {
      console.log('Testing create with missing token...');

      await expect(
        // @ts-expect-error Testing undefined token
        snapshots.create(undefined, mockData, mockBaseUrl),
      ).rejects.toThrow('Authentication token is required');

      console.log('Correctly rejected create with missing token');
    });

    it('should fail when token is empty', async () => {
      console.log('Testing create with empty token...');

      await expect(snapshots.create('', mockData, mockBaseUrl)).rejects.toThrow(
        'Authentication token is required',
      );

      console.log('Correctly rejected create with empty token');
    });

    it('should fail when token is only whitespace', async () => {
      console.log('Testing create with whitespace token...');

      await expect(
        snapshots.create('   ', mockData, mockBaseUrl),
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
        snapshots.list(undefined, mockBaseUrl),
      ).rejects.toThrow('Authentication token is required');

      console.log('Correctly rejected list with missing token');
    });

    it('should fail when token is null', async () => {
      console.log('Testing list with null token...');

      await expect(
        // @ts-expect-error Testing null token
        snapshots.list(null, mockBaseUrl),
      ).rejects.toThrow('Authentication token is required');

      console.log('Correctly rejected list with null token');
    });
  });

  describe('get parameter validation', () => {
    const mockBaseUrl = 'https://example.com';

    it('should fail when token is missing', async () => {
      console.log('Testing get with missing token...');

      await expect(
        // @ts-expect-error Testing undefined token
        snapshots.get(undefined, 'snapshot-123', mockBaseUrl),
      ).rejects.toThrow('Authentication token is required');

      console.log('Correctly rejected get with missing token');
    });

    it('should fail when snapshot ID is missing', async () => {
      console.log('Testing get with missing snapshot ID...');

      await expect(
        // @ts-expect-error Testing undefined snapshot ID
        snapshots.get(MOCK_JWT_TOKEN, undefined, mockBaseUrl),
      ).rejects.toThrow('Snapshot ID is required');

      console.log('Correctly rejected get with missing snapshot ID');
    });

    it('should fail when snapshot ID is empty', async () => {
      console.log('Testing get with empty snapshot ID...');

      await expect(
        snapshots.get(MOCK_JWT_TOKEN, '', mockBaseUrl),
      ).rejects.toThrow('Snapshot ID is required');

      console.log('Correctly rejected get with empty snapshot ID');
    });

    it('should fail when snapshot ID is only whitespace', async () => {
      console.log('Testing get with whitespace snapshot ID...');

      await expect(
        snapshots.get(MOCK_JWT_TOKEN, '   ', mockBaseUrl),
      ).rejects.toThrow('Snapshot ID is required');

      console.log('Correctly rejected get with whitespace snapshot ID');
    });
  });

  describe('remove parameter validation', () => {
    const mockBaseUrl = 'https://example.com';

    it('should fail when token is missing', async () => {
      console.log('Testing remove with missing token...');

      await expect(
        // @ts-expect-error Testing undefined token
        snapshots.remove(undefined, 'snapshot-123', mockBaseUrl),
      ).rejects.toThrow('Authentication token is required');

      console.log('Correctly rejected remove with missing token');
    });

    it('should fail when snapshot ID is missing', async () => {
      console.log('Testing remove with missing snapshot ID...');

      await expect(
        // @ts-expect-error Testing undefined snapshot ID
        snapshots.remove(MOCK_JWT_TOKEN, undefined, mockBaseUrl),
      ).rejects.toThrow('Snapshot ID is required');

      console.log('Correctly rejected remove with missing snapshot ID');
    });
  });

  describe('load parameter validation', () => {
    const mockBaseUrl = 'https://example.com';
    const mockData = {
      snapshot_id: 'snapshot-123',
      runtime_id: 'runtime-456',
    };

    it('should fail when token is missing', async () => {
      console.log('Testing load with missing token...');

      await expect(
        // @ts-expect-error Testing undefined token
        snapshots.load(undefined, mockData, mockBaseUrl),
      ).rejects.toThrow('Authentication token is required');

      console.log('Correctly rejected load with missing token');
    });

    it('should fail when token is empty', async () => {
      console.log('Testing load with empty token...');

      await expect(snapshots.load('', mockData, mockBaseUrl)).rejects.toThrow(
        'Authentication token is required',
      );

      console.log('Correctly rejected load with empty token');
    });
  });

  describe('download parameter validation', () => {
    const mockBaseUrl = 'https://example.com';

    it('should fail when token is missing', async () => {
      console.log('Testing download with missing token...');

      await expect(
        // @ts-expect-error Testing undefined token
        snapshots.download(undefined, 'snapshot-123', mockBaseUrl),
      ).rejects.toThrow('Authentication token is required');

      console.log('Correctly rejected download with missing token');
    });

    it('should fail when snapshot ID is missing', async () => {
      console.log('Testing download with missing snapshot ID...');

      await expect(
        // @ts-expect-error Testing undefined snapshot ID
        snapshots.download(MOCK_JWT_TOKEN, undefined, mockBaseUrl),
      ).rejects.toThrow('Snapshot ID is required');

      console.log('Correctly rejected download with missing snapshot ID');
    });

    it('should fail when snapshot ID is empty', async () => {
      console.log('Testing download with empty snapshot ID...');

      await expect(
        snapshots.download(MOCK_JWT_TOKEN, '', mockBaseUrl),
      ).rejects.toThrow('Snapshot ID is required');

      console.log('Correctly rejected download with empty snapshot ID');
    });
  });

  describe('upload parameter validation', () => {
    const mockBaseUrl = 'https://example.com';
    const mockFile = new File(['test'], 'test.snapshot');

    it('should fail when token is missing', async () => {
      console.log('Testing upload with missing token...');

      await expect(
        // @ts-expect-error Testing undefined token
        snapshots.upload(undefined, mockFile, undefined, mockBaseUrl),
      ).rejects.toThrow('Authentication token is required');

      console.log('Correctly rejected upload with missing token');
    });

    it('should fail when token is null', async () => {
      console.log('Testing upload with null token...');

      await expect(
        // @ts-expect-error Testing null token
        snapshots.upload(null, mockFile, undefined, mockBaseUrl),
      ).rejects.toThrow('Authentication token is required');

      console.log('Correctly rejected upload with null token');
    });

    it('should fail when token is only whitespace', async () => {
      console.log('Testing upload with whitespace token...');

      await expect(
        snapshots.upload('   ', mockFile, undefined, mockBaseUrl),
      ).rejects.toThrow('Authentication token is required');

      console.log('Correctly rejected upload with whitespace token');
    });
  });
});
