/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as DatalayerApi from '../../DatalayerApi';
import { disconnectAgent, isCimdClientId, listConnectedAgents } from '../connectedAgents';

describe('IAM connected agents API', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('lists the grants as agents, in camel case, with the scopes as the consent screen words them', async () => {
    const request = vi.spyOn(DatalayerApi, 'requestDatalayerAPI').mockResolvedValue({
      success: true,
      agents: [
        {
          uid: '01GRANT',
          client_id: 'https://claude.ai/.well-known/mcp-client.json',
          client_name: 'Claude Code',
          scopes: ['notebooks:read'],
          scope_details: [{ name: 'notebooks:read', title: 'Read notebooks', description: 'Read cells.' }],
          resource: 'https://mcp.datalayer.run/mcp',
          created_at: '2026-08-27T09:00:00Z',
          last_used_at: null,
        },
      ],
    });

    const agents = await listConnectedAgents('token', 'https://iam.test');

    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({ url: 'https://iam.test/api/iam/v1/oauth/connected-agents', method: 'GET' }),
    );
    expect(agents).toEqual([
      {
        uid: '01GRANT',
        clientId: 'https://claude.ai/.well-known/mcp-client.json',
        clientName: 'Claude Code',
        scopes: ['notebooks:read'],
        scopeDetails: [{ name: 'notebooks:read', title: 'Read notebooks', description: 'Read cells.' }],
        resource: 'https://mcp.datalayer.run/mcp',
        createdAt: '2026-08-27T09:00:00Z',
        lastUsedAt: null,
      },
    ]);
  });

  it('disconnects one grant with a DELETE', async () => {
    const request = vi
      .spyOn(DatalayerApi, 'requestDatalayerAPI')
      .mockResolvedValue({ success: true, message: 'The agent has been disconnected.' });

    const answer = await disconnectAgent('token', '01GRANT', 'https://iam.test');

    expect(answer.success).toBe(true);
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({ url: 'https://iam.test/api/iam/v1/oauth/connected-agents/01GRANT', method: 'DELETE' }),
    );
  });

  it('tells a client registered by URL from one registered by DCR', () => {
    expect(isCimdClientId('https://datalayer.ai/.well-known/mcp-clients/cli.json')).toBe(true);
    expect(isCimdClientId('http://datalayer.ai/.well-known/mcp-clients/cli.json')).toBe(false);
    expect(isCimdClientId('https://datalayer.ai')).toBe(false);
    expect(isCimdClientId('01HZX7Q2M3N4P5R6S7T8U9V0W1')).toBe(false);
  });
});
