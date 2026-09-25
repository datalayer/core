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

  it('searches the people a caller may name', async () => {
    vi.mocked(requestDatalayerAPI).mockResolvedValue({
      success: true,
      data: { users: [] },
    });

    await profile.searchPrincipals(
      MOCK_JWT_TOKEN,
      'gra',
      ['user'],
      'https://iam.example',
    );

    expect(vi.mocked(requestDatalayerAPI)).toHaveBeenCalledWith({
      url: 'https://iam.example/api/iam/v1/principals/search',
      method: 'POST',
      body: { query: 'gra', principalTypes: ['user'] },
      token: MOCK_JWT_TOKEN,
    });
  });

  it('names a person found by their name, or else by nothing', () => {
    expect(
      profile.personOfPrincipalUser({
        uid: 'u-1',
        handle_s: 'grace',
        first_name_t: 'Grace',
        last_name_t: 'Hopper',
      }),
    ).toEqual({ uid: 'u-1', handle: 'grace', name: 'Grace Hopper' });
    expect(
      profile.personOfPrincipalUser({ uid: 'u-2', handle_s: 'alan' }),
    ).toEqual({ uid: 'u-2', handle: 'alan', name: null });
  });
});
