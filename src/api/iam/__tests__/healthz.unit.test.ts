/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ping } from '../healthz';
import { requestDatalayerAPI } from '../../DatalayerApi';

// Mock the DatalayerAPI module
vi.mock('../../DatalayerApi');

describe('IAM Healthz Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('ping', () => {
    it('should return health status on successful health check', async () => {
      const mockResponse = {
        success: true,
        message: 'datalayer_iam is up and running.',
        status: { status: 'OK' },
        version: '1.0.7',
      };
      vi.mocked(requestDatalayerAPI).mockResolvedValueOnce(mockResponse);

      const result = await ping();

      expect(result).toEqual(mockResponse);
      expect(requestDatalayerAPI).toHaveBeenCalledWith({
        url: 'https://prod1.datalayer.run/api/iam/v1/ping',
        method: 'GET',
      });
    });

    it('should use custom base URL when provided', async () => {
      const mockResponse = {
        success: true,
        message: 'Service is healthy',
        status: { status: 'OK' },
        version: '2.0.0',
      };
      const customUrl = 'https://custom.example.com';
      vi.mocked(requestDatalayerAPI).mockResolvedValueOnce(mockResponse);

      const result = await ping(customUrl);

      expect(result).toEqual(mockResponse);
      expect(requestDatalayerAPI).toHaveBeenCalledWith({
        url: `${customUrl}/api/iam/v1/ping`,
        method: 'GET',
      });
    });

    it('should throw error with status code on failure', async () => {
      const mockError = {
        response: { status: 500 },
        message: 'Internal Server Error',
      };
      vi.mocked(requestDatalayerAPI).mockRejectedValueOnce(mockError);

      await expect(ping()).rejects.toThrow(
        'Health check failed: Service unhealthy (status 500) - Internal Server Error',
      );
    });

    it('should throw generic error on network failure', async () => {
      const mockError = new Error('Network error');
      vi.mocked(requestDatalayerAPI).mockRejectedValueOnce(mockError);

      await expect(ping()).rejects.toThrow(
        'Health check failed: Network error',
      );
    });
  });
});
