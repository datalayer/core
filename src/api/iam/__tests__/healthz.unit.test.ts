/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ping } from '../healthz';
import { requestDatalayerAPI } from '../../DatalayerApi';

vi.mock('../../DatalayerApi');

describe('IAM Healthz', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return health status', async () => {
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

  it('should use custom base URL', async () => {
    const mockResponse = { success: true, message: 'Service is healthy' };
    const customUrl = 'https://custom.example.com';
    vi.mocked(requestDatalayerAPI).mockResolvedValueOnce(mockResponse);

    await ping(customUrl);

    expect(requestDatalayerAPI).toHaveBeenCalledWith({
      url: `${customUrl}/api/iam/v1/ping`,
      method: 'GET',
    });
  });

  it('should throw error on failure', async () => {
    const mockError = {
      response: { status: 500 },
      message: 'Internal Server Error',
    };
    vi.mocked(requestDatalayerAPI).mockRejectedValueOnce(mockError);

    await expect(ping()).rejects.toThrow();
  });
});
