/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { describe, it, expect } from 'vitest';
import { snapshots } from '..';
import { MOCK_JWT_TOKEN } from '../../../__tests__/shared/test-constants';

describe('Runtimes Snapshots Unit Tests', () => {
  describe('create parameter validation', () => {
    const mockBaseUrl = 'https://example.com';
    const mockData = {
      pod_name: 'pod-123',
      name: 'my-snapshot',
      description: 'Test snapshot',
      stop: true,
    };

    it('should fail when token is missing', async () => {
      console.log('Testing create with missing token...');

      await expect(
        // @ts-expect-error Testing undefined token
        snapshots.createSnapshot(undefined, mockData, mockBaseUrl),
      ).rejects.toThrow('Authentication token is required');

      console.log('Correctly rejected create with missing token');
    });

    it('should fail when token is empty', async () => {
      console.log('Testing create with empty token...');

      await expect(
        snapshots.createSnapshot('', mockData, mockBaseUrl),
      ).rejects.toThrow('Authentication token is required');

      console.log('Correctly rejected create with empty token');
    });

    it('should fail when token is only whitespace', async () => {
      console.log('Testing create with whitespace token...');

      await expect(
        snapshots.createSnapshot('   ', mockData, mockBaseUrl),
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
        snapshots.listSnapshots(undefined, mockBaseUrl),
      ).rejects.toThrow('Authentication token is required');

      console.log('Correctly rejected list with missing token');
    });

    it('should fail when token is null', async () => {
      console.log('Testing list with null token...');

      await expect(
        // @ts-expect-error Testing null token
        snapshots.listSnapshots(null, mockBaseUrl),
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
        snapshots.getSnapshot(undefined, 'snapshot-123', mockBaseUrl),
      ).rejects.toThrow('Authentication token is required');

      console.log('Correctly rejected get with missing token');
    });

    it('should fail when snapshot ID is missing', async () => {
      console.log('Testing get with missing snapshot ID...');

      await expect(
        // @ts-expect-error Testing undefined snapshot ID
        snapshots.getSnapshot(MOCK_JWT_TOKEN, undefined, mockBaseUrl),
      ).rejects.toThrow('Snapshot ID is required');

      console.log('Correctly rejected get with missing snapshot ID');
    });

    it('should fail when snapshot ID is empty', async () => {
      console.log('Testing get with empty snapshot ID...');

      await expect(
        snapshots.getSnapshot(MOCK_JWT_TOKEN, '', mockBaseUrl),
      ).rejects.toThrow('Snapshot ID is required');

      console.log('Correctly rejected get with empty snapshot ID');
    });

    it('should fail when snapshot ID is only whitespace', async () => {
      console.log('Testing get with whitespace snapshot ID...');

      await expect(
        snapshots.getSnapshot(MOCK_JWT_TOKEN, '   ', mockBaseUrl),
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
        snapshots.deleteSnapshot(undefined, 'snapshot-123', mockBaseUrl),
      ).rejects.toThrow('Authentication token is required');

      console.log('Correctly rejected remove with missing token');
    });

    it('should fail when snapshot ID is missing', async () => {
      console.log('Testing remove with missing snapshot ID...');

      await expect(
        // @ts-expect-error Testing undefined snapshot ID
        snapshots.deleteSnapshot(MOCK_JWT_TOKEN, undefined, mockBaseUrl),
      ).rejects.toThrow('Snapshot ID is required');

      console.log('Correctly rejected remove with missing snapshot ID');
    });
  });
});
