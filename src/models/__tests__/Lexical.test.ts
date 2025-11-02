/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Lexical } from '../../client/models/Lexical';
import type { Lexical as LexicalData } from '../SpaceDTO';
import type { DatalayerClient } from '../../client/index';
import * as items from '../../api/spacer/items';
import * as lexicals from '../../api/spacer/lexicals';

vi.mock('../../../api/spacer/items');
vi.mock('../../../api/spacer/lexicals');

describe('Lexical Model', () => {
  const mockLexicalData: LexicalData = {
    id: 'lexical-123',
    uid: 'lexical-uid-123',
    name: 'Test Document',
    space_id: 'space-456',
    owner_id: 'user-789',
    created_at: '2023-01-01T00:00:00Z',
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

  describe('Properties', () => {
    it('should return uid', () => {
      expect(lexical.uid).toBe('lexical-uid-123');
    });

    it('should return name', () => {
      expect(lexical.name).toBe('Test Document');
    });

    it('should return spaceId', () => {
      expect(lexical.spaceId).toBe('space-456');
    });
  });

  describe('Methods', () => {
    it('should update lexical', async () => {
      vi.mocked(lexicals.updateLexical).mockResolvedValue({
        success: true,
        lexical: { ...mockLexicalData, name: 'New Name' },
      } as any);

      const updated = await lexical.update('New Name');
      expect(updated).toBe(lexical);
    });

    it('should delete lexical', async () => {
      vi.mocked(items.deleteItem).mockResolvedValue({
        success: true,
      } as any);

      await lexical.delete();

      expect(items.deleteItem).toHaveBeenCalled();
    });
  });

  describe('Utility methods', () => {
    it('should return string representation', () => {
      const str = lexical.toString();
      expect(str).toContain('lexical-123');
      expect(str).toContain('Test Document');
    });
  });
});
