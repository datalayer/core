/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { agents } from '..';
import { requestDatalayerAPI } from '../../DatalayerApi';
import { MOCK_JWT_TOKEN } from '../../../__tests__/shared/test-constants';

vi.mock('../../DatalayerApi', () => ({
  requestDatalayerAPI: vi.fn(),
}));

const BASE = 'https://prod1.datalayer.run';
const PREFIX = '/api/ai-agents/v1';

describe('AI Agents CRUD', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should list agents', async () => {
    const mock = { agents: [{ agent_id: 'a1', status: 'ready' }] };
    vi.mocked(requestDatalayerAPI).mockResolvedValue(mock);

    const result = await agents.listAgents(MOCK_JWT_TOKEN);

    expect(result).toEqual(mock);
    expect(requestDatalayerAPI).toHaveBeenCalledWith({
      url: `${BASE}${PREFIX}/agents`,
      method: 'GET',
      token: MOCK_JWT_TOKEN,
    });
  });

  it('should get agent with encoded ID', async () => {
    vi.mocked(requestDatalayerAPI).mockResolvedValue({ agent_id: 'my/agent' });

    await agents.getAgent(MOCK_JWT_TOKEN, 'my/agent');

    expect(requestDatalayerAPI).toHaveBeenCalledWith({
      url: `${BASE}${PREFIX}/agents/${encodeURIComponent('my/agent')}`,
      method: 'GET',
      token: MOCK_JWT_TOKEN,
    });
  });

  it('should create agent with body', async () => {
    const request = { name: 'test', model: 'claude-sonnet-4' };
    vi.mocked(requestDatalayerAPI).mockResolvedValue({
      agent_id: 'new-id',
      status: 'created',
    });

    await agents.createAgent(MOCK_JWT_TOKEN, request);

    expect(requestDatalayerAPI).toHaveBeenCalledWith({
      url: `${BASE}${PREFIX}/agents`,
      method: 'POST',
      body: request,
      token: MOCK_JWT_TOKEN,
    });
  });

  it('should delete agent with encoded ID', async () => {
    vi.mocked(requestDatalayerAPI).mockResolvedValue({ status: 'deleted' });

    await agents.deleteAgent(MOCK_JWT_TOKEN, 'agent-123');

    expect(requestDatalayerAPI).toHaveBeenCalledWith({
      url: `${BASE}${PREFIX}/agents/${encodeURIComponent('agent-123')}`,
      method: 'DELETE',
      token: MOCK_JWT_TOKEN,
    });
  });

  it('should patch agent', async () => {
    const body = { runtime: { ingress: 'http://x', token: 'tok' } };
    vi.mocked(requestDatalayerAPI).mockResolvedValue({});

    await agents.patchAgent(MOCK_JWT_TOKEN, 'ag1', body);

    expect(requestDatalayerAPI).toHaveBeenCalledWith({
      url: `${BASE}${PREFIX}/agents/${encodeURIComponent('ag1')}`,
      method: 'PATCH',
      body,
      token: MOCK_JWT_TOKEN,
    });
  });

  it('should update agent transport', async () => {
    vi.mocked(requestDatalayerAPI).mockResolvedValue({});

    await agents.updateAgentTransport(MOCK_JWT_TOKEN, 'ag1', {
      protocol: 'ag-ui',
    });

    expect(requestDatalayerAPI).toHaveBeenCalledWith({
      url: `${BASE}${PREFIX}/agents/${encodeURIComponent('ag1')}/transport`,
      method: 'PATCH',
      body: { protocol: 'ag-ui' },
      token: MOCK_JWT_TOKEN,
    });
  });

  it('should pause agent', async () => {
    vi.mocked(requestDatalayerAPI).mockResolvedValue(undefined);

    await agents.pauseAgent(MOCK_JWT_TOKEN, 'pod-xyz');

    expect(requestDatalayerAPI).toHaveBeenCalledWith({
      url: `${BASE}${PREFIX}/agents/${encodeURIComponent('pod-xyz')}/pause`,
      method: 'POST',
      token: MOCK_JWT_TOKEN,
    });
  });

  it('should resume agent', async () => {
    vi.mocked(requestDatalayerAPI).mockResolvedValue(undefined);

    await agents.resumeAgent(MOCK_JWT_TOKEN, 'pod-xyz');

    expect(requestDatalayerAPI).toHaveBeenCalledWith({
      url: `${BASE}${PREFIX}/agents/${encodeURIComponent('pod-xyz')}/resume`,
      method: 'POST',
      token: MOCK_JWT_TOKEN,
    });
  });

  it('should get agent checkpoints with optional agentId query', async () => {
    vi.mocked(requestDatalayerAPI).mockResolvedValue([]);

    await agents.getAgentCheckpoints(MOCK_JWT_TOKEN, 'pod-1', 'agent-a');

    expect(requestDatalayerAPI).toHaveBeenCalledWith({
      url: `${BASE}${PREFIX}/agents/${encodeURIComponent('pod-1')}/checkpoints?agent_id=${encodeURIComponent('agent-a')}`,
      method: 'GET',
      token: MOCK_JWT_TOKEN,
    });
  });

  it('should get agent usage', async () => {
    vi.mocked(requestDatalayerAPI).mockResolvedValue({ total_tokens: 1000 });

    await agents.getAgentUsage(MOCK_JWT_TOKEN, 'pod-1');

    expect(requestDatalayerAPI).toHaveBeenCalledWith({
      url: `${BASE}${PREFIX}/agents/${encodeURIComponent('pod-1')}/usage`,
      method: 'GET',
      token: MOCK_JWT_TOKEN,
    });
  });

  it('should get agent context usage', async () => {
    vi.mocked(requestDatalayerAPI).mockResolvedValue({});

    await agents.getAgentContextUsage(MOCK_JWT_TOKEN, 'ag1');

    expect(requestDatalayerAPI).toHaveBeenCalledWith({
      url: `${BASE}${PREFIX}/agents/${encodeURIComponent('ag1')}/context-usage`,
      method: 'GET',
      token: MOCK_JWT_TOKEN,
    });
  });

  it('should get agent cost usage', async () => {
    vi.mocked(requestDatalayerAPI).mockResolvedValue({});

    await agents.getAgentCostUsage(MOCK_JWT_TOKEN, 'ag1');

    expect(requestDatalayerAPI).toHaveBeenCalledWith({
      url: `${BASE}${PREFIX}/agents/${encodeURIComponent('ag1')}/cost-usage`,
      method: 'GET',
      token: MOCK_JWT_TOKEN,
    });
  });

  it('should configure from spec', async () => {
    const spec = { id: 'data-acquisition', model: 'claude-sonnet-4' };
    vi.mocked(requestDatalayerAPI).mockResolvedValue({});

    await agents.configureFromSpec(MOCK_JWT_TOKEN, spec);

    expect(requestDatalayerAPI).toHaveBeenCalledWith({
      url: `${BASE}${PREFIX}/agents/configure-from-spec`,
      method: 'POST',
      body: spec,
      token: MOCK_JWT_TOKEN,
    });
  });

  it('should reject missing token', async () => {
    await expect(agents.listAgents('')).rejects.toThrow();
  });

  it('should reject missing agentId', async () => {
    await expect(agents.getAgent(MOCK_JWT_TOKEN, '')).rejects.toThrow();
  });
});
