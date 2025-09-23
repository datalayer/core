/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * @module sdk/__tests__/DatalayerSDK.test
 * @description Tests for the new flat DatalayerSDK API.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DatalayerSDK } from '../client';

// Mock the API modules
vi.mock('../../api/iam', () => ({
  authentication: {
    login: vi.fn(),
    logout: vi.fn(),
  },
  profile: {
    me: vi.fn(),
  },
}));

vi.mock('../../api/runtimes', () => ({
  environments: {
    list: vi.fn(),
    get: vi.fn(),
  },
  runtimes: {
    create: vi.fn(),
    list: vi.fn(),
    get: vi.fn(),
    remove: vi.fn(),
  },
}));

vi.mock('../../api/spacer', () => ({
  spaces: {
    create: vi.fn(),
    list: vi.fn(),
    get: vi.fn(),
    remove: vi.fn(),
  },
  notebooks: {
    create: vi.fn(),
    list: vi.fn(),
    get: vi.fn(),
    getByUid: vi.fn(),
    update: vi.fn(),
    clone: vi.fn(),
    getContent: vi.fn(),
    updateContent: vi.fn(),
    remove: vi.fn(),
  },
  cells: {
    create: vi.fn(),
    get: vi.fn(),
    remove: vi.fn(),
  },
}));

