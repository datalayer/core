/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Space } from '../../client/models/Space';
import type { Space as SpaceData } from '../SpaceDTO';
import type { DatalayerClient } from '../../client/index';
import * as users from '../../api/spacer/users';
import * as items from '../../api/spacer/items';

vi.mock('../../../api/spacer/users');
vi.mock('../../../api/spacer/items');
vi.mock('../../../api/spacer/notebooks');
vi.mock('../../../api/spacer/lexicals');

describe('Space Model', () => {
  const mockSpaceData: SpaceData = {
    uid: 'space-uid-123',
    name_t: 'Research Workspace',
    handle_s: 'research-workspace',
    variant_s: 'default',
    description_t: 'Data analysis workspace',
    visibility: 'private',
  };

  let mockSDK: Partial<DatalayerClient>;
  let space: Space;

  beforeEach(() => {
    mockSDK = {
      getToken: vi.fn().mockReturnValue('mock-token'),
      getSpacerRunUrl: vi.fn().mockReturnValue('https://spacer.example.com'),
      createNotebook: vi.fn(),
      createLexical: vi.fn(),
    } as any;
    space = new Space(mockSpaceData, mockSDK as DatalayerClient);
    vi.clearAllMocks();
  });

  describe('Properties', () => {
    it('should return uid', () => {
      expect(space.uid).toBe('space-uid-123');
    });

    it('should return handle', () => {
      expect(space.handle).toBe('research-workspace');
    });

    it('should return variant', () => {
      expect(space.variant).toBe('default');
    });

    it('should return name', () => {
      expect(space.name).toBe('Research Workspace');
    });

    it('should return description', () => {
      expect(space.description).toBe('Data analysis workspace');
    });
  });

  describe('Methods', () => {
    it('should get space items', async () => {
      const mockItems = [
        { id: 'item-1', name: 'Notebook 1', type: 'notebook' },
      ];
      vi.mocked(items.getSpaceItems).mockResolvedValue({
        success: true,
        items: mockItems,
      } as any);

      const spaceItems = await space.getItems();

      expect(items.getSpaceItems).toHaveBeenCalledWith(
        'mock-token',
        'space-uid-123',
        'https://spacer.example.com',
      );
      expect(Array.isArray(spaceItems)).toBe(true);
    });

    it('should refresh space data', async () => {
      vi.mocked(users.getMySpaces).mockResolvedValue({
        success: true,
        spaces: [{ ...mockSpaceData, name_t: 'Updated Name' }],
      } as any);

      await space.refresh();

      expect(users.getMySpaces).toHaveBeenCalledWith(
        'mock-token',
        'https://spacer.example.com',
      );
    });
  });

  describe('Utility methods', () => {
    it('should return string representation', () => {
      expect(space.toString()).toContain('space-uid-123');
    });
  });
});
