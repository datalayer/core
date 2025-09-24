/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { environments } from '..';
import { requestDatalayerAPI } from '../../DatalayerApi';
import {
  MOCK_JWT_TOKEN,
  MOCK_ENVIRONMENTS_RESPONSE,
} from '../../../__tests__/shared/test-constants';

// Mock the DatalayerAPI module
vi.mock('../../DatalayerApi');

describe('Runtimes Environments Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listEnvironments', () => {
    it('should list environments with valid token', async () => {
      vi.mocked(requestDatalayerAPI).mockResolvedValueOnce(
        MOCK_ENVIRONMENTS_RESPONSE,
      );

      const result = await environments.listEnvironments(MOCK_JWT_TOKEN);

      expect(result).toEqual(MOCK_ENVIRONMENTS_RESPONSE);
      expect(requestDatalayerAPI).toHaveBeenCalledWith({
        url: 'https://prod1.datalayer.run/api/runtimes/v1/environments',
        method: 'GET',
        token: MOCK_JWT_TOKEN,
      });
    });

    it('should use custom base URL when provided', async () => {
      const mockResponse = {
        success: true,
        message: 'Environments retrieved',
        environments: [],
      };
      const customUrl = 'https://staging.datalayer.run';
      vi.mocked(requestDatalayerAPI).mockResolvedValueOnce(mockResponse);

      const result = await environments.listEnvironments(
        MOCK_JWT_TOKEN,
        customUrl,
      );

      expect(result).toEqual(mockResponse);
      expect(requestDatalayerAPI).toHaveBeenCalledWith({
        url: `${customUrl}/api/runtimes/v1/environments`,
        method: 'GET',
        token: MOCK_JWT_TOKEN,
      });
    });

    it('should throw error when token is missing', async () => {
      await expect(environments.listEnvironments('')).rejects.toThrow(
        'Authentication token is required',
      );
      expect(requestDatalayerAPI).not.toHaveBeenCalled();
    });

    it('should throw error when token is null', async () => {
      // @ts-expect-error Testing null token
      await expect(environments.listEnvironments(null)).rejects.toThrow(
        'Authentication token is required',
      );
      expect(requestDatalayerAPI).not.toHaveBeenCalled();
    });

    it('should throw error when token is undefined', async () => {
      // @ts-expect-error Testing undefined token
      await expect(environments.listEnvironments(undefined)).rejects.toThrow(
        'Authentication token is required',
      );
      expect(requestDatalayerAPI).not.toHaveBeenCalled();
    });

    it('should throw error when token is only whitespace', async () => {
      await expect(environments.listEnvironments('   ')).rejects.toThrow(
        'Authentication token is required',
      );
      expect(requestDatalayerAPI).not.toHaveBeenCalled();
    });

    it('should handle API errors properly', async () => {
      const mockError = new Error('Network error');
      vi.mocked(requestDatalayerAPI).mockRejectedValueOnce(mockError);

      await expect(
        environments.listEnvironments(MOCK_JWT_TOKEN),
      ).rejects.toThrow('Network error');
    });

    it('should handle empty environments list', async () => {
      const mockResponse = {
        success: true,
        message: 'No environments available',
        environments: [],
      };
      vi.mocked(requestDatalayerAPI).mockResolvedValueOnce(mockResponse);

      const result = await environments.listEnvironments(MOCK_JWT_TOKEN);

      expect(result).toEqual(mockResponse);
      expect(result.environments).toHaveLength(0);
    });
  });
});
