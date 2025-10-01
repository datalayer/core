/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Snapshot } from '../Snapshot';
import type { RuntimeSnapshot } from '../../../api/types/runtimes';
import type { DatalayerClient } from '../../index';
import { snapshots } from '../../../api/runtimes';

vi.mock('../../../api/runtimes', () => ({
  snapshots: {
    deleteSnapshot: vi.fn(),
  },
}));

describe('Snapshot Model', () => {
  const mockSnapshotData: RuntimeSnapshot = {
    uid: 'snapshot-123',
    name: 'Test Snapshot',
    description: 'Test snapshot description',
    environment: 'python-cpu',
    updated_at: '2023-01-01T12:00:00Z',
  };

  let mockSDK: Partial<DatalayerClient>;
  let snapshot: Snapshot;

  beforeEach(() => {
    mockSDK = {
      getToken: vi.fn().mockReturnValue('mock-token'),
      getRuntimesRunUrl: vi
        .fn()
        .mockReturnValue('https://runtimes.example.com'),
      createRuntime: vi.fn(),
    } as any;
    snapshot = new Snapshot(mockSnapshotData, mockSDK as DatalayerClient);
    vi.clearAllMocks();
  });

  describe('Properties', () => {
    it('should return uid', () => {
      expect(snapshot.uid).toBe('snapshot-123');
    });

    it('should return name', () => {
      expect(snapshot.name).toBe('Test Snapshot');
    });

    it('should return description', () => {
      expect(snapshot.description).toBe('Test snapshot description');
    });

    it('should return environment', () => {
      expect(snapshot.environment).toBe('python-cpu');
    });

    it('should return updatedAt', () => {
      expect(snapshot.updatedAt).toEqual(new Date('2023-01-01T12:00:00Z'));
    });

    it('should handle missing optional fields', () => {
      const minimalData: RuntimeSnapshot = {
        uid: 'snapshot-456',
        name: 'Minimal',
        environment: 'python-gpu',
        updated_at: '2023-01-01T10:00:00Z',
      };
      const minimalSnapshot = new Snapshot(
        minimalData,
        mockSDK as DatalayerClient,
      );

      expect(minimalSnapshot.description).toBe('');
    });
  });

  describe('Actions', () => {
    it('should delete snapshot', async () => {
      (snapshots.deleteSnapshot as any).mockResolvedValue({ success: true });

      await snapshot.delete();

      expect(snapshots.deleteSnapshot).toHaveBeenCalledWith(
        'mock-token',
        'snapshot-123',
        'https://runtimes.example.com',
      );
    });

    it('should restore runtime from snapshot', async () => {
      const mockRuntime = { uid: 'runtime-123', name: 'Restored Runtime' };
      (mockSDK.createRuntime as any).mockResolvedValue(mockRuntime);

      const runtime = await snapshot.restore(150);

      expect(mockSDK.createRuntime).toHaveBeenCalledWith({
        environmentName: 'python-cpu',
        type: 'notebook',
        givenName: 'Restored from Test Snapshot',
        minutesLimit: 150,
        fromSnapshotId: 'snapshot-123',
      });
      expect(runtime).toEqual(mockRuntime);
    });
  });

  describe('Deletion state', () => {
    it('should throw error when accessing properties after deletion', async () => {
      (snapshots.deleteSnapshot as any).mockResolvedValue({ success: true });
      await snapshot.delete();

      expect(() => snapshot.uid).toThrow('has been deleted');
      expect(() => snapshot.name).toThrow('has been deleted');
    });

    it('should throw error when calling methods after deletion', async () => {
      (snapshots.deleteSnapshot as any).mockResolvedValue({ success: true });
      await snapshot.delete();

      await expect(snapshot.delete()).rejects.toThrow('has been deleted');
      await expect(snapshot.restore(150)).rejects.toThrow('has been deleted');
      expect(() => snapshot.toJSON()).toThrow('has been deleted');
    });
  });

  describe('Utility methods', () => {
    it('should return JSON', () => {
      const json = snapshot.toJSON();
      expect(json.uid).toBe('snapshot-123');
      expect(json.name).toBe('Test Snapshot');
      expect(json.environment).toBe('python-cpu');
    });

    it('should return string representation', () => {
      expect(snapshot.toString()).toBe('Snapshot(snapshot-123, Test Snapshot)');
    });

    it('should return raw data', () => {
      const raw = snapshot.rawData();
      expect(raw).toEqual(mockSnapshotData);
    });
  });
});
