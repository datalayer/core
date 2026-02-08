/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RuntimeDTO, RuntimeData } from '../../models/RuntimeDTO';
import type { DatalayerClient } from '../../client/index';

describe('Runtime Model', () => {
  const mockRuntimeData: RuntimeData = {
    uid: 'runtime-123',
    pod_name: 'jupyter-pod-123',
    given_name: 'My Runtime',
    environment_name: 'python-cpu',
    type: 'notebook',
    burning_rate: 10,
    environment_title: '',
    token: '',
    ingress: '',
    started_at: '',
    expired_at: '',
  };

  let mockClient: Partial<DatalayerClient>;
  let runtime: RuntimeDTO;

  beforeEach(() => {
    mockClient = {
      getToken: vi.fn().mockReturnValue('mock-token'),
      getRuntimesRunUrl: vi
        .fn()
        .mockReturnValue('https://runtimes.example.com'),
      deleteRuntime: vi.fn().mockResolvedValue(undefined),
      createSnapshot: vi.fn(),
    } as any;
    runtime = new RuntimeDTO(mockRuntimeData, mockClient as DatalayerClient);
    vi.clearAllMocks();
  });

  describe('Properties', () => {
    it('should return uid', () => {
      expect(runtime.uid).toBe('runtime-123');
    });

    it('should return podName', () => {
      expect(runtime.podName).toBe('jupyter-pod-123');
    });

    it('should return givenName', () => {
      expect(runtime.givenName).toBe('My Runtime');
    });

    it('should return environmentName', () => {
      expect(runtime.environmentName).toBe('python-cpu');
    });

    it('should return type', () => {
      expect(runtime.type).toBe('notebook');
    });

    it('should return burningRate', () => {
      expect(runtime.burningRate).toBe(10);
    });
  });

  describe('Methods', () => {
    it('should delete runtime', async () => {
      await runtime.delete();

      expect(mockClient.deleteRuntime).toHaveBeenCalledWith('jupyter-pod-123');
    });

    it('should create snapshot', async () => {
      const mockSnapshot = { uid: 'snapshot-123', name: 'My Snapshot' };
      (mockClient.createSnapshot as any).mockResolvedValue(mockSnapshot);

      const snapshot = await runtime.createSnapshot('My Snapshot');

      expect(mockClient.createSnapshot).toHaveBeenCalledWith(
        'jupyter-pod-123',
        'My Snapshot',
        undefined,
        undefined,
      );
      expect(snapshot).toBe(mockSnapshot);
    });
  });

  describe('Utility methods', () => {
    it('should return string representation', () => {
      const str = runtime.toString();
      expect(str).toContain('jupyter-pod-123');
      expect(str).toContain('python-cpu');
    });
  });
});
