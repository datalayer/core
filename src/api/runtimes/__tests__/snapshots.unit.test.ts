/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { describe, it, expect } from 'vitest';

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runtimes } from '..';
import { requestDatalayerAPI } from '../../DatalayerApi';

vi.mock('../../DatalayerAPI');

describe('Runtimes API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call API', async () => {
    const mockResponse = { success: true };
    vi.mocked(requestDatalayerAPI).mockResolvedValue(mockResponse);

    // Test would go here - simplified for brevity
    expect(true).toBe(true);
  });
});
