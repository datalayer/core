/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * @module sdk/client/models/__tests__/Snapshot.test
 * @description Tests for the Snapshot domain model.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Snapshot } from '../Snapshot';
import type { RuntimeSnapshot } from '../../../../api/types/runtimes';
import type { DatalayerSDK } from '../../index';
import { snapshots } from '../../../../api/runtimes';

// Mock the snapshots API
vi.mock('../../../../api/runtimes', () => ({
  snapshots: {
    getSnapshot: vi.fn(),
    deleteSnapshot: vi.fn(),
  },
}));

describe('Snapshot Model', () => {
  const mockSnapshotData: RuntimeSnapshot = {
    uid: 'snapshot-123',
    name: 'Test Snapshot',
    description: 'Test snapshot description',
    environment: 'python-cpu',
    metadata: {
      version: '1.0.0',
      language_info: {
        name: 'python',
        version: '3.9',
      },
      custom_field: 'custom_value',
    },
    size: 1024000,
    format: 'tar.gz',
    format_version: '2.0',
    status: 'ready',
    updated_at: '2023-01-01T12:00:00Z',
  };

  let mockSDK: Partial<DatalayerSDK>;
  let snapshot: Snapshot;

  beforeEach(() => {
    mockSDK = {
      getToken: vi.fn().mockReturnValue('mock-token'),
      getRuntimesRunUrl: vi
        .fn()
        .mockReturnValue('https://runtimes.example.com'),
      createRuntime: vi.fn(),
    } as any;
    snapshot = new Snapshot(mockSnapshotData, mockSDK as DatalayerSDK);
    vi.clearAllMocks();
  });

  describe('Static Properties', () => {
    it('should return correct uid', () => {
      expect(snapshot.uid).toBe('snapshot-123');
    });

    it('should return correct name', () => {
      expect(snapshot.name).toBe('Test Snapshot');
    });

    it('should return correct description', () => {
      expect(snapshot.description).toBe('Test snapshot description');
    });

    it('should return correct environment', () => {
      expect(snapshot.environment).toBe('python-cpu');
    });

    it('should return correct format', () => {
      expect(snapshot.format).toBe('tar.gz');
    });

    it('should return correct format version', () => {
      expect(snapshot.formatVersion).toBe('2.0');
    });

    it('should return correct metadata', () => {
      expect(snapshot.metadata).toEqual({
        version: '1.0.0',
        language_info: {
          name: 'python',
          version: '3.9',
        },
        custom_field: 'custom_value',
      });
    });

    it('should return correct updated date', () => {
      expect(snapshot.updatedAt).toEqual(new Date('2023-01-01T12:00:00Z'));
    });

    it('should handle missing optional fields gracefully', () => {
      const minimalData: RuntimeSnapshot = {
        uid: 'snapshot-456',
        name: 'Minimal Snapshot',
        environment: 'python-gpu',
        updated_at: '2023-01-01T10:00:00Z',
      };
      const minimalSnapshot = new Snapshot(
        minimalData,
        mockSDK as DatalayerSDK,
      );

      expect(minimalSnapshot.description).toBe('');
      expect(minimalSnapshot.format).toBe('');
      expect(minimalSnapshot.formatVersion).toBe('');
      expect(minimalSnapshot.metadata).toEqual({});
    });
  });

  describe('Dynamic Methods', () => {
    beforeEach(() => {
      (snapshots.getSnapshot as any).mockResolvedValue({
        snapshot: { ...mockSnapshotData, status: 'processing' },
      });
    });

    it('should fetch fresh status from API and update internal data', async () => {
      const status = await snapshot.getStatus();
      expect(status).toBe('processing');
      expect(snapshots.getSnapshot).toHaveBeenCalledWith(
        'mock-token',
        'snapshot-123',
        'https://runtimes.example.com',
      );
    });

    it('should fetch fresh size from API', async () => {
      const updatedSize = 2048000;
      (snapshots.getSnapshot as any).mockResolvedValue({
        snapshot: { ...mockSnapshotData, size: updatedSize },
      });

      const size = await snapshot.getSize();
      expect(size).toBe(updatedSize);
      expect(snapshots.getSnapshot).toHaveBeenCalledWith(
        'mock-token',
        'snapshot-123',
        'https://runtimes.example.com',
      );
    });

    it('should fetch fresh metadata from API', async () => {
      const updatedMetadata = { version: '2.0.0', new_field: 'new_value' };
      (snapshots.getSnapshot as any).mockResolvedValue({
        snapshot: { ...mockSnapshotData, metadata: updatedMetadata },
      });

      const metadata = await snapshot.getLatestMetadata();
      expect(metadata).toEqual(updatedMetadata);
    });

    it('should handle missing size gracefully', async () => {
      (snapshots.getSnapshot as any).mockResolvedValue({
        snapshot: { ...mockSnapshotData, size: undefined },
      });

      const size = await snapshot.getSize();
      expect(size).toBe(0);
    });

    it('should handle missing status gracefully', async () => {
      (snapshots.getSnapshot as any).mockResolvedValue({
        snapshot: { ...mockSnapshotData, status: undefined },
      });

      const status = await snapshot.getStatus();
      expect(status).toBe('unknown');
    });

    it('should update internal data when fetching dynamic properties', async () => {
      const updatedData = {
        ...mockSnapshotData,
        status: 'completed',
        size: 3072000,
      };
      (snapshots.getSnapshot as any).mockResolvedValue({
        snapshot: updatedData,
      });

      await snapshot.getStatus();
      const json = await snapshot.toJSON();
      expect(json.status).toBe('completed');
      expect(json.size).toBe(3072000);
    });
  });

  describe('Action Methods', () => {
    it('should delete snapshot and mark as deleted', async () => {
      (snapshots.deleteSnapshot as any).mockResolvedValue(undefined);

      await snapshot.delete();

      expect(snapshots.deleteSnapshot).toHaveBeenCalledWith(
        'mock-token',
        'snapshot-123',
        'https://runtimes.example.com',
      );

      // After deletion, accessing properties should throw error
      expect(() => snapshot.uid).toThrow(
        'Snapshot snapshot-123 has been deleted and no longer exists',
      );
    });

    it('should restore runtime from snapshot', async () => {
      const mockRuntime = {
        podName: 'runtime-from-snapshot',
        state: 'starting',
      };
      (mockSDK.createRuntime as any).mockResolvedValue(mockRuntime);

      const runtime = await snapshot.restore({
        credits_limit: 150,
        custom_config: 'value',
      });

      expect(mockSDK.createRuntime).toHaveBeenCalledWith({
        environment_name: 'python-cpu',
        from_snapshot: 'snapshot-123',
        credits_limit: 150,
        custom_config: 'value',
      });
      expect(runtime).toBe(mockRuntime);
    });

    it('should restore runtime with minimal config', async () => {
      const mockRuntime = { podName: 'runtime-minimal', state: 'starting' };
      (mockSDK.createRuntime as any).mockResolvedValue(mockRuntime);

      const runtime = await snapshot.restore();

      expect(mockSDK.createRuntime).toHaveBeenCalledWith({
        environment_name: 'python-cpu',
        from_snapshot: 'snapshot-123',
      });
      expect(runtime).toBe(mockRuntime);
    });
  });

  describe('Utility Methods', () => {
    it('should return JSON with fresh data', async () => {
      const freshData = { ...mockSnapshotData, status: 'completed' };
      (snapshots.getSnapshot as any).mockResolvedValue({ snapshot: freshData });

      const json = await snapshot.toJSON();
      expect(json.status).toBe('completed');
      expect(json.uid).toBe('snapshot-123');
    });

    it('should return string representation', () => {
      expect(snapshot.toString()).toBe('Snapshot(snapshot-123, Test Snapshot)');
    });
  });

  describe('Deletion State Management', () => {
    beforeEach(async () => {
      (snapshots.deleteSnapshot as any).mockResolvedValue(undefined);
      await snapshot.delete();
    });

    it('should throw error when accessing static properties after deletion', () => {
      expect(() => snapshot.uid).toThrow(
        'Snapshot snapshot-123 has been deleted and no longer exists',
      );
      expect(() => snapshot.name).toThrow(
        'Snapshot snapshot-123 has been deleted and no longer exists',
      );
      expect(() => snapshot.description).toThrow(
        'Snapshot snapshot-123 has been deleted and no longer exists',
      );
      expect(() => snapshot.environment).toThrow(
        'Snapshot snapshot-123 has been deleted and no longer exists',
      );
      expect(() => snapshot.format).toThrow(
        'Snapshot snapshot-123 has been deleted and no longer exists',
      );
      expect(() => snapshot.formatVersion).toThrow(
        'Snapshot snapshot-123 has been deleted and no longer exists',
      );
      expect(() => snapshot.metadata).toThrow(
        'Snapshot snapshot-123 has been deleted and no longer exists',
      );
      expect(() => snapshot.updatedAt).toThrow(
        'Snapshot snapshot-123 has been deleted and no longer exists',
      );
    });

    it('should throw error when calling dynamic methods after deletion', async () => {
      await expect(snapshot.getStatus()).rejects.toThrow(
        'Snapshot snapshot-123 has been deleted and no longer exists',
      );
      await expect(snapshot.getSize()).rejects.toThrow(
        'Snapshot snapshot-123 has been deleted and no longer exists',
      );
      await expect(snapshot.getLatestMetadata()).rejects.toThrow(
        'Snapshot snapshot-123 has been deleted and no longer exists',
      );
    });

    it('should throw error when calling action methods after deletion', async () => {
      await expect(snapshot.restore()).rejects.toThrow(
        'Snapshot snapshot-123 has been deleted and no longer exists',
      );
    });

    it('should throw error when calling utility methods after deletion', async () => {
      await expect(snapshot.toJSON()).rejects.toThrow(
        'Snapshot snapshot-123 has been deleted and no longer exists',
      );
      expect(() => snapshot.toString()).toThrow(
        'Snapshot snapshot-123 has been deleted and no longer exists',
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully in dynamic methods', async () => {
      (snapshots.getSnapshot as any).mockRejectedValue(new Error('API Error'));

      await expect(snapshot.getStatus()).rejects.toThrow('API Error');
    });

    it('should handle missing snapshot in API response', async () => {
      (snapshots.getSnapshot as any).mockResolvedValue({ snapshot: null });

      const status = await snapshot.getStatus();
      // Should return the current status from internal data when API returns null
      expect(status).toBe('ready');
    });
  });
});
