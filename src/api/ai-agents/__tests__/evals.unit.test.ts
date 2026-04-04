/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { evals } from '..';
import { requestDatalayerAPI } from '../../DatalayerApi';
import { MOCK_JWT_TOKEN } from '../../../__tests__/shared/test-constants';

vi.mock('../../DatalayerApi', () => ({
  requestDatalayerAPI: vi.fn(),
}));

const BASE = 'https://prod1.datalayer.run';
const PREFIX = '/api/ai-agents/v1';

describe('AI Agents Evals', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should run evals', async () => {
    const request = { eval_ids: ['accuracy'] };
    vi.mocked(requestDatalayerAPI).mockResolvedValue({ score: 0.95 });

    await evals.runEvals(MOCK_JWT_TOKEN, 'ag1', request);

    expect(requestDatalayerAPI).toHaveBeenCalledWith({
      url: `${BASE}${PREFIX}/agents/${encodeURIComponent('ag1')}/evals/run`,
      method: 'POST',
      token: MOCK_JWT_TOKEN,
      body: request,
    });
  });

  it('should list evals', async () => {
    vi.mocked(requestDatalayerAPI).mockResolvedValue([]);

    await evals.listEvals(MOCK_JWT_TOKEN, 'ag1');

    expect(requestDatalayerAPI).toHaveBeenCalledWith({
      url: `${BASE}${PREFIX}/agents/${encodeURIComponent('ag1')}/evals`,
      method: 'GET',
      token: MOCK_JWT_TOKEN,
    });
  });

  it('should get eval', async () => {
    vi.mocked(requestDatalayerAPI).mockResolvedValue({ id: 'e1' });

    await evals.getEval(MOCK_JWT_TOKEN, 'ag1', 'e1');

    expect(requestDatalayerAPI).toHaveBeenCalledWith({
      url: `${BASE}${PREFIX}/agents/${encodeURIComponent('ag1')}/evals/${encodeURIComponent('e1')}`,
      method: 'GET',
      token: MOCK_JWT_TOKEN,
    });
  });
});
