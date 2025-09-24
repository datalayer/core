/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { healthz } from '..';
import { requestDatalayerAPI } from '../../DatalayerApi';

// Mock the DatalayerAPI module
vi.mock('../../DatalayerApi');

describe('Runtimes Healthz Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('ping', () => {
    it('should successfully ping the service', async () => {
      const mockResponse = {
        success: true,
        message: 'Runtimes service is healthy',
        status: {
          status: 'OK',
        },
        version: '1.0.0',
      };

      vi.mocked(requestDatalayerAPI).mockResolvedValueOnce(mockResponse);

      const result = await healthz.ping('https://test.datalayer.run');

      expect(result).toEqual(mockResponse);
      expect(requestDatalayerAPI).toHaveBeenCalledWith({
        url: 'https://test.datalayer.run/api/runtimes/v1/ping',
        method: 'GET',
      });
    });

    it('should use default URL when not provided', async () => {
      const mockResponse = {
        success: true,
        message: 'Service is healthy',
      };

      vi.mocked(requestDatalayerAPI).mockResolvedValueOnce(mockResponse);

      const result = await healthz.ping();

      expect(result).toEqual(mockResponse);
      expect(requestDatalayerAPI).toHaveBeenCalledWith({
        url: 'https://prod1.datalayer.run/api/runtimes/v1/ping',
        method: 'GET',
      });
    });

    it('should handle service unhealthy errors', async () => {
      const mockError = new Error('Service error');
      (mockError as any).response = { status: 500 };
      vi.mocked(requestDatalayerAPI).mockRejectedValueOnce(mockError);

      await expect(healthz.ping()).rejects.toThrow(
        'Health check failed: Service unhealthy (status 500)',
      );
    });

    it('should handle network errors', async () => {
      const mockError = new Error('Network error');
      vi.mocked(requestDatalayerAPI).mockRejectedValueOnce(mockError);

      await expect(healthz.ping()).rejects.toThrow(
        'Health check failed: Network error',
      );
    });
  });
});
