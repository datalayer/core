/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * @module client/models/__tests__/Lexical.test
 * @description Tests for the Lexical domain model.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Lexical } from '../Lexical';
import type { Lexical as LexicalData } from '../../../api/types/spacer';
import type { DatalayerClient } from '../../index';
import { lexicals, items } from '../../../api/spacer';

// Mock the spacer API
vi.mock('../../../api/spacer', () => ({
  lexicals: {
    getLexical: vi.fn(),
    updateLexical: vi.fn(),
  },
  items: {
    deleteItem: vi.fn(),
  },
}));

describe('Lexical Model', () => {
  const mockLexicalData: LexicalData = {
    id: 'lexical-123',
    uid: 'lexical-uid-456',
    name: 'Project Documentation', // API uses name field
    content: {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'This is a sample document',
            },
          ],
        },
      ],
    },
    space_id: 'space-789',
    owner_id: 'user-abc',
    created_at: '2023-01-01T10:00:00Z',
    updated_at: '2023-01-02T15:30:00Z',
  };

  let mockSDK: Partial<DatalayerClient>;
  let lexical: Lexical;

  beforeEach(() => {
    mockSDK = {
      getToken: vi.fn().mockReturnValue('mock-token'),
      getSpacerRunUrl: vi.fn().mockReturnValue('https://spacer.example.com'),
    } as any;
    lexical = new Lexical(mockLexicalData, mockSDK as DatalayerClient);
    vi.clearAllMocks();
  });

  describe('Static Properties', () => {
    it('should return correct id', () => {
      expect(lexical.id).toBe('lexical-123');
    });

    it('should return correct uid', () => {
      expect(lexical.uid).toBe('lexical-uid-456');
    });

    it('should return correct space ID', () => {
      expect(lexical.spaceId).toBe('space-789');
    });

    it('should return correct owner ID', () => {
      expect(lexical.ownerId).toBe('user-abc');
    });

    it('should return correct created date', () => {
      expect(lexical.createdAt).toEqual(new Date('2023-01-01T10:00:00Z'));
    });

    it('should handle minimal data gracefully', () => {
      const minimalData: LexicalData = {
        id: 'lexical-minimal',
        uid: 'lexical-uid-minimal',
        name: 'Minimal Document',
        space_id: 'space-minimal',
        owner_id: 'user-minimal',
        created_at: '2023-01-01T08:00:00Z',
      };
      const minimalLexical = new Lexical(
        minimalData,
        mockSDK as DatalayerClient,
      );

      expect(minimalLexical.id).toBe('lexical-minimal');
      expect(minimalLexical.uid).toBe('lexical-uid-minimal');
      expect(minimalLexical.spaceId).toBe('space-minimal');
    });
  });

  describe('Dynamic Methods', () => {
    beforeEach(() => {
      (lexicals.getLexical as any).mockResolvedValue({
        success: true,
        document: { ...mockLexicalData, name: 'Updated Documentation' },
      });
    });

    it('should fetch fresh name from API and update internal data', async () => {
      const name = await lexical.getName();
      expect(name).toBe('Updated Documentation');
      expect(lexicals.getLexical).toHaveBeenCalledWith(
        'mock-token',
        'lexical-uid-456', // Use uid, not id
        'https://spacer.example.com',
      );
    });

    it('should fetch fresh content from API', async () => {
      const updatedContent = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'Updated document content',
              },
            ],
          },
        ],
      };
      (lexicals.getLexical as any).mockResolvedValue({
        success: true,
        document: { ...mockLexicalData, content: updatedContent },
      });

      const content = await lexical.getContent();
      expect(content).toEqual(updatedContent);
      expect(lexicals.getLexical).toHaveBeenCalledWith(
        'mock-token',
        'lexical-uid-456', // Use uid, not id
        'https://spacer.example.com',
      );
    });

    it('should fetch fresh updated date from API', async () => {
      const newUpdateTime = '2023-01-03T12:00:00Z';
      (lexicals.getLexical as any).mockResolvedValue({
        success: true,
        document: { ...mockLexicalData, updated_at: newUpdateTime },
      });

      const updatedAt = await lexical.getUpdatedAt();
      expect(updatedAt).toEqual(new Date(newUpdateTime));
    });

    it('should handle missing updated_at by falling back to created_at', async () => {
      (lexicals.getLexical as any).mockResolvedValue({
        success: true,
        document: { ...mockLexicalData, updated_at: undefined },
      });

      const updatedAt = await lexical.getUpdatedAt();
      expect(updatedAt).toEqual(new Date(mockLexicalData.created_at!));
    });

    it('should handle missing content gracefully', async () => {
      (lexicals.getLexical as any).mockResolvedValue({
        success: true,
        document: { ...mockLexicalData, content: undefined },
      });

      const content = await lexical.getContent();
      expect(content).toBeUndefined();
    });

    it('should update internal data when fetching dynamic properties', async () => {
      const updatedData = {
        ...mockLexicalData,
        name: 'Fresh Name',
        content: { type: 'doc', content: [] },
        updated_at: '2023-01-04T10:00:00Z',
      };
      (lexicals.getLexical as any).mockResolvedValue({
        success: true,
        document: updatedData,
      });

      await lexical.getName();
      const json = await lexical.toJSON();
      expect(json.name).toBe('Fresh Name');
      expect(json.updatedAt).toBe('2023-01-04T10:00:00Z');
    });
  });

  describe('Action Methods', () => {
    it('should update document and return new instance', async () => {
      const updatedDocument = {
        ...mockLexicalData,
        name: 'New Documentation Title',
        updated_at: '2023-01-03T14:00:00Z',
      };
      (lexicals.updateLexical as any).mockResolvedValue({
        success: true,
        document: updatedDocument,
      });

      const updated = await lexical.update(
        'New Documentation Title',
        'Updated description',
      );

      expect(lexicals.updateLexical).toHaveBeenCalledWith(
        'mock-token',
        'lexical-uid-456', // Use uid, not id
        { name: 'New Documentation Title', description: 'Updated description' },
        'https://spacer.example.com',
      );
      expect(updated).toBeInstanceOf(Lexical);
      expect(updated.toString()).toBe(
        'Lexical(lexical-123, New Documentation Title)',
      );
    });

    it('should delete document and mark as deleted', async () => {
      (items.deleteItem as any).mockResolvedValue({ success: true });

      await lexical.delete();

      expect(items.deleteItem).toHaveBeenCalledWith(
        'mock-token',
        'lexical-uid-456', // Use uid, not id
        'https://spacer.example.com',
      );

      // After deletion, accessing properties should throw error
      expect(() => lexical.id).toThrow(
        'Lexical lexical-123 has been deleted and no longer exists',
      );
    });
  });

  describe('Utility Methods', () => {
    it('should return JSON with fresh data', async () => {
      const freshData = { ...mockLexicalData, name: 'Fresh Documentation' };
      (lexicals.getLexical as any).mockResolvedValue({
        success: true,
        document: freshData,
      });

      const json = await lexical.toJSON();
      expect(json.name).toBe('Fresh Documentation');
      expect(json.id).toBe('lexical-123');
    });

    it('should return string representation', () => {
      expect(lexical.toString()).toBe(
        'Lexical(lexical-123, Project Documentation)',
      );
    });
  });

  describe('Deletion State Management', () => {
    beforeEach(async () => {
      (items.deleteItem as any).mockResolvedValue({ success: true });
      await lexical.delete();
    });

    it('should throw error when accessing static properties after deletion', () => {
      expect(() => lexical.id).toThrow(
        'Lexical lexical-123 has been deleted and no longer exists',
      );
      expect(() => lexical.uid).toThrow(
        'Lexical lexical-123 has been deleted and no longer exists',
      );
      expect(() => lexical.spaceId).toThrow(
        'Lexical lexical-123 has been deleted and no longer exists',
      );
      expect(() => lexical.ownerId).toThrow(
        'Lexical lexical-123 has been deleted and no longer exists',
      );
      expect(() => lexical.createdAt).toThrow(
        'Lexical lexical-123 has been deleted and no longer exists',
      );
    });

    it('should throw error when calling dynamic methods after deletion', async () => {
      await expect(lexical.getName()).rejects.toThrow(
        'Lexical lexical-123 has been deleted and no longer exists',
      );
      await expect(lexical.getContent()).rejects.toThrow(
        'Lexical lexical-123 has been deleted and no longer exists',
      );
      await expect(lexical.getUpdatedAt()).rejects.toThrow(
        'Lexical lexical-123 has been deleted and no longer exists',
      );
    });

    it('should throw error when calling action methods after deletion', async () => {
      await expect(lexical.update('New Name')).rejects.toThrow(
        'Lexical lexical-123 has been deleted and no longer exists',
      );
    });

    it('should throw error when calling utility methods after deletion', async () => {
      await expect(lexical.toJSON()).rejects.toThrow(
        'Lexical lexical-123 has been deleted and no longer exists',
      );
      expect(() => lexical.toString()).toThrow(
        'Lexical lexical-123 has been deleted and no longer exists',
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully in dynamic methods', async () => {
      (lexicals.getLexical as any).mockRejectedValue(new Error('API Error'));

      await expect(lexical.getName()).rejects.toThrow('API Error');
    });

    it('should handle missing document in API response', async () => {
      (lexicals.getLexical as any).mockResolvedValue({
        success: false,
        message: 'Document not found',
        document: null,
      });

      const name = await lexical.getName();
      // Should return the current name from internal data when API returns null
      expect(name).toBe('Project Documentation');
    });

    it('should handle API errors in update method', async () => {
      (lexicals.updateLexical as any).mockRejectedValue(
        new Error('Update failed'),
      );

      await expect(lexical.update('New Name')).rejects.toThrow('Update failed');
    });

    it('should handle API errors in delete method', async () => {
      (items.deleteItem as any).mockRejectedValue(new Error('Delete failed'));

      await expect(lexical.delete()).rejects.toThrow('Delete failed');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty content gracefully', async () => {
      (lexicals.getLexical as any).mockResolvedValue({
        success: true,
        document: { ...mockLexicalData, content: {} },
      });

      const content = await lexical.getContent();
      expect(content).toEqual({});
    });

    it('should handle null content gracefully', async () => {
      (lexicals.getLexical as any).mockResolvedValue({
        success: true,
        document: { ...mockLexicalData, content: null },
      });

      const content = await lexical.getContent();
      expect(content).toBeNull();
    });

    it('should handle partial update requests', async () => {
      (lexicals.updateLexical as any).mockResolvedValue({
        success: true,
        document: { ...mockLexicalData, name: 'Only Name Updated' },
      });

      const updated = await lexical.update('Only Name Updated');

      expect(lexicals.updateLexical).toHaveBeenCalledWith(
        'mock-token',
        'lexical-uid-456', // Use uid, not id
        { name: 'Only Name Updated' },
        'https://spacer.example.com',
      );
      expect(updated.toString()).toBe(
        'Lexical(lexical-123, Only Name Updated)',
      );
    });
  });
});
