/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { triggers } from '..';
import { requestDatalayerAPI } from '../../DatalayerApi';
import { MOCK_JWT_TOKEN } from '../../../__tests__/shared/test-constants';

vi.mock('../../DatalayerApi', () => ({
  requestDatalayerAPI: vi.fn(),
}));

const BASE = 'https://prod1.datalayer.run';
const PREFIX = '/api/ai-agents/v1';

describe('AI Agents Triggers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should trigger agent run', async () => {
    vi.mocked(requestDatalayerAPI).mockResolvedValue({ status: 'triggered' });

    await triggers.triggerAgentRun(MOCK_JWT_TOKEN, 'ag1', { prompt: 'Go!' });

    expect(requestDatalayerAPI).toHaveBeenCalledWith({
      url: `${BASE}${PREFIX}/agents/${encodeURIComponent('ag1')}/trigger/run`,
      method: 'POST',
      body: { prompt: 'Go!' },
      token: MOCK_JWT_TOKEN,
    });
  });

  it('should get webhook info', async () => {
    vi.mocked(requestDatalayerAPI).mockResolvedValue({
      webhook_url: '/webhook',
    });

    await triggers.getWebhookInfo(MOCK_JWT_TOKEN, 'ag1');

    expect(requestDatalayerAPI).toHaveBeenCalledWith({
      url: `${BASE}${PREFIX}/webhooks/${encodeURIComponent('ag1')}`,
      method: 'GET',
      token: MOCK_JWT_TOKEN,
    });
  });

  it('should fire webhook', async () => {
    const payload = { event: 'ticket_created', data: { id: 123 } };
    vi.mocked(requestDatalayerAPI).mockResolvedValue({ status: 'triggered' });

    await triggers.fireWebhook(MOCK_JWT_TOKEN, 'ag1', payload);

    expect(requestDatalayerAPI).toHaveBeenCalledWith({
      url: `${BASE}${PREFIX}/webhooks/${encodeURIComponent('ag1')}`,
      method: 'POST',
      body: payload,
      token: MOCK_JWT_TOKEN,
    });
  });
});
