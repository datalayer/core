/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * @module client/models/__tests__/Notebook.test
 * @description Tests for the Notebook domain model.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Notebook } from '../Notebook';
import type { Notebook as NotebookData } from '../../../api/types/spacer';
import type { DatalayerClient } from '../../index';
import { notebooks } from '../../../api/spacer';

// Mock the notebooks API
vi.mock('../../../api/spacer', () => ({
  notebooks: {
    getNotebook: vi.fn(),
    updateNotebook: vi.fn(),
  },
  items: {
    deleteItem: vi.fn(),
  },
}));

describe('Notebook Model', () => {
  const mockNotebookData: NotebookData = {
    id: 'notebook-123',
    uid: 'notebook-uid-456',
    name: 'Test Notebook',
    path: '/test/notebook.ipynb',
    content: {
      cells: [{ cell_type: 'code', source: 'print("hello")' }],
      metadata: {},
      nbformat: 4,
      nbformat_minor: 2,
    },
    space_id: 'space-789',
    owner_id: 'user-abc',
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:30:00Z',
    version: 1,
    kernel_spec: {
      display_name: 'Python 3',
      language: 'python',
      name: 'python3',
    },
    metadata: {
      custom_field: 'custom_value',
    },
  };

  let mockSDK: Partial<DatalayerClient>;
  let notebook: Notebook;

  beforeEach(() => {
    mockSDK = {
      getToken: vi.fn().mockReturnValue('mock-token'),
      getSpacerRunUrl: vi.fn().mockReturnValue('https://api.example.com'),
    } as any;
    notebook = new Notebook(mockNotebookData, mockSDK as DatalayerClient);
    vi.clearAllMocks();
  });

  describe('Static Properties', () => {
    it('should return correct id', () => {
      expect(notebook.id).toBe('notebook-123');
    });

    it('should return correct uid', () => {
      expect(notebook.uid).toBe('notebook-uid-456');
    });

    it('should return correct path', () => {
      expect(notebook.path).toBe('/test/notebook.ipynb');
    });

    it('should return correct space id', () => {
      expect(notebook.spaceId).toBe('space-789');
    });

    it('should return correct owner id', () => {
      expect(notebook.ownerId).toBe('user-abc');
    });

    it('should return correct created date', () => {
      expect(notebook.createdAt).toEqual(new Date('2023-01-01T00:00:00Z'));
    });

    it('should return correct version', () => {
      expect(notebook.version).toBe(1);
    });

    it('should return correct metadata', () => {
      expect(notebook.metadata).toEqual({ custom_field: 'custom_value' });
    });

    it('should handle missing optional fields gracefully', () => {
      const minimalData: NotebookData = {
        id: 'notebook-123',
        uid: 'notebook-uid-456',
        name: 'Minimal Notebook',
        path: '/minimal.ipynb',
        space_id: 'space-789',
        owner_id: 'user-abc',
        created_at: '2023-01-01T00:00:00Z',
      };
      const minimalNotebook = new Notebook(
        minimalData,
        mockSDK as DatalayerClient,
      );

      expect(minimalNotebook.version).toBe(0);
      expect(minimalNotebook.metadata).toEqual({});
    });
  });

  describe('Dynamic Methods', () => {
    beforeEach(() => {
      (notebooks.getNotebook as any).mockResolvedValue({
        notebook: { ...mockNotebookData, name: 'Updated Name' },
      });
    });

    it('should fetch fresh name from API and update internal data', async () => {
      const name = await notebook.getName();
      expect(name).toBe('Updated Name');
      expect(notebooks.getNotebook).toHaveBeenCalledWith(
        'mock-token',
        'notebook-uid-456', // Use uid, not id
        'https://api.example.com',
      );
    });

    it('should fetch fresh content from API', async () => {
      const updatedContent = { cells: [], metadata: {}, nbformat: 4 };
      (notebooks.getNotebook as any).mockResolvedValue({
        notebook: { ...mockNotebookData, content: updatedContent },
      });

      const content = await notebook.getContent();
      expect(content).toEqual(updatedContent);
      expect(notebooks.getNotebook).toHaveBeenCalledWith(
        'mock-token',
        'notebook-uid-456', // Use uid, not id
        'https://api.example.com',
      );
    });

    it('should fetch fresh kernel spec from API', async () => {
      const updatedKernelSpec = {
        display_name: 'Python 3.9',
        language: 'python',
      };
      (notebooks.getNotebook as any).mockResolvedValue({
        notebook: { ...mockNotebookData, kernel_spec: updatedKernelSpec },
      });

      const kernelSpec = await notebook.getKernelSpec();
      expect(kernelSpec).toEqual(updatedKernelSpec);
    });

    it('should fetch fresh updated date from API', async () => {
      const newUpdatedAt = '2023-01-02T12:00:00Z';
      (notebooks.getNotebook as any).mockResolvedValue({
        notebook: { ...mockNotebookData, updated_at: newUpdatedAt },
      });

      const updatedAt = await notebook.getUpdatedAt();
      expect(updatedAt).toEqual(new Date(newUpdatedAt));
    });

    it('should use created_at when updated_at is missing', async () => {
      (notebooks.getNotebook as any).mockResolvedValue({
        notebook: { ...mockNotebookData, updated_at: undefined },
      });

      const updatedAt = await notebook.getUpdatedAt();
      expect(updatedAt).toEqual(new Date(mockNotebookData.created_at!));
    });

    it('should update internal data when fetching dynamic properties', async () => {
      const updatedData = {
        ...mockNotebookData,
        name: 'Fresh Name',
        version: 2,
      };
      (notebooks.getNotebook as any).mockResolvedValue({
        notebook: updatedData,
      });

      await notebook.getName();
      const json = await notebook.toJSON();
      expect(json.name).toBe('Fresh Name');
    });
  });

  describe('Action Methods', () => {
    it('should update notebook and return new instance', async () => {
      const updatedNotebookData = { ...mockNotebookData, name: 'New Name' };

      (notebooks.updateNotebook as any).mockResolvedValue({
        notebook: updatedNotebookData,
      });

      const updatedNotebook = await notebook.update(
        'New Name',
        'New Description',
      );

      expect(notebooks.updateNotebook).toHaveBeenCalledWith(
        'mock-token',
        'notebook-uid-456', // Use uid, not id
        { name: 'New Name', description: 'New Description' },
        'https://api.example.com',
      );
      expect(updatedNotebook).toBeInstanceOf(Notebook);
      expect(updatedNotebook.id).toBe('notebook-123');
    });

    it('should delete notebook', async () => {
      const { items } = await import('../../../api/spacer');
      (items.deleteItem as any).mockResolvedValue({});

      await notebook.delete();

      expect(items.deleteItem).toHaveBeenCalledWith(
        'mock-token',
        'notebook-uid-456', // Use uid, not id
        'https://api.example.com',
      );
    });
  });

  describe('Utility Methods', () => {
    it('should return JSON with fresh data', async () => {
      const freshData = { ...mockNotebookData, name: 'Latest Name' };
      (notebooks.getNotebook as any).mockResolvedValue({ notebook: freshData });

      const json = await notebook.toJSON();
      expect(json.name).toBe('Latest Name');
      expect(json.id).toBe('notebook-123');
    });

    it('should return string representation', () => {
      expect(notebook.toString()).toBe('Notebook(notebook-123, Test Notebook)');
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully in dynamic methods', async () => {
      (notebooks.getNotebook as any).mockRejectedValue(new Error('API Error'));

      await expect(notebook.getName()).rejects.toThrow('API Error');
    });

    it('should handle missing notebook in API response', async () => {
      (notebooks.getNotebook as any).mockResolvedValue({ notebook: null });

      const name = await notebook.getName();
      // Should return the current name from internal data when API returns null
      expect(name).toBe('Test Notebook');
    });
  });
});
