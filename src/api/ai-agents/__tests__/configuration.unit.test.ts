/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { configuration } from '..';
import { requestDatalayerAPI } from '../../DatalayerApi';
import { MOCK_JWT_TOKEN } from '../../../__tests__/shared/test-constants';

vi.mock('../../DatalayerApi', () => ({
  requestDatalayerAPI: vi.fn(),
}));

const BASE = 'https://prod1.datalayer.run';
const PREFIX = '/api/ai-agents/v1';

describe('AI Agents Configuration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should get frontend config without MCP params', async () => {
    vi.mocked(requestDatalayerAPI).mockResolvedValue({
      models: [],
      default_model: '',
    });

    await configuration.getFrontendConfig(MOCK_JWT_TOKEN);

    expect(requestDatalayerAPI).toHaveBeenCalledWith({
      url: `${BASE}${PREFIX}/configure`,
      method: 'GET',
      token: MOCK_JWT_TOKEN,
    });
  });

  it('should get frontend config with MCP params', async () => {
    vi.mocked(requestDatalayerAPI).mockResolvedValue({ models: [] });

    await configuration.getFrontendConfig(
      MOCK_JWT_TOKEN,
      'http://mcp:9000',
      'mcp-tok',
    );

    expect(requestDatalayerAPI).toHaveBeenCalledWith({
      url: `${BASE}${PREFIX}/configure?mcp_url=http%3A%2F%2Fmcp%3A9000&mcp_token=mcp-tok`,
      method: 'GET',
      token: MOCK_JWT_TOKEN,
    });
  });

  it('should get agent creation spec', async () => {
    vi.mocked(requestDatalayerAPI).mockResolvedValue({ id: 'ag1' });

    await configuration.getAgentCreationSpec(MOCK_JWT_TOKEN, 'ag1');

    expect(requestDatalayerAPI).toHaveBeenCalledWith({
      url: `${BASE}${PREFIX}/configure/agents/${encodeURIComponent('ag1')}/spec`,
      method: 'GET',
      token: MOCK_JWT_TOKEN,
    });
  });

  it('should get MCP toolsets status', async () => {
    vi.mocked(requestDatalayerAPI).mockResolvedValue({ initialized: true });

    await configuration.getMCPToolsetsStatus(MOCK_JWT_TOKEN);

    expect(requestDatalayerAPI).toHaveBeenCalledWith({
      url: `${BASE}${PREFIX}/configure/mcp-toolsets-status`,
      method: 'GET',
      token: MOCK_JWT_TOKEN,
    });
  });
});
