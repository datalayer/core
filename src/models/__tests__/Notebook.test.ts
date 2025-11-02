/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Notebook } from '../../client/models/Notebook';
import type { Notebook as NotebookData } from '../Space2';
import type { DatalayerClient } from '../../client/index';
import * as items from '../../api/spacer/items';
import * as notebooks from '../../api/spacer/notebooks';

vi.mock('../../../api/spacer/items');
vi.mock('../../../api/spacer/notebooks');

describe('Notebook Model', () => {
  const mockNotebookData: NotebookData = {
    id: 'notebook-123',
    uid: 'notebook-uid-123',
    name: 'Test Notebook',
    path: '/notebooks/test',
    space_id: 'space-456',
    owner_id: 'user-789',
    created_at: '2023-01-01T00:00:00Z',
  };

  let mockSDK: Partial<DatalayerClient>;
  let notebook: Notebook;

  beforeEach(() => {
    mockSDK = {
      getToken: vi.fn().mockReturnValue('mock-token'),
      getSpacerRunUrl: vi.fn().mockReturnValue('https://spacer.example.com'),
    } as any;
    notebook = new Notebook(mockNotebookData, mockSDK as DatalayerClient);
    vi.clearAllMocks();
  });

  describe('Properties', () => {
    it('should return uid', () => {
      expect(notebook.uid).toBe('notebook-uid-123');
    });

    it('should return name', () => {
      expect(notebook.name).toBe('Test Notebook');
    });

    it('should return path', () => {
      expect(notebook.path).toBe('/notebooks/test');
    });

    it('should return spaceId', () => {
      expect(notebook.spaceId).toBe('space-456');
    });
  });

  describe('Methods', () => {
    it('should update notebook', async () => {
      vi.mocked(notebooks.updateNotebook).mockResolvedValue({
        success: true,
        notebook: { ...mockNotebookData, name: 'New Name' },
      } as any);

      const updated = await notebook.update('New Name');
      expect(updated).toBe(notebook);
    });

    it('should delete notebook', async () => {
      vi.mocked(items.deleteItem).mockResolvedValue({
        success: true,
      } as any);

      await notebook.delete();

      expect(items.deleteItem).toHaveBeenCalled();
    });
  });

  describe('Utility methods', () => {
    it('should return string representation', () => {
      const str = notebook.toString();
      expect(str).toContain('notebook-123');
      expect(str).toContain('Test Notebook');
    });
  });
});
