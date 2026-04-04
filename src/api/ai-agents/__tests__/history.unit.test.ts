/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { history } from '..';
import { requestDatalayerAPI } from '../../DatalayerApi';
import { MOCK_JWT_TOKEN } from '../../../__tests__/shared/test-constants';

vi.mock('../../DatalayerApi', () => ({
  requestDatalayerAPI: vi.fn(),
}));

const BASE = 'https://prod1.datalayer.run';
const PREFIX = '/api/ai-agents/v1';

describe('AI Agents History', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should get conversation history', async () => {
    vi.mocked(requestDatalayerAPI).mockResolvedValue({ messages: [] });

    await history.getConversationHistory(MOCK_JWT_TOKEN, 'ag1');

    expect(requestDatalayerAPI).toHaveBeenCalledWith({
      url: `${BASE}${PREFIX}/history?agent_id=ag1`,
      method: 'GET',
      token: MOCK_JWT_TOKEN,
    });
  });

  it('should use default agent ID', async () => {
    vi.mocked(requestDatalayerAPI).mockResolvedValue({ messages: [] });

    await history.getConversationHistory(MOCK_JWT_TOKEN);

    expect(requestDatalayerAPI).toHaveBeenCalledWith({
      url: `${BASE}${PREFIX}/history?agent_id=default`,
      method: 'GET',
      token: MOCK_JWT_TOKEN,
    });
  });

  it('should upsert conversation history', async () => {
    const body = {
      agent_id: 'ag1',
      messages: [{ role: 'user' as const, content: 'hello' }],
    };
    vi.mocked(requestDatalayerAPI).mockResolvedValue({});

    await history.upsertConversationHistory(MOCK_JWT_TOKEN, body);

    expect(requestDatalayerAPI).toHaveBeenCalledWith({
      url: `${BASE}${PREFIX}/history`,
      method: 'POST',
      body,
      token: MOCK_JWT_TOKEN,
    });
  });

  it('should clear conversation history', async () => {
    vi.mocked(requestDatalayerAPI).mockResolvedValue({});

    await history.clearConversationHistory(MOCK_JWT_TOKEN, 'ag1');

    expect(requestDatalayerAPI).toHaveBeenCalledWith({
      url: `${BASE}${PREFIX}/history?agent_id=ag1`,
      method: 'DELETE',
      token: MOCK_JWT_TOKEN,
    });
  });
});
