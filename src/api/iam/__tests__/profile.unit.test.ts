/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { profile } from '..';
import { requestDatalayerAPI } from '../../DatalayerApi';
import { MOCK_JWT_TOKEN } from '../../../__tests__/shared/test-constants';

vi.mock('../../DatalayerApi');

describe('IAM Profile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should get user profile', async () => {
    const mockResponse = {
      success: true,
      user: { id: 'user-123', email: 'test@example.com' },
    };
    vi.mocked(requestDatalayerAPI).mockResolvedValue(mockResponse);

    const result = await profile.me(MOCK_JWT_TOKEN);

    expect(result).toEqual(mockResponse);
  });

  it('should handle errors', async () => {
    vi.mocked(requestDatalayerAPI).mockRejectedValue(
      new Error('Network error'),
    );

    await expect(profile.me(MOCK_JWT_TOKEN)).rejects.toThrow('Network error');
  });
});
