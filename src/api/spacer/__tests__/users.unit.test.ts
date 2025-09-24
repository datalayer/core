/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { users } from '..';
import * as DatalayerApi from '../../DatalayerApi';
import { API_BASE_PATHS, DEFAULT_SERVICE_URLS } from '../../constants';
import { MOCK_JWT_TOKEN } from '../../../__tests__/shared/test-constants';

// Mock the DatalayerApi module
vi.mock('../../DatalayerApi', () => ({
  requestDatalayerAPI: vi.fn(),
}));

describe('Spacer Users Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getMySpaces', () => {
    const mockSpacesResponse = {
      success: true,
      message: 'Spaces retrieved successfully',
      spaces: [
        {
          id: 'space-1',
          uid: 'uid-space-1',
          name: 'My First Space',
          description: 'A test space',
          owner_id: 'user-123',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z',
        },
        {
          id: 'space-2',
          uid: 'uid-space-2',
          name: 'My Second Space',
          description: 'Another test space',
          owner_id: 'user-123',
          created_at: '2024-01-03T00:00:00Z',
          updated_at: '2024-01-04T00:00:00Z',
        },
      ],
    };

    it('should successfully get user spaces', async () => {
      console.log('Testing getMySpaces with valid token...');

      const mockedRequest = vi.mocked(DatalayerApi.requestDatalayerAPI);
      mockedRequest.mockResolvedValue(mockSpacesResponse);

      const result = await users.getMySpaces(MOCK_JWT_TOKEN);

      expect(mockedRequest).toHaveBeenCalledTimes(1);
      expect(mockedRequest).toHaveBeenCalledWith({
        url: `${DEFAULT_SERVICE_URLS.SPACER}${API_BASE_PATHS.SPACER}/spaces/users/me`,
        method: 'GET',
        token: MOCK_JWT_TOKEN,
      });

      expect(result).toEqual(mockSpacesResponse);
      expect(result.spaces).toHaveLength(2);

      console.log('Successfully retrieved user spaces');
    });

    it('should use custom base URL when provided', async () => {
      console.log('Testing getMySpaces with custom base URL...');

      const customUrl = 'https://custom.spacer.api';
      const mockedRequest = vi.mocked(DatalayerApi.requestDatalayerAPI);
      mockedRequest.mockResolvedValue(mockSpacesResponse);

      await users.getMySpaces(MOCK_JWT_TOKEN, customUrl);

      expect(mockedRequest).toHaveBeenCalledWith({
        url: `${customUrl}${API_BASE_PATHS.SPACER}/spaces/users/me`,
        method: 'GET',
        token: MOCK_JWT_TOKEN,
      });

      console.log('Custom base URL used correctly');
    });

    it('should handle empty spaces list', async () => {
      console.log('Testing getMySpaces with empty response...');

      const emptyResponse = {
        success: true,
        message: 'No spaces found for user',
        spaces: [],
      };

      const mockedRequest = vi.mocked(DatalayerApi.requestDatalayerAPI);
      mockedRequest.mockResolvedValue(emptyResponse);

      const result = await users.getMySpaces(MOCK_JWT_TOKEN);

      expect(result).toEqual(emptyResponse);
      expect(result.spaces).toHaveLength(0);

      console.log('Empty spaces list handled correctly');
    });

    it('should fail when token is missing', async () => {
      console.log('Testing getMySpaces with missing token...');

      await expect(
        // @ts-expect-error Testing undefined token
        users.getMySpaces(undefined),
      ).rejects.toThrow('Authentication token is required');

      console.log('Correctly rejected missing token');
    });

    it('should fail when token is empty', async () => {
      console.log('Testing getMySpaces with empty token...');

      await expect(users.getMySpaces('')).rejects.toThrow(
        'Authentication token is required',
      );

      console.log('Correctly rejected empty token');
    });

    it('should fail when token is only whitespace', async () => {
      console.log('Testing getMySpaces with whitespace token...');

      await expect(users.getMySpaces('   ')).rejects.toThrow(
        'Authentication token is required',
      );

      console.log('Correctly rejected whitespace token');
    });

    it('should fail when token is null', async () => {
      console.log('Testing getMySpaces with null token...');

      await expect(
        // @ts-expect-error Testing null token
        users.getMySpaces(null),
      ).rejects.toThrow('Authentication token is required');

      console.log('Correctly rejected null token');
    });

    it('should handle API errors gracefully', async () => {
      console.log('Testing getMySpaces with API error...');

      const mockedRequest = vi.mocked(DatalayerApi.requestDatalayerAPI);
      mockedRequest.mockRejectedValue(new Error('Network error'));

      await expect(users.getMySpaces(MOCK_JWT_TOKEN)).rejects.toThrow(
        'Network error',
      );

      console.log('API error handled correctly');
    });

    it('should handle malformed response', async () => {
      console.log('Testing getMySpaces with malformed response...');

      const malformedResponse = {
        success: false,
        message: 'Invalid response format',
        // spaces array is missing
      };

      const mockedRequest = vi.mocked(DatalayerApi.requestDatalayerAPI);
      mockedRequest.mockResolvedValue(malformedResponse);

      const result = await users.getMySpaces(MOCK_JWT_TOKEN);

      expect(result).toEqual(malformedResponse);
      // Should not throw, but spaces will be undefined
      expect(result.spaces).toBeUndefined();

      console.log('Malformed response handled gracefully');
    });
  });
});
