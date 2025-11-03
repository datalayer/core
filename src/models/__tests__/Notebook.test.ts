/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotebookDTO, NotebookData } from '../../models/NotebookDTO';
import {
  DeleteSpaceItemResponse,
  UpdateNotebookResponse,
} from '../../models/SpaceDTO';
import type { DatalayerClient } from '../../client/index';
import * as items from '../../api/spacer/items';
import * as notebooks from '../../api/spacer/notebooks';

vi.mock('../../api/spacer/items');
vi.mock('../../api/spacer/notebooks');

describe('Notebook Model', () => {
  const mockNotebookData: NotebookData & { path: string; space_id: string } = {
    id: 'notebook-123',
    uid: 'notebook-uid-123',
    name_t: 'Test Notebook',
    description_t: 'A test notebook description',
    type_s: '',
    notebook_extension_s: '',
    s3_path_s: 'datalayer.app/space-456/notebooks/test-notebook.ipynb',
    s3_url_s: '',
    cdn_url_s: '',
    path: '/notebooks/test',
    space_id: 'space-456',
  };

  let mockSDK: Partial<DatalayerClient>;
  let notebook: NotebookDTO;

  beforeEach(() => {
    mockSDK = {
      getToken: vi.fn().mockReturnValue('mock-token'),
      getSpacerRunUrl: vi.fn().mockReturnValue('https://spacer.example.com'),
    } satisfies Partial<DatalayerClient>;
    notebook = new NotebookDTO(mockNotebookData, mockSDK as DatalayerClient);
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
        message: 'Notebook updated',
        notebook: { ...mockNotebookData, name_t: 'New Name' },
      } satisfies UpdateNotebookResponse);

      const updated = await notebook.update('New Name');
      expect(updated).toBe(notebook);
    });

    it('should delete notebook', async () => {
      vi.mocked(items.deleteItem).mockResolvedValue({
        success: true,
        message: 'Deleted',
      } satisfies DeleteSpaceItemResponse);

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