describe('DatalayerSDK', () => {
  let sdk: DatalayerSDK;

  const config = {
    iamRunUrl: 'https://test.datalayer.run',
    runtimesRunUrl: 'https://test.datalayer.run',
    spacerRunUrl: 'https://test.datalayer.run',
    token: 'test-token-123',
  };

  beforeEach(() => {
    sdk = new DatalayerSDK(config);
    vi.clearAllMocks();
  });

  describe('Configuration', () => {
    it('should initialize with config', () => {
      expect(sdk.getConfig()).toEqual(config);
    });

    it('should use default service URLs when not specified', () => {
      const minimalConfig = { token: 'test-token' };
      const sdkWithDefaults = new DatalayerSDK(minimalConfig);
      const actualConfig = sdkWithDefaults.getConfig();

      expect(actualConfig.iamRunUrl).toBe('https://prod1.datalayer.run');
      expect(actualConfig.runtimesRunUrl).toBe('https://prod1.datalayer.run');
      expect(actualConfig.spacerRunUrl).toBe('https://prod1.datalayer.run');
      expect(actualConfig.token).toBe('test-token');
    });

    it('should update token', () => {
      const newToken = 'new-token-456';
      sdk.updateToken(newToken);
      expect(sdk.getConfig().token).toBe(newToken);
    });

    it('should update config', () => {
      const newToken = 'updated-token-789';
      sdk.updateConfig({ token: newToken });
      expect(sdk.getConfig().token).toBe(newToken);
    });

    it('should support different service URLs', () => {
      const differentServiceConfig = {
        iamRunUrl: 'https://iam.datalayer.run',
        runtimesRunUrl: 'https://runtimes.datalayer.run',
        spacerRunUrl: 'https://spacer.datalayer.run',
        token: 'test-token',
      };

      const sdkWithDifferentServices = new DatalayerSDK(differentServiceConfig);
      const actualConfig = sdkWithDifferentServices.getConfig();

      expect(actualConfig.iamRunUrl).toBe('https://iam.datalayer.run');
      expect(actualConfig.runtimesRunUrl).toBe(
        'https://runtimes.datalayer.run',
      );
      expect(actualConfig.spacerRunUrl).toBe('https://spacer.datalayer.run');
    });
  });

  describe('IAM Methods', () => {
    it('should have whoami method', async () => {
      const mockUser = { id: '123', email: 'test@example.com' };
      const { profile } = await import('../../api/iam');
      vi.mocked(profile.me).mockResolvedValue({
        success: true,
        message: 'Success',
        user: mockUser,
      });

      const user = await sdk.whoami();
      expect(user).toEqual(mockUser);
      expect(profile.me).toHaveBeenCalledWith(
        'https://test.datalayer.run',
        'test-token-123',
      );
    });

    it('should have login method', async () => {
      const mockResponse = {
        access_token: 'new-token',
        token_type: 'Bearer',
        expires_in: 3600,
        user: { id: '123', email: 'test@example.com' },
      };
      const { authentication } = await import('../../api/iam');
      vi.mocked(authentication.login).mockResolvedValue(mockResponse);

      const credentials = { email: 'test@example.com', password: 'password' };
      const response = await sdk.login(credentials);

      expect(response).toEqual(mockResponse);
      expect(authentication.login).toHaveBeenCalledWith(
        'https://test.datalayer.run',
        credentials,
      );
    });

    it('should have logout method', async () => {
      const { authentication } = await import('../../api/iam');
      vi.mocked(authentication.logout).mockResolvedValue();

      await sdk.logout();

      expect(authentication.logout).toHaveBeenCalledWith(
        'https://test.datalayer.run',
        'test-token-123',
      );
      expect(sdk.getConfig().token).toBe('');
    });

    it('should throw error for whoami without token', async () => {
      const sdkNoToken = new DatalayerSDK({
        iamRunUrl: 'https://test.datalayer.run',
      });

      await expect(sdkNoToken.whoami()).rejects.toThrow(
        'Authentication token required',
      );
    });
  });

  describe('Runtime Methods', () => {
    it('should have listEnvironments method', async () => {
      const mockEnvironments = [
        {
          name: 'python-cpu',
          title: 'Python CPU Environment',
          description: 'CPU environment for Python',
          image: 'python:3.9',
          gpu: false,
          cpu_limit: 2,
          memory_limit: '4Gi',
          disk_limit: '10Gi',
        },
        {
          name: 'python-gpu',
          title: 'Python GPU Environment',
          description: 'GPU environment for Python',
          image: 'python:3.9-gpu',
          gpu: true,
          cpu_limit: 4,
          memory_limit: '8Gi',
          disk_limit: '20Gi',
        },
      ];
      const { environments } = await import('../../api/runtimes');
      vi.mocked(environments.list).mockResolvedValue({
        success: true,
        message: 'Success',
        environments: mockEnvironments,
      });

      const envs = await sdk.listEnvironments();
      expect(envs).toEqual(mockEnvironments);
      expect(environments.list).toHaveBeenCalledWith(
        'https://test.datalayer.run',
        'test-token-123',
      );
    });

    it('should have createRuntime method', async () => {
      const mockRuntime = {
        pod_name: 'runtime-123',
        state: 'running' as const,
        environment_name: 'python-cpu',
      };
      const { runtimes } = await import('../../api/runtimes');
      vi.mocked(runtimes.create).mockResolvedValue({
        success: true,
        message: 'Success',
        runtime: mockRuntime,
      });

      const config = { environment_name: 'python-cpu', credits_limit: 100 };
      const runtime = await sdk.createRuntime(config);

      expect(runtime).toEqual(mockRuntime);
      expect(runtimes.create).toHaveBeenCalledWith(
        'https://test.datalayer.run',
        'test-token-123',
        config,
      );
    });

    it('should have listRuntimes method', async () => {
      const mockRuntimes = [
        {
          pod_name: 'runtime-123',
          state: 'running' as const,
          environment_name: 'python-cpu',
        },
        {
          pod_name: 'runtime-456',
          state: 'stopped' as const,
          environment_name: 'python-gpu',
        },
      ];
      const { runtimes } = await import('../../api/runtimes');
      vi.mocked(runtimes.list).mockResolvedValue({
        success: true,
        message: 'Success',
        runtimes: mockRuntimes,
      });

      const runtimeList = await sdk.listRuntimes();
      expect(runtimeList).toEqual(mockRuntimes);
      expect(runtimes.list).toHaveBeenCalledWith(
        'https://test.datalayer.run',
        'test-token-123',
      );
    });

    it('should have getRuntime method', async () => {
      const mockRuntime = {
        pod_name: 'runtime-123',
        state: 'running' as const,
        environment_name: 'python-cpu',
      };
      const { runtimes } = await import('../../api/runtimes');
      vi.mocked(runtimes.get).mockResolvedValue(mockRuntime);

      const runtime = await sdk.getRuntime('runtime-123');
      expect(runtime).toEqual(mockRuntime);
      expect(runtimes.get).toHaveBeenCalledWith(
        'https://test.datalayer.run',
        'test-token-123',
        'runtime-123',
      );
    });

    it('should have deleteRuntime method', async () => {
      const { runtimes } = await import('../../api/runtimes');
      vi.mocked(runtimes.remove).mockResolvedValue();

      await sdk.deleteRuntime('runtime-123');
      expect(runtimes.remove).toHaveBeenCalledWith(
        'https://test.datalayer.run',
        'test-token-123',
        'runtime-123',
      );
    });
  });

  describe('Spacer Methods', () => {
    it('should have createSpace method', async () => {
      const mockSpace = {
        id: 'space-123',
        name: 'Test Space',
        visibility: 'private' as const,
        owner_id: 'user-123',
        created_at: '2024-01-01T00:00:00Z',
      };
      const { spaces } = await import('../../api/spacer');
      vi.mocked(spaces.create).mockResolvedValue(mockSpace);

      const config = { name: 'Test Space', description: 'A test workspace' };
      const space = await sdk.createSpace(config);

      expect(space).toEqual(mockSpace);
      expect(spaces.create).toHaveBeenCalledWith(
        'https://test.datalayer.run',
        'test-token-123',
        config,
      );
    });

    it('should have listSpaces method', async () => {
      const mockSpaces = [
        {
          id: 'space-123',
          name: 'Space 1',
          visibility: 'private' as const,
          owner_id: 'user-123',
          created_at: '2024-01-01T00:00:00Z',
        },
        {
          id: 'space-456',
          name: 'Space 2',
          visibility: 'public' as const,
          owner_id: 'user-456',
          created_at: '2024-01-02T00:00:00Z',
        },
      ];
      const { spaces } = await import('../../api/spacer');
      vi.mocked(spaces.list).mockResolvedValue({
        success: true,
        message: 'Success',
        spaces: mockSpaces,
      });

      const spaceList = await sdk.listSpaces();
      expect(spaceList).toEqual(mockSpaces);
      expect(spaces.list).toHaveBeenCalledWith(
        'https://test.datalayer.run',
        'test-token-123',
      );
    });

    it('should have getSpace method', async () => {
      const mockSpace = {
        id: 'space-123',
        name: 'Test Space',
        visibility: 'private' as const,
        owner_id: 'user-123',
        created_at: '2024-01-01T00:00:00Z',
      };
      const { spaces } = await import('../../api/spacer');
      vi.mocked(spaces.get).mockResolvedValue(mockSpace);

      const space = await sdk.getSpace('space-123');
      expect(space).toEqual(mockSpace);
      expect(spaces.get).toHaveBeenCalledWith(
        'https://test.datalayer.run',
        'test-token-123',
        'space-123',
      );
    });

    it('should have deleteSpace method', async () => {
      const { spaces } = await import('../../api/spacer');
      vi.mocked(spaces.remove).mockResolvedValue();

      await sdk.deleteSpace('space-123');
      expect(spaces.remove).toHaveBeenCalledWith(
        'https://test.datalayer.run',
        'test-token-123',
        'space-123',
      );
    });

    it('should have createNotebook method', async () => {
      const mockNotebook = {
        id: 'notebook-123',
        uid: 'notebook-uid-123',
        name: 'Test Notebook',
        path: '/Test Notebook.ipynb',
        space_id: 'space-123',
        owner_id: 'user-123',
        created_at: '2024-01-01T00:00:00Z',
      };
      const { notebooks } = await import('../../api/spacer');
      vi.mocked(notebooks.create).mockResolvedValue(mockNotebook);

      const config = { space_id: 'space-123', name: 'Test Notebook' };
      const notebook = await sdk.createNotebook(config);

      expect(notebook).toEqual(mockNotebook);
      expect(notebooks.create).toHaveBeenCalledWith(
        'https://test.datalayer.run',
        'test-token-123',
        config,
      );
    });

    it('should have listNotebooks method', async () => {
      const mockNotebooks = [
        {
          id: 'notebook-123',
          uid: 'notebook-uid-123',
          name: 'Notebook 1',
          path: '/Notebook 1.ipynb',
          space_id: 'space-123',
          owner_id: 'user-123',
          created_at: '2024-01-01T00:00:00Z',
        },
        {
          id: 'notebook-456',
          uid: 'notebook-uid-456',
          name: 'Notebook 2',
          path: '/Notebook 2.ipynb',
          space_id: 'space-123',
          owner_id: 'user-123',
          created_at: '2024-01-02T00:00:00Z',
        },
      ];
      const { notebooks } = await import('../../api/spacer');
      vi.mocked(notebooks.list).mockResolvedValue({
        success: true,
        message: 'Success',
        notebooks: mockNotebooks,
      });

      const notebookList = await sdk.listNotebooks();
      expect(notebookList).toEqual(mockNotebooks);
      expect(notebooks.list).toHaveBeenCalledWith(
        'https://test.datalayer.run',
        'test-token-123',
        undefined,
      );
    });

    it('should have listNotebooks method with space filter', async () => {
      const mockNotebooks = [
        {
          id: 'notebook-123',
          uid: 'notebook-uid-123',
          name: 'Notebook 1',
          path: '/Notebook 1.ipynb',
          space_id: 'space-123',
          owner_id: 'user-123',
          created_at: '2024-01-01T00:00:00Z',
        },
      ];
      const { notebooks } = await import('../../api/spacer');
      vi.mocked(notebooks.list).mockResolvedValue({
        success: true,
        message: 'Success',
        notebooks: mockNotebooks,
      });

      const notebookList = await sdk.listNotebooks('space-123');
      expect(notebookList).toEqual(mockNotebooks);
      expect(notebooks.list).toHaveBeenCalledWith(
        'https://test.datalayer.run',
        'test-token-123',
        { space_id: 'space-123' },
      );
    });

    it('should have getNotebook method', async () => {
      const mockNotebook = {
        id: 'notebook-123',
        uid: 'notebook-uid-123',
        name: 'Test Notebook',
        path: '/Test Notebook.ipynb',
        space_id: 'space-123',
        owner_id: 'user-123',
        created_at: '2024-01-01T00:00:00Z',
      };
      const { notebooks } = await import('../../api/spacer');
      vi.mocked(notebooks.get).mockResolvedValue(mockNotebook);

      const notebook = await sdk.getNotebook('notebook-123');
      expect(notebook).toEqual(mockNotebook);
      expect(notebooks.get).toHaveBeenCalledWith(
        'https://test.datalayer.run',
        'test-token-123',
        'notebook-123',
      );
    });

    it('should have getNotebookByUid method', async () => {
      const mockNotebook = {
        id: 'notebook-123',
        uid: 'notebook-uid-123',
        name: 'Test Notebook',
        path: '/Test Notebook.ipynb',
        space_id: 'space-123',
        owner_id: 'user-123',
        created_at: '2024-01-01T00:00:00Z',
      };
      const { notebooks } = await import('../../api/spacer');
      vi.mocked(notebooks.getByUid).mockResolvedValue(mockNotebook);

      const notebook = await sdk.getNotebookByUid('notebook-uid-123');
      expect(notebook).toEqual(mockNotebook);
      expect(notebooks.getByUid).toHaveBeenCalledWith(
        'https://test.datalayer.run',
        'test-token-123',
        'notebook-uid-123',
      );
    });

    it('should have createCell method', async () => {
      const mockCell = {
        id: 'cell-123',
        cell_type: 'code' as const,
        source: 'print("Hello")',
      };
      const { cells } = await import('../../api/spacer');
      vi.mocked(cells.create).mockResolvedValue(mockCell);

      const cellData = { cell_type: 'code', source: 'print("Hello")' };
      const cell = await sdk.createCell('notebook-123', cellData as any);

      expect(cell).toEqual(mockCell);
      expect(cells.create).toHaveBeenCalledWith(
        'https://test.datalayer.run',
        'test-token-123',
        'notebook-123',
        cellData,
      );
    });

    it('should have getCell method', async () => {
      const mockCell = {
        id: 'cell-123',
        cell_type: 'code' as const,
        source: 'print("Hello")',
      };
      const { cells } = await import('../../api/spacer');
      vi.mocked(cells.get).mockResolvedValue(mockCell);

      const cell = await sdk.getCell('notebook-123', 'cell-123');
      expect(cell).toEqual(mockCell);
      expect(cells.get).toHaveBeenCalledWith(
        'https://test.datalayer.run',
        'test-token-123',
        'notebook-123',
        'cell-123',
      );
    });

    it('should have deleteCell method', async () => {
      const { cells } = await import('../../api/spacer');
      vi.mocked(cells.remove).mockResolvedValue();

      await sdk.deleteCell('notebook-123', 'cell-123');
      expect(cells.remove).toHaveBeenCalledWith(
        'https://test.datalayer.run',
        'test-token-123',
        'notebook-123',
        'cell-123',
      );
    });
  });

  describe('Method Availability', () => {
    it('should have all expected IAM methods', () => {
      expect(typeof sdk.whoami).toBe('function');
      expect(typeof sdk.login).toBe('function');
      expect(typeof sdk.logout).toBe('function');
    });

    it('should have all expected Runtime methods', () => {
      expect(typeof sdk.listEnvironments).toBe('function');
      expect(typeof sdk.createRuntime).toBe('function');
      expect(typeof sdk.listRuntimes).toBe('function');
      expect(typeof sdk.getRuntime).toBe('function');
      expect(typeof sdk.deleteRuntime).toBe('function');
    });

    it('should have all expected Spacer methods', () => {
      expect(typeof sdk.createSpace).toBe('function');
      expect(typeof sdk.listSpaces).toBe('function');
      expect(typeof sdk.getSpace).toBe('function');
      expect(typeof sdk.deleteSpace).toBe('function');
      expect(typeof sdk.createNotebook).toBe('function');
      expect(typeof sdk.listNotebooks).toBe('function');
      expect(typeof sdk.getNotebook).toBe('function');
      expect(typeof sdk.getNotebookByUid).toBe('function');
      expect(typeof sdk.updateNotebook).toBe('function');
      expect(typeof sdk.cloneNotebook).toBe('function');
      expect(typeof sdk.getNotebookContent).toBe('function');
      expect(typeof sdk.updateNotebookContent).toBe('function');
      expect(typeof sdk.deleteNotebook).toBe('function');
      expect(typeof sdk.createCell).toBe('function');
      expect(typeof sdk.getCell).toBe('function');
      expect(typeof sdk.deleteCell).toBe('function');
    });

    it('should NOT have old nested service properties', () => {
      expect((sdk as any).iam).toBeUndefined();
      expect((sdk as any).runtimes).toBeUndefined();
      expect((sdk as any).spacer).toBeUndefined();
    });
  });
});
