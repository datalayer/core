/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { lexicals } from '..';
import * as DatalayerApi from '../../DatalayerApi';
import { API_BASE_PATHS, DEFAULT_SERVICE_URLS } from '../../constants';
import { MOCK_JWT_TOKEN } from '../../../__tests__/shared/test-constants';

// Mock the DatalayerApi module
vi.mock('../../DatalayerApi', () => ({
  requestDatalayerAPI: vi.fn(),
}));

describe('Spacer Lexicals Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('create', () => {
    const mockCreateResponse = {
      success: true,
      message: 'Document created successfully',
      document: {
        id: 'lexical-123',
        uid: 'uid-lexical-123',
        name: 'Test Document',
        content: {},
        space_id: 'space-456',
        owner_id: 'user-789',
        created_at: '2024-01-01T00:00:00Z',
      },
    };

    it('should successfully create a lexical document with FormData', async () => {
      console.log('Testing lexical document creation with FormData...');

      const mockedRequest = vi.mocked(DatalayerApi.requestDatalayerAPI);
      mockedRequest.mockResolvedValue(mockCreateResponse);

      const lexicalData = {
        spaceId: 'space-456',
        documentType: 'lexical',
        name: 'Test Document',
        description: 'A test document',
      };

      const result = await lexicals.createLexical(
        DEFAULT_SERVICE_URLS.SPACER,
        MOCK_JWT_TOKEN,
        lexicalData,
      );

      expect(mockedRequest).toHaveBeenCalledTimes(1);
      expect(mockedRequest).toHaveBeenCalledWith({
        url: `${DEFAULT_SERVICE_URLS.SPACER}${API_BASE_PATHS.SPACER}/lexicals`,
        method: 'POST',
        token: MOCK_JWT_TOKEN,
        body: lexicalData,
      });

      expect(result).toEqual(mockCreateResponse);
      expect(result.success).toBe(true);
      expect(result.document.name).toBe('Test Document');

      console.log('Document created successfully');
    });

    it('should handle FormData with file attachment', async () => {
      console.log('Testing lexical document creation with file...');

      const mockedRequest = vi.mocked(DatalayerApi.requestDatalayerAPI);
      mockedRequest.mockResolvedValue(mockCreateResponse);

      const lexicalData = {
        spaceId: 'space-456',
        documentType: 'lexical',
        name: 'Test Document',
        description: 'A test document with file',
      };

      await lexicals.createLexical(
        DEFAULT_SERVICE_URLS.SPACER,
        MOCK_JWT_TOKEN,
        lexicalData,
      );

      expect(mockedRequest).toHaveBeenCalledWith({
        url: `${DEFAULT_SERVICE_URLS.SPACER}${API_BASE_PATHS.SPACER}/lexicals`,
        method: 'POST',
        token: MOCK_JWT_TOKEN,
        body: lexicalData,
      });

      console.log('Document with file created successfully');
    });

    it('should handle different document types', async () => {
      console.log('Testing lexical document with different type...');

      const mockedRequest = vi.mocked(DatalayerApi.requestDatalayerAPI);
      mockedRequest.mockResolvedValue(mockCreateResponse);

      const lexicalData = {
        spaceId: 'space-456',
        documentType: 'markdown',
        name: 'Markdown Document',
        description: 'A markdown document',
      };

      await lexicals.createLexical(
        DEFAULT_SERVICE_URLS.SPACER,
        MOCK_JWT_TOKEN,
        lexicalData,
      );

      expect(mockedRequest).toHaveBeenCalledWith({
        url: `${DEFAULT_SERVICE_URLS.SPACER}${API_BASE_PATHS.SPACER}/lexicals`,
        method: 'POST',
        token: MOCK_JWT_TOKEN,
        body: lexicalData,
      });

      console.log('Document with different type created successfully');
    });

    it('should handle API errors during creation', async () => {
      console.log('Testing lexical document creation with API error...');

      const mockedRequest = vi.mocked(DatalayerApi.requestDatalayerAPI);
      mockedRequest.mockRejectedValue(new Error('API Error'));

      const lexicalData = {
        spaceId: 'space-456',
        documentType: 'lexical',
        name: 'Test Document',
        description: 'A test document',
      };

      await expect(
        lexicals.createLexical(
          DEFAULT_SERVICE_URLS.SPACER,
          MOCK_JWT_TOKEN,
          lexicalData,
        ),
      ).rejects.toThrow('API Error');

      console.log('API error handled correctly');
    });

    it('should use custom base URL when provided', async () => {
      console.log('Testing lexical document creation with custom base URL...');

      const customUrl = 'https://custom.spacer.api';
      const mockedRequest = vi.mocked(DatalayerApi.requestDatalayerAPI);
      mockedRequest.mockResolvedValue(mockCreateResponse);

      const lexicalData = {
        spaceId: 'space-456',
        documentType: 'lexical',
        name: 'Test Document',
        description: 'A test document',
      };

      await lexicals.createLexical(customUrl, MOCK_JWT_TOKEN, lexicalData);

      expect(mockedRequest).toHaveBeenCalledWith({
        url: `${customUrl}${API_BASE_PATHS.SPACER}/lexicals`,
        method: 'POST',
        token: MOCK_JWT_TOKEN,
        body: lexicalData,
      });

      console.log('Custom base URL used correctly');
    });

    it('should handle server validation errors', async () => {
      console.log('Testing lexical document creation with validation error...');

      const validationErrorResponse = {
        success: false,
        message: 'Validation failed',
        errors: ['Invalid space ID', 'Document type not supported'],
      };

      const mockedRequest = vi.mocked(DatalayerApi.requestDatalayerAPI);
      mockedRequest.mockResolvedValue(validationErrorResponse);

      const lexicalData = {
        spaceId: 'invalid-space',
        documentType: 'unknown',
        name: 'Test Document',
        description: 'A test document',
      };

      const result = await lexicals.createLexical(
        DEFAULT_SERVICE_URLS.SPACER,
        MOCK_JWT_TOKEN,
        lexicalData,
      );

      expect(result).toEqual(validationErrorResponse);
      expect(result.success).toBe(false);
      expect(result.message).toBe('Validation failed');

      console.log('Validation error handled correctly');
    });
  });

  describe('get', () => {
    const mockGetResponse = {
      success: true,
      message: 'Document retrieved successfully',
      document: {
        id: 'lexical-123',
        uid: 'uid-lexical-123',
        name: 'Test Document',
        content: {
          root: {
            type: 'root',
            children: [
              {
                type: 'paragraph',
                children: [{ type: 'text', text: 'Test content' }],
              },
            ],
          },
        },
        space_id: 'space-456',
        owner_id: 'user-789',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
      },
    };

    it('should successfully get a lexical document by ID', async () => {
      console.log('Testing get lexical document by ID...');

      const mockedRequest = vi.mocked(DatalayerApi.requestDatalayerAPI);
      mockedRequest.mockResolvedValue(mockGetResponse);

      const result = await lexicals.getLexical(
        DEFAULT_SERVICE_URLS.SPACER,
        MOCK_JWT_TOKEN,
        'lexical-123',
      );

      expect(mockedRequest).toHaveBeenCalledTimes(1);
      expect(mockedRequest).toHaveBeenCalledWith({
        url: `${DEFAULT_SERVICE_URLS.SPACER}${API_BASE_PATHS.SPACER}/lexicals/lexical-123`,
        method: 'GET',
        token: MOCK_JWT_TOKEN,
      });

      expect(result).toEqual(mockGetResponse);
      expect(result.success).toBe(true);
      expect(result.document?.id).toBe('lexical-123');

      console.log('Document retrieved successfully');
    });

    it('should handle document not found (404)', async () => {
      console.log('Testing get document with 404...');

      const notFoundResponse = {
        success: false,
        message: 'Document not found',
      };

      const mockedRequest = vi.mocked(DatalayerApi.requestDatalayerAPI);
      mockedRequest.mockResolvedValue(notFoundResponse);

      const result = await lexicals.getLexical(
        DEFAULT_SERVICE_URLS.SPACER,
        MOCK_JWT_TOKEN,
        'nonexistent-document',
      );

      expect(result).toEqual(notFoundResponse);
      expect(result.success).toBe(false);
      expect(result.document).toBeUndefined();

      console.log('404 response handled correctly');
    });

    it('should handle API errors during get', async () => {
      console.log('Testing get document with API error...');

      const mockedRequest = vi.mocked(DatalayerApi.requestDatalayerAPI);
      mockedRequest.mockRejectedValue(new Error('Network error'));

      await expect(
        lexicals.getLexical(
          DEFAULT_SERVICE_URLS.SPACER,
          MOCK_JWT_TOKEN,
          'lexical-123',
        ),
      ).rejects.toThrow('Network error');

      console.log('API error handled correctly');
    });

    it('should use custom base URL when provided', async () => {
      console.log('Testing get document with custom base URL...');

      const customUrl = 'https://custom.spacer.api';
      const mockedRequest = vi.mocked(DatalayerApi.requestDatalayerAPI);
      mockedRequest.mockResolvedValue(mockGetResponse);

      await lexicals.getLexical(customUrl, MOCK_JWT_TOKEN, 'lexical-123');

      expect(mockedRequest).toHaveBeenCalledWith({
        url: `${customUrl}${API_BASE_PATHS.SPACER}/lexicals/lexical-123`,
        method: 'GET',
        token: MOCK_JWT_TOKEN,
      });

      console.log('Custom base URL used correctly');
    });
  });

  describe('update', () => {
    const mockUpdateResponse = {
      success: true,
      message: 'Document updated successfully',
      document: {
        id: 'lexical-123',
        uid: 'uid-lexical-123',
        name: 'Updated Document',
        content: {},
        space_id: 'space-456',
        owner_id: 'user-789',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-03T00:00:00Z',
      },
    };

    it('should successfully update a document name', async () => {
      console.log('Testing update document name...');

      const mockedRequest = vi.mocked(DatalayerApi.requestDatalayerAPI);
      mockedRequest.mockResolvedValue(mockUpdateResponse);

      const updateData = {
        name: 'Updated Document',
      };

      const result = await lexicals.updateLexical(
        DEFAULT_SERVICE_URLS.SPACER,
        MOCK_JWT_TOKEN,
        'lexical-123',
        updateData,
      );

      expect(mockedRequest).toHaveBeenCalledTimes(1);
      expect(mockedRequest).toHaveBeenCalledWith({
        url: `${DEFAULT_SERVICE_URLS.SPACER}${API_BASE_PATHS.SPACER}/lexicals/lexical-123`,
        method: 'PUT',
        token: MOCK_JWT_TOKEN,
        body: updateData,
      });

      expect(result).toEqual(mockUpdateResponse);
      expect(result.success).toBe(true);
      expect(result.document.name).toBe('Updated Document');

      console.log('Document name updated successfully');
    });

    it('should successfully update a document description', async () => {
      console.log('Testing update document description...');

      const mockedRequest = vi.mocked(DatalayerApi.requestDatalayerAPI);
      mockedRequest.mockResolvedValue(mockUpdateResponse);

      const updateData = {
        description: 'Updated description',
      };

      const result = await lexicals.updateLexical(
        DEFAULT_SERVICE_URLS.SPACER,
        MOCK_JWT_TOKEN,
        'lexical-123',
        updateData,
      );

      expect(mockedRequest).toHaveBeenCalledWith({
        url: `${DEFAULT_SERVICE_URLS.SPACER}${API_BASE_PATHS.SPACER}/lexicals/lexical-123`,
        method: 'PUT',
        token: MOCK_JWT_TOKEN,
        body: updateData,
      });

      expect(result.success).toBe(true);

      console.log('Document description updated successfully');
    });

    it('should successfully update both name and description', async () => {
      console.log('Testing update document name and description...');

      const mockedRequest = vi.mocked(DatalayerApi.requestDatalayerAPI);
      mockedRequest.mockResolvedValue(mockUpdateResponse);

      const updateData = {
        name: 'Updated Document',
        description: 'Updated description',
      };

      const result = await lexicals.updateLexical(
        DEFAULT_SERVICE_URLS.SPACER,
        MOCK_JWT_TOKEN,
        'lexical-123',
        updateData,
      );

      expect(mockedRequest).toHaveBeenCalledWith({
        url: `${DEFAULT_SERVICE_URLS.SPACER}${API_BASE_PATHS.SPACER}/lexicals/lexical-123`,
        method: 'PUT',
        token: MOCK_JWT_TOKEN,
        body: updateData,
      });

      expect(result.success).toBe(true);

      console.log('Document name and description updated successfully');
    });

    it('should handle API errors during update', async () => {
      console.log('Testing update document with API error...');

      const mockedRequest = vi.mocked(DatalayerApi.requestDatalayerAPI);
      mockedRequest.mockRejectedValue(new Error('Update failed'));

      const updateData = {
        name: 'Updated Document',
      };

      await expect(
        lexicals.updateLexical(
          DEFAULT_SERVICE_URLS.SPACER,
          MOCK_JWT_TOKEN,
          'lexical-123',
          updateData,
        ),
      ).rejects.toThrow('Update failed');

      console.log('API error handled correctly');
    });

    it('should use custom base URL when provided', async () => {
      console.log('Testing update document with custom base URL...');

      const customUrl = 'https://custom.spacer.api';
      const mockedRequest = vi.mocked(DatalayerApi.requestDatalayerAPI);
      mockedRequest.mockResolvedValue(mockUpdateResponse);

      const updateData = {
        name: 'Updated Document',
      };

      await lexicals.updateLexical(
        customUrl,
        MOCK_JWT_TOKEN,
        'lexical-123',
        updateData,
      );

      expect(mockedRequest).toHaveBeenCalledWith({
        url: `${customUrl}${API_BASE_PATHS.SPACER}/lexicals/lexical-123`,
        method: 'PUT',
        token: MOCK_JWT_TOKEN,
        body: updateData,
      });

      console.log('Custom base URL used correctly');
    });
  });
});
