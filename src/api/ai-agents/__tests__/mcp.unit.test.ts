/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mcp } from '..';
import { requestDatalayerAPI } from '../../DatalayerApi';
import { MOCK_JWT_TOKEN } from '../../../__tests__/shared/test-constants';

vi.mock('../../DatalayerApi', () => ({
  requestDatalayerAPI: vi.fn(),
}));

const BASE = 'https://prod1.datalayer.run';
const PREFIX = '/api/ai-agents/v1';

describe('AI Agents MCP', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should list MCP catalog', async () => {
    vi.mocked(requestDatalayerAPI).mockResolvedValue([]);

    await mcp.listMCPCatalog(MOCK_JWT_TOKEN);

    expect(requestDatalayerAPI).toHaveBeenCalledWith({
      url: `${BASE}${PREFIX}/mcp/servers/catalog`,
      method: 'GET',
      token: MOCK_JWT_TOKEN,
    });
  });

  it('should list available MCP servers', async () => {
    vi.mocked(requestDatalayerAPI).mockResolvedValue([]);

    await mcp.listAvailableMCPServers(MOCK_JWT_TOKEN);

    expect(requestDatalayerAPI).toHaveBeenCalledWith({
      url: `${BASE}${PREFIX}/mcp/servers/available`,
      method: 'GET',
      token: MOCK_JWT_TOKEN,
    });
  });

  it('should enable catalog server with encoded name', async () => {
    vi.mocked(requestDatalayerAPI).mockResolvedValue({});

    await mcp.enableCatalogServer(MOCK_JWT_TOKEN, 'my/server');

    expect(requestDatalayerAPI).toHaveBeenCalledWith({
      url: `${BASE}${PREFIX}/mcp/servers/catalog/${encodeURIComponent('my/server')}/enable`,
      method: 'POST',
      token: MOCK_JWT_TOKEN,
    });
  });

  it('should start agent MCP servers', async () => {
    vi.mocked(requestDatalayerAPI).mockResolvedValue({ started: ['github'] });

    await mcp.startAgentMCPServers(MOCK_JWT_TOKEN, 'ag1', {
      servers: ['github'],
    });

    expect(requestDatalayerAPI).toHaveBeenCalledWith({
      url: `${BASE}${PREFIX}/agents/${encodeURIComponent('ag1')}/mcp-servers/start`,
      method: 'POST',
      body: { servers: ['github'] },
      token: MOCK_JWT_TOKEN,
    });
  });

  it('should stop agent MCP servers', async () => {
    vi.mocked(requestDatalayerAPI).mockResolvedValue({});

    await mcp.stopAgentMCPServers(MOCK_JWT_TOKEN, 'ag1');

    expect(requestDatalayerAPI).toHaveBeenCalledWith({
      url: `${BASE}${PREFIX}/agents/${encodeURIComponent('ag1')}/mcp-servers/stop`,
      method: 'POST',
      token: MOCK_JWT_TOKEN,
    });
  });

  it('should start all agents MCP servers', async () => {
    vi.mocked(requestDatalayerAPI).mockResolvedValue({});

    await mcp.startAllAgentsMCPServers(MOCK_JWT_TOKEN);

    expect(requestDatalayerAPI).toHaveBeenCalledWith({
      url: `${BASE}${PREFIX}/agents/mcp-servers/start`,
      method: 'POST',
      body: {},
      token: MOCK_JWT_TOKEN,
    });
  });

  it('should stop all agents MCP servers', async () => {
    vi.mocked(requestDatalayerAPI).mockResolvedValue({});

    await mcp.stopAllAgentsMCPServers(MOCK_JWT_TOKEN);

    expect(requestDatalayerAPI).toHaveBeenCalledWith({
      url: `${BASE}${PREFIX}/agents/mcp-servers/stop`,
      method: 'POST',
      token: MOCK_JWT_TOKEN,
    });
  });
});
