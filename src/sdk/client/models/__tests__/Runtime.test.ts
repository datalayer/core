/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * @module sdk/client/models/__tests__/Runtime.test
 * @description Tests for the Runtime domain model.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Runtime } from '../Runtime';
import type { Runtime as RuntimeData } from '../../../../api/types/runtimes';
import type { DatalayerSDK } from '../../index';

describe('Runtime Model', () => {
  const mockRuntimeData: RuntimeData = {
    pod_name: 'test-runtime-123',
    uid: 'runtime-uid-456',
    environment_name: 'python-cpu',
    state: 'running',
    burning_rate: 1.5,
    given_name: 'Test Runtime',
    jupyter_url: 'https://jupyter.example.com',
    jupyter_token: 'jupyter-token-789',
    type: 'notebook',
    created_at: '2023-01-01T00:00:00Z',
    started_at: '2023-01-01T00:01:00Z',
    expired_at: '2023-01-01T01:00:00Z',
  };

  let mockSDK: Partial<DatalayerSDK>;
  let runtime: Runtime;

  beforeEach(() => {
    mockSDK = {
      getRuntime: vi.fn(),
      deleteRuntime: vi.fn(),
      createSnapshot: vi.fn(),
    };
    runtime = new Runtime(mockRuntimeData, mockSDK as DatalayerSDK);
  });

  describe('Static Properties', () => {
    it('should return correct pod name', () => {
      expect(runtime.podName).toBe('test-runtime-123');
    });

    it('should return correct uid', () => {
      expect(runtime.uid).toBe('runtime-uid-456');
    });

    it('should return correct environment name', () => {
      expect(runtime.environmentName).toBe('python-cpu');
    });

    it('should return correct burning rate', () => {
      expect(runtime.burningRate).toBe(1.5);
    });

    it('should return correct given name', () => {
      expect(runtime.givenName).toBe('Test Runtime');
    });

    it('should return correct jupyter url', () => {
      expect(runtime.jupyterUrl).toBe('https://jupyter.example.com');
    });

    it('should return correct jupyter token', () => {
      expect(runtime.jupyterToken).toBe('jupyter-token-789');
    });

    it('should return correct type', () => {
      expect(runtime.type).toBe('notebook');
    });

    it('should return correct dates', () => {
      expect(runtime.createdAt).toEqual(new Date('2023-01-01T00:00:00Z'));
      expect(runtime.startedAt).toEqual(new Date('2023-01-01T00:01:00Z'));
      expect(runtime.expiredAt).toEqual(new Date('2023-01-01T01:00:00Z'));
    });
  });

  describe('Dynamic State', () => {
    it('should fetch fresh state from API', async () => {
      const freshRuntime = new Runtime(
        { ...mockRuntimeData, state: 'stopped' },
        mockSDK as DatalayerSDK,
      );

      (mockSDK.getRuntime as any).mockResolvedValue(freshRuntime);

      const state = await runtime.getState();
      expect(state).toBe('stopped');
      expect(mockSDK.getRuntime).toHaveBeenCalledWith('test-runtime-123');
    });

    it('should update internal data when getting state', async () => {
      const freshRuntime = new Runtime(
        { ...mockRuntimeData, state: 'error' },
        mockSDK as DatalayerSDK,
      );

      (mockSDK.getRuntime as any).mockResolvedValue(freshRuntime);

      await runtime.getState();
      const json = await runtime.toJSON();
      expect(json.state).toBe('error');
    });
  });

  describe('State Checking Methods', () => {
    beforeEach(() => {
      const freshRuntime = new Runtime(
        mockRuntimeData,
        mockSDK as DatalayerSDK,
      );
      (mockSDK.getRuntime as any).mockResolvedValue(freshRuntime);
    });

    it('should check if runtime is running', async () => {
      expect(await runtime.isRunning()).toBe(true);
    });

    it('should check if runtime is starting', async () => {
      const startingRuntime = new Runtime(
        { ...mockRuntimeData, state: 'starting' },
        mockSDK as DatalayerSDK,
      );
      (mockSDK.getRuntime as any).mockResolvedValue(startingRuntime);

      expect(await runtime.isStarting()).toBe(true);
      expect(await runtime.isRunning()).toBe(false);
    });

    it('should check if runtime has error', async () => {
      const errorRuntime = new Runtime(
        { ...mockRuntimeData, state: 'error' },
        mockSDK as DatalayerSDK,
      );
      (mockSDK.getRuntime as any).mockResolvedValue(errorRuntime);

      expect(await runtime.hasError()).toBe(true);
    });
  });

  describe('Action Methods', () => {
    it('should delete runtime', async () => {
      await runtime.delete();
      expect(mockSDK.deleteRuntime).toHaveBeenCalledWith('test-runtime-123');
    });

    it('should create snapshot', async () => {
      const mockSnapshot = { uid: 'snap-123', name: 'test-snap' };
      (mockSDK.createSnapshot as any).mockResolvedValue({
        snapshot: mockSnapshot,
      });

      await runtime.createSnapshot('test-snap', 'desc');

      expect(mockSDK.createSnapshot).toHaveBeenCalledWith({
        pod_name: 'test-runtime-123',
        name: 'test-snap',
        description: 'desc',
        stop: false,
      });
    });
  });

  describe('Utility Methods', () => {
    it('should return JSON with fresh data', async () => {
      const freshRuntime = new Runtime(
        { ...mockRuntimeData, state: 'stopped' },
        mockSDK as DatalayerSDK,
      );
      (mockSDK.getRuntime as any).mockResolvedValue(freshRuntime);

      const json = await runtime.toJSON();
      expect(json.state).toBe('stopped');
    });

    it('should return string representation', () => {
      expect(runtime.toString()).toBe('Runtime(test-runtime-123, python-cpu)');
    });
  });
});
