/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { items } from '..';
import * as DatalayerApi from '../../DatalayerApi';
import { API_BASE_PATHS, DEFAULT_SERVICE_URLS } from '../../constants';
import { MOCK_JWT_TOKEN } from '../../__tests__/test-constants';

// Mock the DatalayerApi module
vi.mock('../../DatalayerApi', () => ({
  requestDatalayerAPI: vi.fn(),
}));

describe('Spacer Items Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getSpaceItems', () => {
    const mockGetItemsResponse = {
      success: true,
      message: 'Items retrieved successfully',
      items: [
        {
          id: 'item-1',
          type: 'notebook',
          space_id: 'space-123',
          item_id: 'notebook-456',
          name: 'My Notebook',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z',
        },
        {
          id: 'item-2',
          type: 'lexical',
          space_id: 'space-123',
          item_id: 'lexical-789',
          name: 'My Document',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z',
        },
      ],
    };

    it('should successfully get space items', async () => {
      console.log('Testing get space items...');

      const mockedRequest = vi.mocked(DatalayerApi.requestDatalayerAPI);
      mockedRequest.mockResolvedValue(mockGetItemsResponse);

      const result = await items.getSpaceItems(
        DEFAULT_SERVICE_URLS.SPACER,
        MOCK_JWT_TOKEN,
        'space-123',
      );

      expect(mockedRequest).toHaveBeenCalledTimes(1);
      expect(mockedRequest).toHaveBeenCalledWith({
        url: `${DEFAULT_SERVICE_URLS.SPACER}${API_BASE_PATHS.SPACER}/spaces/space-123/items`,
        method: 'GET',
        token: MOCK_JWT_TOKEN,
      });

      expect(result).toEqual(mockGetItemsResponse);
      expect(result.success).toBe(true);
      expect(result.items).toHaveLength(2);
      expect(result.items[0].type).toBe('notebook');
      expect(result.items[1].type).toBe('lexical');

      console.log('Space items retrieved successfully');
    });

    it('should handle empty items list', async () => {
      console.log('Testing get space items with empty response...');

      const emptyResponse = {
        success: true,
        message: 'No items found in space',
        items: [],
      };

      const mockedRequest = vi.mocked(DatalayerApi.requestDatalayerAPI);
      mockedRequest.mockResolvedValue(emptyResponse);

      const result = await items.getSpaceItems(
        DEFAULT_SERVICE_URLS.SPACER,
        MOCK_JWT_TOKEN,
        'empty-space',
      );

      expect(result).toEqual(emptyResponse);
      expect(result.items).toHaveLength(0);

      console.log('Empty items list handled correctly');
    });

    it('should use custom base URL when provided', async () => {
      console.log('Testing get space items with custom base URL...');

      const customUrl = 'https://custom.spacer.api';
      const mockedRequest = vi.mocked(DatalayerApi.requestDatalayerAPI);
      mockedRequest.mockResolvedValue(mockGetItemsResponse);

      await items.getSpaceItems(customUrl, MOCK_JWT_TOKEN, 'space-123');

      expect(mockedRequest).toHaveBeenCalledWith({
        url: `${customUrl}${API_BASE_PATHS.SPACER}/spaces/space-123/items`,
        method: 'GET',
        token: MOCK_JWT_TOKEN,
      });

      console.log('Custom base URL used correctly');
    });

    it('should handle API errors during get', async () => {
      console.log('Testing get space items with API error...');

      const mockedRequest = vi.mocked(DatalayerApi.requestDatalayerAPI);
      mockedRequest.mockRejectedValue(new Error('Network error'));

      await expect(
        items.getSpaceItems(
          DEFAULT_SERVICE_URLS.SPACER,
          MOCK_JWT_TOKEN,
          'space-123',
        ),
      ).rejects.toThrow('Network error');

      console.log('API error handled correctly');
    });
  });

  describe('deleteItem', () => {
    const mockDeleteResponse = {
      success: true,
      message: 'Item deleted successfully',
    };

    it('should successfully delete an item', async () => {
      console.log('Testing delete item...');

      const mockedRequest = vi.mocked(DatalayerApi.requestDatalayerAPI);
      mockedRequest.mockResolvedValue(mockDeleteResponse);

      const result = await items.deleteItem(
        DEFAULT_SERVICE_URLS.SPACER,
        MOCK_JWT_TOKEN,
        'item-123',
      );

      expect(mockedRequest).toHaveBeenCalledTimes(1);
      expect(mockedRequest).toHaveBeenCalledWith({
        url: `${DEFAULT_SERVICE_URLS.SPACER}${API_BASE_PATHS.SPACER}/spaces/items/item-123`,
        method: 'DELETE',
        token: MOCK_JWT_TOKEN,
      });

      expect(result).toEqual(mockDeleteResponse);
      expect(result.success).toBe(true);
      expect(result.message).toBe('Item deleted successfully');

      console.log('Item deleted successfully');
    });

    it('should handle non-existent item deletion', async () => {
      console.log('Testing delete non-existent item...');

      const notFoundResponse = {
        success: false,
        message: 'Item not found',
      };

      const mockedRequest = vi.mocked(DatalayerApi.requestDatalayerAPI);
      mockedRequest.mockResolvedValue(notFoundResponse);

      const result = await items.deleteItem(
        DEFAULT_SERVICE_URLS.SPACER,
        MOCK_JWT_TOKEN,
        'non-existent-item',
      );

      expect(result).toEqual(notFoundResponse);
      expect(result.success).toBe(false);

      console.log('Non-existent item handled correctly');
    });

    it('should use custom base URL when provided', async () => {
      console.log('Testing delete item with custom base URL...');

      const customUrl = 'https://custom.spacer.api';
      const mockedRequest = vi.mocked(DatalayerApi.requestDatalayerAPI);
      mockedRequest.mockResolvedValue(mockDeleteResponse);

      await items.deleteItem(customUrl, MOCK_JWT_TOKEN, 'item-123');

      expect(mockedRequest).toHaveBeenCalledWith({
        url: `${customUrl}${API_BASE_PATHS.SPACER}/spaces/items/item-123`,
        method: 'DELETE',
        token: MOCK_JWT_TOKEN,
      });

      console.log('Custom base URL used correctly');
    });

    it('should handle API errors during deletion', async () => {
      console.log('Testing delete item with API error...');

      const mockedRequest = vi.mocked(DatalayerApi.requestDatalayerAPI);
      mockedRequest.mockRejectedValue(new Error('Network error'));

      await expect(
        items.deleteItem(
          DEFAULT_SERVICE_URLS.SPACER,
          MOCK_JWT_TOKEN,
          'item-123',
        ),
      ).rejects.toThrow('Network error');

      console.log('API error handled correctly');
    });

    it('should handle permission denied errors', async () => {
      console.log('Testing delete item with permission denied...');

      const permissionDeniedResponse = {
        success: false,
        message:
          'Permission denied: You do not have permission to delete this item',
      };

      const mockedRequest = vi.mocked(DatalayerApi.requestDatalayerAPI);
      mockedRequest.mockResolvedValue(permissionDeniedResponse);

      const result = await items.deleteItem(
        DEFAULT_SERVICE_URLS.SPACER,
        MOCK_JWT_TOKEN,
        'protected-item',
      );

      expect(result).toEqual(permissionDeniedResponse);
      expect(result.success).toBe(false);
      expect(result.message).toContain('Permission denied');

      console.log('Permission denied handled correctly');
    });
  });
});
