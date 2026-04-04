/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { library } from '..';
import { requestDatalayerAPI } from '../../DatalayerApi';
import { MOCK_JWT_TOKEN } from '../../../__tests__/shared/test-constants';

vi.mock('../../DatalayerApi', () => ({
  requestDatalayerAPI: vi.fn(),
}));

const BASE = 'https://prod1.datalayer.run';
const PREFIX = '/api/ai-agents/v1';

describe('AI Agents Library', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should list agent specs', async () => {
    const mock = [{ id: 'data-acquisition', name: 'Data Acquisition' }];
    vi.mocked(requestDatalayerAPI).mockResolvedValue(mock);

    const result = await library.listAgentSpecs(MOCK_JWT_TOKEN);

    expect(result).toEqual(mock);
    expect(requestDatalayerAPI).toHaveBeenCalledWith({
      url: `${BASE}${PREFIX}/agents/library`,
      method: 'GET',
      token: MOCK_JWT_TOKEN,
    });
  });

  it('should get agent spec with encoded ID', async () => {
    vi.mocked(requestDatalayerAPI).mockResolvedValue({ id: 'my/spec' });

    await library.getAgentSpec(MOCK_JWT_TOKEN, 'my/spec');

    expect(requestDatalayerAPI).toHaveBeenCalledWith({
      url: `${BASE}${PREFIX}/agents/library/${encodeURIComponent('my/spec')}`,
      method: 'GET',
      token: MOCK_JWT_TOKEN,
    });
  });
});
