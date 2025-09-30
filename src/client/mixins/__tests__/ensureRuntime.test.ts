/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DatalayerClient } from '../../index';
import { Runtime } from '../../models/Runtime';
import type {
  Runtime as RuntimeData,
  Environment,
} from '../../../../api/types/runtimes';

// Mock the API functions
vi.mock('../../../../api/runtimes', () => ({
  environments: {
    listEnvironments: vi.fn(),
  },
  runtimes: {
    listRuntimes: vi.fn(),
    createRuntime: vi.fn(),
    getRuntime: vi.fn(),
  },
  snapshots: {
    getSnapshot: vi.fn(),
  },
}));

describe('ensureRuntime', () => {
  let sdk: DatalayerClient;
  const mockToken = 'test-token-123';

  const mockEnvironments: Environment[] = [
    {
      name: 'python-default-env',
      title: 'Python Default Environment',
      description: 'Default Python environment',
      dockerImage: 'python:3.9',
      language: 'python',
      burning_rate: 1,
      resources: { cpu: 1, memory: '2Gi' },
    },
    {
      name: 'python-gpu-env',
      title: 'Python GPU Environment',
      description: 'Python with GPU support',
      dockerImage: 'python:3.9-cuda',
      language: 'python',
      burning_rate: 4,
      resources: { cpu: 4, memory: '16Gi', gpu: 1 },
    },
  ];

  const mockRuntimeData: RuntimeData = {
    pod_name: 'runtime-abc123',
    uid: 'runtime-uid-123',
    environment_name: 'python-default-env',
    state: 'running',
    burning_rate: 1,
    created_at: '2024-01-01T12:00:00Z',
    credits: 50,
  };

  const mockSnapshotData = {
    uid: 'snapshot-xyz789',
    name: 'test-snapshot',
    environment: 'python-default-env',
    status: 'Ready',
    size: 1024,
    updated_at: '2024-01-01T11:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default localStorage mock
    const localStorageData: Record<string, string> = {
      'datalayer:token': mockToken,
    };

    global.localStorage = {
      getItem: vi.fn((key: string) => localStorageData[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        localStorageData[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete localStorageData[key];
      }),
      clear: vi.fn(() => {
        Object.keys(localStorageData).forEach(
          key => delete localStorageData[key],
        );
      }),
      length: Object.keys(localStorageData).length,
      key: vi.fn(
        (index: number) => Object.keys(localStorageData)[index] || null,
      ),
    } as Storage;

    sdk = new DatalayerClient({
      iamRunUrl: 'https://example.com/api/iam/v1',
      runtimesRunUrl: 'https://example.com/api/runtimes/v1',
      spacerRunUrl: 'https://example.com/api/spacer/v1',
      token: mockToken,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('with reuseExisting option', () => {
    it('should reuse existing suitable runtime when available', async () => {
      const { runtimes } = await import('../../../../api/runtimes');

      // Mock existing runtime
      vi.mocked(runtimes.listRuntimes).mockResolvedValueOnce({
        success: true,
        message: 'Success',
        runtimes: [mockRuntimeData],
      });

      const runtime = await sdk.ensureRuntime({
        reuseExisting: true,
        environmentName: 'python-default-env',
      });

      expect(runtime).toBeInstanceOf(Runtime);
      expect(runtime.podName).toBe('runtime-abc123');
      expect(runtimes.createRuntime).not.toHaveBeenCalled();
    });

    it('should not reuse runtime with wrong environment', async () => {
      const { runtimes, environments } = await import(
        '../../../../api/runtimes'
      );

      vi.mocked(runtimes.listRuntimes).mockResolvedValueOnce({
        success: true,
        message: 'Success',
        runtimes: [mockRuntimeData],
      });

      vi.mocked(environments.listEnvironments).mockResolvedValueOnce({
        success: true,
        message: 'Success',
        environments: mockEnvironments,
      });

      vi.mocked(runtimes.createRuntime).mockResolvedValueOnce({
        success: true,
        message: 'Success',
        runtime: {
          ...mockRuntimeData,
          pod_name: 'runtime-new456',
          environment_name: 'python-gpu-env',
        },
      });

      const runtime = await sdk.ensureRuntime({
        reuseExisting: true,
        environmentName: 'python-gpu-env',
        waitForReady: false, // Skip waiting for test
      });

      expect(runtime.podName).toBe('runtime-new456');
      expect(runtimes.createRuntime).toHaveBeenCalledWith(
        mockToken,
        { environment_name: 'python-gpu-env', credits_limit: undefined },
        'https://example.com/api/runtimes/v1',
      );
    });

    it('should not reuse runtime with insufficient credits', async () => {
      const { runtimes, environments } = await import(
        '../../../../api/runtimes'
      );

      const lowCreditsRuntime = {
        ...mockRuntimeData,
        credits: 195,
      };

      vi.mocked(runtimes.listRuntimes).mockResolvedValueOnce({
        success: true,
        message: 'Success',
        runtimes: [lowCreditsRuntime],
      });

      vi.mocked(environments.listEnvironments).mockResolvedValueOnce({
        success: true,
        message: 'Success',
        environments: mockEnvironments,
      });

      vi.mocked(runtimes.createRuntime).mockResolvedValueOnce({
        success: true,
        message: 'Success',
        runtime: {
          ...mockRuntimeData,
          pod_name: 'runtime-new789',
          credits: 100,
        },
      });

      const runtime = await sdk.ensureRuntime({
        reuseExisting: true,
        creditsLimit: 100,
        waitForReady: false,
      });

      expect(runtime.podName).toBe('runtime-new789');
      expect(runtimes.createRuntime).toHaveBeenCalled();
    });

    it('should not reuse runtime that is not ready', async () => {
      const { runtimes, environments } = await import(
        '../../../../api/runtimes'
      );

      const pendingRuntime = {
        ...mockRuntimeData,
        state: 'starting' as const,
      };

      vi.mocked(runtimes.listRuntimes).mockResolvedValueOnce({
        success: true,
        message: 'Success',
        runtimes: [pendingRuntime],
      });

      vi.mocked(environments.listEnvironments).mockResolvedValueOnce({
        success: true,
        message: 'Success',
        environments: mockEnvironments,
      });

      vi.mocked(runtimes.createRuntime).mockResolvedValueOnce({
        success: true,
        message: 'Success',
        runtime: {
          ...mockRuntimeData,
          pod_name: 'runtime-new999',
        },
      });

      const runtime = await sdk.ensureRuntime({
        reuseExisting: true,
        waitForReady: false,
      });

      expect(runtime.podName).toBe('runtime-new999');
      expect(runtimes.createRuntime).toHaveBeenCalled();
    });
  });

  describe('with snapshot option', () => {
    it('should create runtime from snapshot', async () => {
      const { runtimes, snapshots } = await import('../../../../api/runtimes');

      vi.mocked(runtimes.listRuntimes).mockResolvedValueOnce({
        success: true,
        message: 'Success',
        runtimes: [],
      });

      vi.mocked(snapshots.getSnapshot).mockResolvedValueOnce({
        success: true,
        message: 'Success',
        snapshot: mockSnapshotData,
      });

      vi.mocked(runtimes.createRuntime).mockResolvedValueOnce({
        success: true,
        message: 'Success',
        runtime: {
          ...mockRuntimeData,
          pod_name: 'runtime-from-snapshot',
        },
      });

      const runtime = await sdk.ensureRuntime({
        snapshotId: 'snapshot-xyz789',
        waitForReady: false,
      });

      expect(runtime.podName).toBe('runtime-from-snapshot');
      expect(runtimes.createRuntime).toHaveBeenCalledWith(
        mockToken,
        {
          environment_name: 'python-default-env',
          credits_limit: undefined,
        },
        'https://example.com/api/runtimes/v1',
      );
    });

    it('should throw error if snapshot not found', async () => {
      const { runtimes, snapshots } = await import('../../../../api/runtimes');

      vi.mocked(runtimes.listRuntimes).mockResolvedValueOnce({
        success: true,
        message: 'Success',
        runtimes: [],
      });

      vi.mocked(snapshots.getSnapshot).mockRejectedValueOnce(
        new Error('Snapshot not found'),
      );

      await expect(
        sdk.ensureRuntime({
          snapshotId: 'non-existent',
          waitForReady: false,
        }),
      ).rejects.toThrow("Snapshot 'non-existent' not found");
    });

    it('should override environment when creating from snapshot', async () => {
      const { runtimes, snapshots } = await import('../../../../api/runtimes');

      vi.mocked(runtimes.listRuntimes).mockResolvedValueOnce({
        success: true,
        message: 'Success',
        runtimes: [],
      });

      vi.mocked(snapshots.getSnapshot).mockResolvedValueOnce({
        success: true,
        message: 'Success',
        snapshot: mockSnapshotData,
      });

      vi.mocked(runtimes.createRuntime).mockResolvedValueOnce({
        success: true,
        message: 'Success',
        runtime: {
          ...mockRuntimeData,
          pod_name: 'runtime-custom-env',
          environment_name: 'python-gpu-env',
        },
      });

      const runtime = await sdk.ensureRuntime({
        snapshotId: 'snapshot-xyz789',
        environmentName: 'python-gpu-env',
        waitForReady: false,
      });

      expect(runtime.podName).toBe('runtime-custom-env');
      expect(runtimes.createRuntime).toHaveBeenCalledWith(
        mockToken,
        {
          environment_name: 'python-gpu-env',
          credits_limit: undefined,
        },
        'https://example.com/api/runtimes/v1',
      );
    });
  });

  describe('creating new runtime', () => {
    it('should create new runtime with specified environment', async () => {
      const { runtimes } = await import('../../../../api/runtimes');

      vi.mocked(runtimes.listRuntimes).mockResolvedValueOnce({
        success: true,
        message: 'Success',
        runtimes: [],
      });

      vi.mocked(runtimes.createRuntime).mockResolvedValueOnce({
        success: true,
        message: 'Success',
        runtime: mockRuntimeData,
      });

      const runtime = await sdk.ensureRuntime({
        environmentName: 'python-default-env',
        creditsLimit: 200,
        reuseExisting: false,
        waitForReady: false,
      });

      expect(runtime.podName).toBe('runtime-abc123');
      expect(runtimes.createRuntime).toHaveBeenCalledWith(
        mockToken,
        {
          environment_name: 'python-default-env',
          credits_limit: 200,
        },
        'https://example.com/api/runtimes/v1',
      );
    });

    it('should select default environment when none specified', async () => {
      const { runtimes, environments } = await import(
        '../../../../api/runtimes'
      );

      vi.mocked(runtimes.listRuntimes).mockResolvedValueOnce({
        success: true,
        message: 'Success',
        runtimes: [],
      });

      vi.mocked(environments.listEnvironments).mockResolvedValueOnce({
        success: true,
        message: 'Success',
        environments: mockEnvironments,
      });

      vi.mocked(runtimes.createRuntime).mockResolvedValueOnce({
        success: true,
        message: 'Success',
        runtime: mockRuntimeData,
      });

      const runtime = await sdk.ensureRuntime({
        reuseExisting: false,
        waitForReady: false,
      });

      expect(runtime.podName).toBe('runtime-abc123');
      expect(runtimes.createRuntime).toHaveBeenCalledWith(
        mockToken,
        {
          environment_name: 'python-default-env',
          credits_limit: undefined,
        },
        'https://example.com/api/runtimes/v1',
      );
    });

    it.skip('should throw error when no environments available', async () => {
      const { runtimes, environments } = await import(
        '../../../../api/runtimes'
      );

      // Clear all mocks to ensure no interference
      vi.clearAllMocks();

      vi.mocked(runtimes.listRuntimes).mockResolvedValueOnce({
        success: true,
        message: 'Success',
        runtimes: [],
      });

      vi.mocked(environments.listEnvironments).mockResolvedValueOnce({
        success: true,
        message: 'Success',
        environments: [],
      });

      await expect(
        sdk.ensureRuntime({
          reuseExisting: false,
          waitForReady: false,
        }),
      ).rejects.toThrow('No environments available');
    });
  });

  describe('waitForReady option', () => {
    it.skip('should wait for runtime to be ready by default', async () => {
      const { runtimes, environments } = await import(
        '../../../../api/runtimes'
      );

      vi.mocked(runtimes.listRuntimes).mockResolvedValueOnce({
        success: true,
        message: 'Success',
        runtimes: [],
      });

      vi.mocked(environments.listEnvironments).mockResolvedValueOnce({
        success: true,
        message: 'Success',
        environments: mockEnvironments,
      });

      vi.mocked(runtimes.createRuntime).mockResolvedValueOnce({
        success: true,
        message: 'Success',
        runtime: mockRuntimeData,
      });

      // Mock the Runtime constructor to return our spy instance
      vi.spyOn(Runtime.prototype, 'waitUntilReady').mockResolvedValue(
        new Runtime(mockRuntimeData, sdk),
      );

      await sdk.ensureRuntime({
        reuseExisting: false,
      });

      expect(Runtime.prototype.waitUntilReady).toHaveBeenCalledWith(60000);
    });

    it('should skip waiting when waitForReady is false', async () => {
      const { runtimes, environments } = await import(
        '../../../../api/runtimes'
      );

      vi.mocked(runtimes.listRuntimes).mockResolvedValueOnce({
        success: true,
        message: 'Success',
        runtimes: [],
      });

      vi.mocked(environments.listEnvironments).mockResolvedValueOnce({
        success: true,
        message: 'Success',
        environments: mockEnvironments,
      });

      vi.mocked(runtimes.createRuntime).mockResolvedValueOnce({
        success: true,
        message: 'Success',
        runtime: mockRuntimeData,
      });

      vi.spyOn(Runtime.prototype, 'waitUntilReady').mockResolvedValue(
        new Runtime(mockRuntimeData, sdk),
      );

      await sdk.ensureRuntime({
        reuseExisting: false,
        waitForReady: false,
      });

      expect(Runtime.prototype.waitUntilReady).not.toHaveBeenCalled();
    });

    it('should use custom maxWaitTime', async () => {
      const { runtimes, environments } = await import(
        '../../../../api/runtimes'
      );

      vi.mocked(runtimes.listRuntimes).mockResolvedValueOnce({
        success: true,
        message: 'Success',
        runtimes: [],
      });

      vi.mocked(environments.listEnvironments).mockResolvedValueOnce({
        success: true,
        message: 'Success',
        environments: mockEnvironments,
      });

      vi.mocked(runtimes.createRuntime).mockResolvedValueOnce({
        success: true,
        message: 'Success',
        runtime: mockRuntimeData,
      });

      vi.spyOn(Runtime.prototype, 'waitUntilReady').mockResolvedValue(
        new Runtime(mockRuntimeData, sdk),
      );

      await sdk.ensureRuntime({
        reuseExisting: false,
        waitForReady: true,
        maxWaitTime: 120000,
      });

      expect(Runtime.prototype.waitUntilReady).toHaveBeenCalledWith(120000);
    });
  });
});
