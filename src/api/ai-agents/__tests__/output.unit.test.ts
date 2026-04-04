/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { output } from '..';
import { requestDatalayerAPI } from '../../DatalayerApi';
import { MOCK_JWT_TOKEN } from '../../../__tests__/shared/test-constants';

vi.mock('../../DatalayerApi', () => ({
  requestDatalayerAPI: vi.fn(),
}));

const BASE = 'https://prod1.datalayer.run';
const PREFIX = '/api/ai-agents/v1';

describe('AI Agents Output', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should list agent outputs', async () => {
    vi.mocked(requestDatalayerAPI).mockResolvedValue([]);

    await output.listAgentOutputs(MOCK_JWT_TOKEN, 'ag1');

    expect(requestDatalayerAPI).toHaveBeenCalledWith({
      url: `${BASE}${PREFIX}/agents/${encodeURIComponent('ag1')}/output`,
      method: 'GET',
      token: MOCK_JWT_TOKEN,
    });
  });

  it('should get agent output', async () => {
    vi.mocked(requestDatalayerAPI).mockResolvedValue({ id: 'art1' });

    await output.getAgentOutput(MOCK_JWT_TOKEN, 'ag1', 'art1');

    expect(requestDatalayerAPI).toHaveBeenCalledWith({
      url: `${BASE}${PREFIX}/agents/${encodeURIComponent('ag1')}/output/${encodeURIComponent('art1')}`,
      method: 'GET',
      token: MOCK_JWT_TOKEN,
    });
  });

  it('should generate agent output', async () => {
    vi.mocked(requestDatalayerAPI).mockResolvedValue({ id: 'new' });

    await output.generateAgentOutput(MOCK_JWT_TOKEN, 'ag1', 'pdf', {
      include_charts: true,
    });

    expect(requestDatalayerAPI).toHaveBeenCalledWith({
      url: `${BASE}${PREFIX}/agents/${encodeURIComponent('ag1')}/output/generate`,
      method: 'POST',
      token: MOCK_JWT_TOKEN,
      body: { format: 'pdf', include_charts: true },
    });
  });
});
