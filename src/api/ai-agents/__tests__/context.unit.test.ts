/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { context } from '..';
import { requestDatalayerAPI } from '../../DatalayerApi';
import { MOCK_JWT_TOKEN } from '../../../__tests__/shared/test-constants';

vi.mock('../../DatalayerApi', () => ({
  requestDatalayerAPI: vi.fn(),
}));

const BASE = 'https://prod1.datalayer.run';
const PREFIX = '/api/ai-agents/v1';
const AGENT = 'test-agent';
const ENC_AGENT = encodeURIComponent(AGENT);

describe('AI Agents Context', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should get context details', async () => {
    vi.mocked(requestDatalayerAPI).mockResolvedValue({});

    await context.getContextDetails(MOCK_JWT_TOKEN, AGENT);

    expect(requestDatalayerAPI).toHaveBeenCalledWith({
      url: `${BASE}${PREFIX}/configure/agents/${ENC_AGENT}/context-details`,
      method: 'GET',
      token: MOCK_JWT_TOKEN,
    });
  });

  it('should get context snapshot', async () => {
    vi.mocked(requestDatalayerAPI).mockResolvedValue({ totalTokens: 500 });

    await context.getContextSnapshot(MOCK_JWT_TOKEN, AGENT);

    expect(requestDatalayerAPI).toHaveBeenCalledWith({
      url: `${BASE}${PREFIX}/configure/agents/${ENC_AGENT}/context-snapshot`,
      method: 'GET',
      token: MOCK_JWT_TOKEN,
    });
  });

  it('should get context table', async () => {
    vi.mocked(requestDatalayerAPI).mockResolvedValue({ table: '...' });

    await context.getContextTable(MOCK_JWT_TOKEN, AGENT, false);

    expect(requestDatalayerAPI).toHaveBeenCalledWith({
      url: `${BASE}${PREFIX}/configure/agents/${ENC_AGENT}/context-table?show_context=false`,
      method: 'GET',
      token: MOCK_JWT_TOKEN,
    });
  });

  it('should get full context', async () => {
    vi.mocked(requestDatalayerAPI).mockResolvedValue({});

    await context.getFullContext(MOCK_JWT_TOKEN, AGENT);

    expect(requestDatalayerAPI).toHaveBeenCalledWith({
      url: `${BASE}${PREFIX}/configure/agents/${ENC_AGENT}/full-context`,
      method: 'GET',
      token: MOCK_JWT_TOKEN,
    });
  });

  it('should export context CSV', async () => {
    vi.mocked(requestDatalayerAPI).mockResolvedValue({
      csv: 'a,b',
      filename: 'f.csv',
      stepsCount: 1,
    });

    const result = await context.exportContextCSV(MOCK_JWT_TOKEN, AGENT);

    expect(result.csv).toBe('a,b');
    expect(requestDatalayerAPI).toHaveBeenCalledWith({
      url: `${BASE}${PREFIX}/configure/agents/${ENC_AGENT}/context-export`,
      method: 'GET',
      token: MOCK_JWT_TOKEN,
    });
  });

  it('should reset context', async () => {
    vi.mocked(requestDatalayerAPI).mockResolvedValue({ status: 'ok' });

    await context.resetContext(MOCK_JWT_TOKEN, AGENT);

    expect(requestDatalayerAPI).toHaveBeenCalledWith({
      url: `${BASE}${PREFIX}/configure/agents/${ENC_AGENT}/context-details/reset`,
      method: 'POST',
      token: MOCK_JWT_TOKEN,
    });
  });
});
