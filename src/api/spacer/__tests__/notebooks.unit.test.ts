/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { notebooks } from '..';
import * as DatalayerApi from '../../DatalayerApi';
import { API_BASE_PATHS, DEFAULT_SERVICE_URLS } from '../../constants';
import { MOCK_JWT_TOKEN } from '../../../__tests__/shared/test-constants';

// Mock the DatalayerApi module
vi.mock('../../DatalayerApi', () => ({
  requestDatalayerAPI: vi.fn(),
}));

describe('Spacer Notebooks Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('create', () => {
    const mockCreateResponse = {
      success: true,
      message: 'Notebook created successfully',
      notebook: {
        id: 'notebook-123',
        uid: 'uid-notebook-123',
        name: 'Test Notebook',
        path: '/notebooks/test-notebook',
        space_id: 'space-456',
        owner_id: 'user-789',
        created_at: '2024-01-01T00:00:00Z',
      },
    };

    it('should successfully create a notebook with FormData', async () => {
      console.log('Testing notebook creation with FormData...');

      const mockedRequest = vi.mocked(DatalayerApi.requestDatalayerAPI);
      mockedRequest.mockResolvedValue(mockCreateResponse);

      const notebookData = {
        spaceId: 'space-456',
        notebookType: 'jupyter',
        name: 'Test Notebook',
        description: 'A test notebook',
      };

      const result = await notebooks.createNotebook(
        MOCK_JWT_TOKEN,
        notebookData,
        DEFAULT_SERVICE_URLS.SPACER,
      );

      expect(mockedRequest).toHaveBeenCalledTimes(1);

      // Check that FormData was passed as the body
      const callArgs = mockedRequest.mock.calls[0][0];
      expect(callArgs.url).toBe(
        `${DEFAULT_SERVICE_URLS.SPACER}${API_BASE_PATHS.SPACER}/notebooks`,
      );
      expect(callArgs.method).toBe('POST');
      expect(callArgs.token).toBe(MOCK_JWT_TOKEN);
      expect(callArgs.body).toBeInstanceOf(FormData);

      expect(result).toEqual(mockCreateResponse);
      expect(result.success).toBe(true);
      expect(result.notebook.name).toBe('Test Notebook');

      console.log('Notebook created successfully');
    });

    it('should handle FormData with file attachment', async () => {
      console.log('Testing notebook creation with file...');

      const mockedRequest = vi.mocked(DatalayerApi.requestDatalayerAPI);
      mockedRequest.mockResolvedValue(mockCreateResponse);

      const file = new File(['notebook content'], 'test.ipynb', {
        type: 'application/json',
      });
      const notebookData = {
        spaceId: 'space-456',
        notebookType: 'jupyter',
        name: 'Test Notebook',
        description: 'A test notebook',
        file,
      };

      await notebooks.createNotebook(
        MOCK_JWT_TOKEN,
        notebookData,
        DEFAULT_SERVICE_URLS.SPACER,
      );

      const callArgs = mockedRequest.mock.calls[0][0];
      expect(callArgs.url).toBe(
        `${DEFAULT_SERVICE_URLS.SPACER}${API_BASE_PATHS.SPACER}/notebooks`,
      );
      expect(callArgs.method).toBe('POST');
      expect(callArgs.token).toBe(MOCK_JWT_TOKEN);
      expect(callArgs.body).toBeInstanceOf(FormData);

      console.log('Notebook with file created successfully');
    });

    it('should handle API errors during creation', async () => {
      console.log('Testing notebook creation with API error...');

      const mockedRequest = vi.mocked(DatalayerApi.requestDatalayerAPI);
      mockedRequest.mockRejectedValue(new Error('API Error'));

      const formData = new FormData();
      formData.append('spaceId', 'space-456');
      formData.append('notebookType', 'jupyter');
      formData.append('name', 'Test Notebook');
      formData.append('description', 'A test notebook');

      await expect(
        notebooks.createNotebook(
          MOCK_JWT_TOKEN,
          formData as any,
          DEFAULT_SERVICE_URLS.SPACER,
        ),
      ).rejects.toThrow('API Error');

      console.log('API error handled correctly');
    });
  });

  describe('get', () => {
    const mockGetResponse = {
      success: true,
      message: 'Notebook retrieved successfully',
      notebook: {
        id: 'notebook-123',
        uid: 'uid-notebook-123',
        name: 'Test Notebook',
        path: '/notebooks/test-notebook',
        space_id: 'space-456',
        owner_id: 'user-789',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
      },
    };

    it('should successfully get a notebook by ID', async () => {
      console.log('Testing get notebook by ID...');

      const mockedRequest = vi.mocked(DatalayerApi.requestDatalayerAPI);
      mockedRequest.mockResolvedValue(mockGetResponse);

      const result = await notebooks.getNotebook(
        MOCK_JWT_TOKEN,
        'notebook-123',
        DEFAULT_SERVICE_URLS.SPACER,
      );

      expect(mockedRequest).toHaveBeenCalledTimes(1);
      expect(mockedRequest).toHaveBeenCalledWith({
        url: `${DEFAULT_SERVICE_URLS.SPACER}${API_BASE_PATHS.SPACER}/notebooks/notebook-123`,
        method: 'GET',
        token: MOCK_JWT_TOKEN,
      });

      expect(result).toEqual(mockGetResponse);
      expect(result.success).toBe(true);
      expect(result.notebook?.id).toBe('notebook-123');

      console.log('Notebook retrieved successfully');
    });

    it('should handle notebook not found (404)', async () => {
      console.log('Testing get notebook with 404...');

      const notFoundResponse = {
        success: false,
        message: 'Notebook not found',
      };

      const mockedRequest = vi.mocked(DatalayerApi.requestDatalayerAPI);
      mockedRequest.mockResolvedValue(notFoundResponse);

      const result = await notebooks.getNotebook(
        MOCK_JWT_TOKEN,
        'nonexistent-notebook',
        DEFAULT_SERVICE_URLS.SPACER,
      );

      expect(result).toEqual(notFoundResponse);
      expect(result.success).toBe(false);
      expect(result.notebook).toBeUndefined();

      console.log('404 response handled correctly');
    });

    it('should handle API errors during get', async () => {
      console.log('Testing get notebook with API error...');

      const mockedRequest = vi.mocked(DatalayerApi.requestDatalayerAPI);
      mockedRequest.mockRejectedValue(new Error('Network error'));

      await expect(
        notebooks.getNotebook(
          MOCK_JWT_TOKEN,
          'notebook-123',
          DEFAULT_SERVICE_URLS.SPACER,
        ),
      ).rejects.toThrow('Network error');

      console.log('API error handled correctly');
    });
  });

  describe('update', () => {
    const mockUpdateResponse = {
      success: true,
      message: 'Notebook updated successfully',
      notebook: {
        id: 'notebook-123',
        uid: 'uid-notebook-123',
        name: 'Updated Notebook',
        path: '/notebooks/updated-notebook',
        space_id: 'space-456',
        owner_id: 'user-789',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-03T00:00:00Z',
      },
    };

    it('should successfully update a notebook name', async () => {
      console.log('Testing update notebook name...');

      const mockedRequest = vi.mocked(DatalayerApi.requestDatalayerAPI);
      mockedRequest.mockResolvedValue(mockUpdateResponse);

      const updateData = {
        name: 'Updated Notebook',
      };

      const result = await notebooks.updateNotebook(
        MOCK_JWT_TOKEN,
        'notebook-123',
        updateData,
        DEFAULT_SERVICE_URLS.SPACER,
      );

      expect(mockedRequest).toHaveBeenCalledTimes(1);
      expect(mockedRequest).toHaveBeenCalledWith({
        url: `${DEFAULT_SERVICE_URLS.SPACER}${API_BASE_PATHS.SPACER}/notebooks/notebook-123`,
        method: 'PUT',
        token: MOCK_JWT_TOKEN,
        body: updateData,
      });

      expect(result).toEqual(mockUpdateResponse);
      expect(result.success).toBe(true);
      expect(result.notebook.name).toBe('Updated Notebook');

      console.log('Notebook name updated successfully');
    });

    it('should successfully update a notebook description', async () => {
      console.log('Testing update notebook description...');

      const mockedRequest = vi.mocked(DatalayerApi.requestDatalayerAPI);
      mockedRequest.mockResolvedValue(mockUpdateResponse);

      const updateData = {
        description: 'Updated description',
      };

      const result = await notebooks.updateNotebook(
        MOCK_JWT_TOKEN,
        'notebook-123',
        updateData,
        DEFAULT_SERVICE_URLS.SPACER,
      );

      expect(mockedRequest).toHaveBeenCalledWith({
        url: `${DEFAULT_SERVICE_URLS.SPACER}${API_BASE_PATHS.SPACER}/notebooks/notebook-123`,
        method: 'PUT',
        token: MOCK_JWT_TOKEN,
        body: updateData,
      });

      expect(result.success).toBe(true);

      console.log('Notebook description updated successfully');
    });

    it('should successfully update both name and description', async () => {
      console.log('Testing update notebook name and description...');

      const mockedRequest = vi.mocked(DatalayerApi.requestDatalayerAPI);
      mockedRequest.mockResolvedValue(mockUpdateResponse);

      const updateData = {
        name: 'Updated Notebook',
        description: 'Updated description',
      };

      const result = await notebooks.updateNotebook(
        MOCK_JWT_TOKEN,
        'notebook-123',
        updateData,
        DEFAULT_SERVICE_URLS.SPACER,
      );

      expect(mockedRequest).toHaveBeenCalledWith({
        url: `${DEFAULT_SERVICE_URLS.SPACER}${API_BASE_PATHS.SPACER}/notebooks/notebook-123`,
        method: 'PUT',
        token: MOCK_JWT_TOKEN,
        body: updateData,
      });

      expect(result.success).toBe(true);

      console.log('Notebook name and description updated successfully');
    });

    it('should handle API errors during update', async () => {
      console.log('Testing update notebook with API error...');

      const mockedRequest = vi.mocked(DatalayerApi.requestDatalayerAPI);
      mockedRequest.mockRejectedValue(new Error('Update failed'));

      const updateData = {
        name: 'Updated Notebook',
      };

      await expect(
        notebooks.updateNotebook(
          MOCK_JWT_TOKEN,
          'notebook-123',
          updateData,
          DEFAULT_SERVICE_URLS.SPACER,
        ),
      ).rejects.toThrow('Update failed');

      console.log('API error handled correctly');
    });
  });
});
