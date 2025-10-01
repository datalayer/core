/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { snapshots } from '..';
import { requestDatalayerAPI } from '../../DatalayerApi';
import { MOCK_JWT_TOKEN } from '../../../__tests__/shared/test-constants';

vi.mock('../../DatalayerApi', () => ({
  requestDatalayerAPI: vi.fn(),
}));

describe('Runtimes Snapshots API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should list snapshots', async () => {
    const mockResponse = {
      success: true,
      snapshots: [{ id: 'snapshot-123' }],
    };
    vi.mocked(requestDatalayerAPI).mockResolvedValue(mockResponse);

    const result = await snapshots.listSnapshots(MOCK_JWT_TOKEN);
    expect(requestDatalayerAPI).toHaveBeenCalled();
    expect(result).toEqual(mockResponse);
  });
});
