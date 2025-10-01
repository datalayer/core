/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runtimes } from '..';
import { requestDatalayerAPI } from '../../DatalayerApi';
import { MOCK_JWT_TOKEN } from '../../../__tests__/shared/test-constants';

vi.mock('../../DatalayerApi', () => ({
  requestDatalayerAPI: vi.fn(),
}));

describe('Runtimes API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should list runtimes', async () => {
    const mockResponse = {
      success: true,
      runtimes: [{ pod_name: 'test-runtime' }],
    };
    vi.mocked(requestDatalayerAPI).mockResolvedValue(mockResponse);

    const result = await runtimes.listRuntimes(MOCK_JWT_TOKEN);
    expect(requestDatalayerAPI).toHaveBeenCalled();
    expect(result).toEqual(mockResponse);
  });
});
