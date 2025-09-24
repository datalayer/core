/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * @module sdk/client/models/__tests__/Space.test
 * @description Tests for the Space domain model.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Space } from '../Space';
import type { Space as SpaceData } from '../../../../api/types/spacer';
import type { DatalayerSDK } from '../../index';
import { users, items } from '../../../../api/spacer';
import { Notebook } from '../Notebook';
import { Lexical } from '../Lexical';

// Mock the spacer API
vi.mock('../../../../api/spacer', () => ({
  users: {
    getMySpaces: vi.fn(),
  },
  items: {
    getSpaceItems: vi.fn(),
  },
}));

describe('Space Model', () => {
  const mockSpaceData: SpaceData = {
    uid: 'space-uid-123',
    id: 'space-123',
    name: 'Research Workspace',
    name_t: 'Research Workspace',
    handle_s: 'research-workspace',
    variant_s: 'default',
    description: 'Data analysis workspace',
    description_t: 'Data analysis workspace',
    visibility: 'private',
    owner_id: 'user-abc',
    organization_id: 'org-def',
    created_at: '2023-01-01T10:00:00Z',
    updated_at: '2023-01-02T15:30:00Z',
    notebooks_count: 5,
    members_count: 3,
    tags: ['research', 'analysis'],
    tags_ss: ['research', 'analysis'],
  };

  let mockSDK: Partial<DatalayerSDK>;
  let space: Space;

  beforeEach(() => {
    mockSDK = {
      getToken: vi.fn().mockReturnValue('mock-token'),
      getSpacerRunUrl: vi.fn().mockReturnValue('https://spacer.example.com'),
      createNotebook: vi.fn(),
      createLexical: vi.fn(),
    } as any;
    space = new Space(mockSpaceData, mockSDK as DatalayerSDK);
    vi.clearAllMocks();
  });

  describe('Static Properties', () => {
    it('should return correct uid', () => {
      expect(space.uid).toBe('space-uid-123');
    });

    it('should return correct id', () => {
      expect(space.id).toBe('space-123');
    });

    it('should return uid as id when id is not present', () => {
      const dataWithoutId = { ...mockSpaceData, id: undefined };
      const spaceWithoutId = new Space(dataWithoutId, mockSDK as DatalayerSDK);
      expect(spaceWithoutId.id).toBe('space-uid-123');
    });

    it('should return correct owner ID', () => {
      expect(space.ownerId).toBe('user-abc');
    });

    it('should return correct organization ID', () => {
      expect(space.organizationId).toBe('org-def');
    });

    it('should return correct created date', () => {
      const createdAt = space.createdAt;
      expect(createdAt).toEqual(new Date('2023-01-01T10:00:00Z'));
    });

    it('should return correct visibility', () => {
      expect(space.visibility).toBe('private');
    });

    it('should return correct handle', () => {
      expect(space.handle).toBe('research-workspace');
    });

    it('should return correct variant', () => {
      expect(space.variant).toBe('default');
    });

    it('should handle missing optional fields gracefully', () => {
      const minimalData: SpaceData = {
        uid: 'space-minimal',
        visibility: 'public',
      };
      const minimalSpace = new Space(minimalData, mockSDK as DatalayerSDK);

      expect(minimalSpace.ownerId).toBe('');
      expect(minimalSpace.organizationId).toBe('');
      expect(minimalSpace.handle).toBe('');
      expect(minimalSpace.variant).toBe('');
      expect(minimalSpace.createdAt).toBeNull();
    });
  });

  describe('Dynamic Methods', () => {
    beforeEach(() => {
      (users.getMySpaces as any).mockResolvedValue({
        success: true,
        spaces: [{ ...mockSpaceData, name: 'Updated Workspace Name' }],
      });
    });

    it('should fetch fresh name from API and update internal data', async () => {
      const name = await space.getName();
      expect(name).toBe('Updated Workspace Name');
      expect(users.getMySpaces).toHaveBeenCalledWith(
        'mock-token',
        'https://spacer.example.com',
      );
    });

    it('should fetch fresh description from API', async () => {
      const updatedDescription = 'Updated workspace description';
      (users.getMySpaces as any).mockResolvedValue({
        success: true,
        spaces: [{ ...mockSpaceData, description: updatedDescription }],
      });

      const description = await space.getDescription();
      expect(description).toBe(updatedDescription);
    });

    it('should fetch fresh updated date from API', async () => {
      const newUpdateTime = '2023-01-03T12:00:00Z';
      (users.getMySpaces as any).mockResolvedValue({
        success: true,
        spaces: [{ ...mockSpaceData, updated_at: newUpdateTime }],
      });

      const updatedAt = await space.getUpdatedAt();
      expect(updatedAt).toEqual(new Date(newUpdateTime));
    });

    it('should handle missing updated_at by falling back to created_at', async () => {
      (users.getMySpaces as any).mockResolvedValue({
        success: true,
        spaces: [{ ...mockSpaceData, updated_at: undefined }],
      });

      const updatedAt = await space.getUpdatedAt();
      expect(updatedAt).toEqual(new Date(mockSpaceData.created_at!));
    });

    it('should handle space not found in refresh', async () => {
      (users.getMySpaces as any).mockResolvedValue({
        success: true,
        spaces: [], // Empty array - space not found
      });

      const name = await space.getName();
      // Should return the current name from internal data when space not found
      expect(name).toBe('Research Workspace');
    });

    it('should prefer name over name_t field', async () => {
      (users.getMySpaces as any).mockResolvedValue({
        success: true,
        spaces: [
          { ...mockSpaceData, name: 'Primary Name', name_t: 'Secondary Name' },
        ],
      });

      const name = await space.getName();
      expect(name).toBe('Primary Name');
    });

    it('should use name_t when name is not present', async () => {
      (users.getMySpaces as any).mockResolvedValue({
        success: true,
        spaces: [
          { ...mockSpaceData, name: undefined, name_t: 'Fallback Name' },
        ],
      });

      const name = await space.getName();
      expect(name).toBe('Fallback Name');
    });
  });

  describe('Space-specific Methods', () => {
    it('should get space items', async () => {
      const mockItems = [
        { id: 'item-1', name: 'Notebook 1', type: 'notebook' },
        { id: 'item-2', name: 'Document 1', type: 'lexical' },
      ];
      (items.getSpaceItems as any).mockResolvedValue({
        success: true,
        items: mockItems,
      });

      const spaceItems = await space.getItems();

      expect(items.getSpaceItems).toHaveBeenCalledWith(
        'mock-token',
        'space-uid-123',
        'https://spacer.example.com',
      );
      expect(spaceItems).toEqual(mockItems);
    });

    it('should create notebook in space', async () => {
      const mockNotebook = new Notebook(
        {
          id: 'notebook-new',
          uid: 'notebook-uid-new',
          name: 'New Notebook',
        } as any,
        mockSDK as DatalayerSDK,
      );
      (mockSDK.createNotebook as any).mockResolvedValue(mockNotebook);

      const formData = new FormData();
      formData.append('name', 'New Notebook');
      formData.append('notebookType', 'jupyter');

      const notebook = await space.createNotebook(formData);

      // Should automatically set spaceId
      expect(formData.get('spaceId')).toBe('space-uid-123');
      expect(mockSDK.createNotebook).toHaveBeenCalledWith(formData);
      expect(notebook).toBe(mockNotebook);
    });

    it('should create lexical document in space', async () => {
      const mockLexical = new Lexical(
        {
          id: 'lexical-new',
          uid: 'lexical-uid-new',
          name: 'New Document',
        } as any,
        mockSDK as DatalayerSDK,
      );
      (mockSDK.createLexical as any).mockResolvedValue(mockLexical);

      const formData = new FormData();
      formData.append('name', 'New Document');
      formData.append('documentType', 'lexical');

      const lexical = await space.createLexical(formData);

      // Should automatically set spaceId
      expect(formData.get('spaceId')).toBe('space-uid-123');
      expect(mockSDK.createLexical).toHaveBeenCalledWith(formData);
      expect(lexical).toBe(mockLexical);
    });

    it('should override existing spaceId in formData', async () => {
      const mockNotebook = new Notebook(
        {
          id: 'notebook-new',
          uid: 'notebook-uid-new',
          name: 'New Notebook',
        } as any,
        mockSDK as DatalayerSDK,
      );
      (mockSDK.createNotebook as any).mockResolvedValue(mockNotebook);

      const formData = new FormData();
      formData.append('spaceId', 'wrong-space-id'); // Wrong space ID
      formData.append('name', 'New Notebook');

      await space.createNotebook(formData);

      // Should override with correct spaceId
      expect(formData.get('spaceId')).toBe('space-uid-123');
    });
  });

  describe('Utility Methods', () => {
    it('should return JSON with fresh data', async () => {
      const freshData = { ...mockSpaceData, name: 'Fresh Workspace Name' };
      (users.getMySpaces as any).mockResolvedValue({
        success: true,
        spaces: [freshData],
      });

      const json = await space.toJSON();
      expect(json.name).toBe('Fresh Workspace Name');
      expect(json.uid).toBe('space-uid-123');
    });

    it('should return string representation with name', () => {
      expect(space.toString()).toBe('Space(space-uid-123, Research Workspace)');
    });

    it('should use name_t in toString when name is not present', () => {
      const dataWithoutName = { ...mockSpaceData, name: undefined };
      const spaceWithoutName = new Space(
        dataWithoutName,
        mockSDK as DatalayerSDK,
      );
      expect(spaceWithoutName.toString()).toBe(
        'Space(space-uid-123, Research Workspace)',
      );
    });

    it('should use "Unnamed" in toString when no name fields present', () => {
      const dataWithoutNames = {
        ...mockSpaceData,
        name: undefined,
        name_t: undefined,
      };
      const spaceWithoutNames = new Space(
        dataWithoutNames,
        mockSDK as DatalayerSDK,
      );
      expect(spaceWithoutNames.toString()).toBe(
        'Space(space-uid-123, Unnamed)',
      );
    });
  });

  describe('Deletion State Management', () => {
    beforeEach(() => {
      // Mark space as deleted by setting the private flag
      (space as any)._deleted = true;
    });

    it('should throw error when accessing static properties after deletion', () => {
      expect(() => space.uid).toThrow(
        'Space space-uid-123 has been deleted and no longer exists',
      );
      expect(() => space.id).toThrow(
        'Space space-uid-123 has been deleted and no longer exists',
      );
      expect(() => space.ownerId).toThrow(
        'Space space-uid-123 has been deleted and no longer exists',
      );
      expect(() => space.organizationId).toThrow(
        'Space space-uid-123 has been deleted and no longer exists',
      );
      expect(() => space.createdAt).toThrow(
        'Space space-uid-123 has been deleted and no longer exists',
      );
      expect(() => space.visibility).toThrow(
        'Space space-uid-123 has been deleted and no longer exists',
      );
      expect(() => space.handle).toThrow(
        'Space space-uid-123 has been deleted and no longer exists',
      );
      expect(() => space.variant).toThrow(
        'Space space-uid-123 has been deleted and no longer exists',
      );
    });

    it('should throw error when calling dynamic methods after deletion', async () => {
      await expect(space.getName()).rejects.toThrow(
        'Space space-uid-123 has been deleted and no longer exists',
      );
      await expect(space.getDescription()).rejects.toThrow(
        'Space space-uid-123 has been deleted and no longer exists',
      );
      await expect(space.getUpdatedAt()).rejects.toThrow(
        'Space space-uid-123 has been deleted and no longer exists',
      );
    });

    it('should throw error when calling space-specific methods after deletion', async () => {
      await expect(space.getItems()).rejects.toThrow(
        'Space space-uid-123 has been deleted and no longer exists',
      );
      await expect(space.createNotebook(new FormData())).rejects.toThrow(
        'Space space-uid-123 has been deleted and no longer exists',
      );
      await expect(space.createLexical(new FormData())).rejects.toThrow(
        'Space space-uid-123 has been deleted and no longer exists',
      );
    });

    it('should throw error when calling utility methods after deletion', async () => {
      await expect(space.toJSON()).rejects.toThrow(
        'Space space-uid-123 has been deleted and no longer exists',
      );
      expect(() => space.toString()).toThrow(
        'Space space-uid-123 has been deleted and no longer exists',
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully in dynamic methods', async () => {
      (users.getMySpaces as any).mockRejectedValue(new Error('API Error'));

      await expect(space.getName()).rejects.toThrow('API Error');
    });

    it('should handle API errors in getItems method', async () => {
      (items.getSpaceItems as any).mockRejectedValue(
        new Error('Items fetch failed'),
      );

      await expect(space.getItems()).rejects.toThrow('Items fetch failed');
    });

    it('should handle errors in createNotebook', async () => {
      (mockSDK.createNotebook as any).mockRejectedValue(
        new Error('Creation failed'),
      );

      await expect(space.createNotebook(new FormData())).rejects.toThrow(
        'Creation failed',
      );
    });

    it('should handle errors in createLexical', async () => {
      (mockSDK.createLexical as any).mockRejectedValue(
        new Error('Creation failed'),
      );

      await expect(space.createLexical(new FormData())).rejects.toThrow(
        'Creation failed',
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty description gracefully', async () => {
      (users.getMySpaces as any).mockResolvedValue({
        success: true,
        spaces: [{ ...mockSpaceData, description: '', description_t: '' }],
      });

      const description = await space.getDescription();
      expect(description).toBe('');
    });

    it('should handle missing timestamps gracefully', async () => {
      (users.getMySpaces as any).mockResolvedValue({
        success: true,
        spaces: [
          { ...mockSpaceData, updated_at: undefined, created_at: undefined },
        ],
      });

      // Should return null when no timestamps are available
      const updatedAt = await space.getUpdatedAt();
      expect(updatedAt).toBeNull();
    });

    it('should handle empty items response', async () => {
      (items.getSpaceItems as any).mockResolvedValue({
        success: true,
        items: [],
      });

      const spaceItems = await space.getItems();
      expect(spaceItems).toEqual([]);
    });
  });
});
