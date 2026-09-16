/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as DatalayerApi from '../../DatalayerApi';
import {
  disconnectAgent,
  disconnectEveryAgent,
  disconnectEveryAgentInTeam,
  isCimdClientId,
  listConnectedAgents,
} from '../connectedAgents';

describe('IAM connected agents API', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('lists the grants as agents, in camel case, with the scopes as the consent screen words them', async () => {
    const request = vi
      .spyOn(DatalayerApi, 'requestDatalayerAPI')
      .mockResolvedValue({
        success: true,
        agents: [
          {
            uid: '01GRANT',
            client_id: 'https://claude.ai/.well-known/mcp-client.json',
            client_name: 'Claude Code',
            client_hostname: 'claude.ai',
            registration: 'cimd',
            scopes: ['notebooks:read'],
            scope_details: [
              {
                name: 'notebooks:read',
                title: 'Read notebooks',
                description: 'Read cells.',
              },
            ],
            resource: 'https://r1.datalayer.run/mcp',
            created_at: '2026-08-27T09:00:00Z',
            last_used_at: null,
          },
        ],
      });

    const agents = await listConnectedAgents('token', 'https://iam.test');

    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'https://iam.test/api/iam/v1/oauth/connected-agents',
        method: 'GET',
      }),
    );
    expect(agents).toEqual([
      {
        uid: '01GRANT',
        clientId: 'https://claude.ai/.well-known/mcp-client.json',
        clientName: 'Claude Code',
        clientHostname: 'claude.ai',
        registration: 'cimd',
        scopes: ['notebooks:read'],
        scopeDetails: [
          {
            name: 'notebooks:read',
            title: 'Read notebooks',
            description: 'Read cells.',
          },
        ],
        resource: 'https://r1.datalayer.run/mcp',
        createdAt: '2026-08-27T09:00:00Z',
        lastUsedAt: null,
      },
    ]);
  });

  it('reads the registration IAM answers, without inferring it from the client id', async () => {
    vi.spyOn(DatalayerApi, 'requestDatalayerAPI').mockResolvedValue({
      success: true,
      agents: [
        {
          uid: '01GRANT',
          client_id: '01HZX7Q2M3N4P5R6S7T8U9V0W1',
          client_name: 'A dynamically registered client',
          client_hostname: '',
          registration: 'dcr',
          scopes: [],
          scope_details: [],
          resource: 'https://r1.datalayer.run/mcp',
        },
      ],
    });

    const [agent] = await listConnectedAgents('token', 'https://iam.test');

    expect(agent.registration).toBe('dcr');
    expect(agent.clientHostname).toBe('');
  });

  it('disconnects one grant with a DELETE', async () => {
    const request = vi
      .spyOn(DatalayerApi, 'requestDatalayerAPI')
      .mockResolvedValue({
        success: true,
        message: 'The agent has been disconnected.',
      });

    const answer = await disconnectAgent(
      'token',
      '01GRANT',
      'https://iam.test',
    );

    expect(answer.success).toBe(true);
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'https://iam.test/api/iam/v1/oauth/connected-agents/01GRANT',
        method: 'DELETE',
      }),
    );
  });

  it('signs out everywhere at the collection, not one grant at a time', async () => {
    // Also how a forced re-consent is done: a grant *is* the consent, so
    // ending them all sends the next authorization through the approval
    // screen. There is no second "ask again" flag to keep in step.
    const request = vi
      .spyOn(DatalayerApi, 'requestDatalayerAPI')
      .mockResolvedValue({ success: true, revoked: 3 } as never);

    const answer = await disconnectEveryAgent('token', 'https://iam.test');

    expect(answer.revoked).toBe(3);
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'https://iam.test/api/iam/v1/oauth/connected-agents',
        method: 'DELETE',
      }),
    );
  });

  it('reads a missing count as none rather than undefined', async () => {
    // The toast says a number. `undefined` there reads as a broken page.
    vi.spyOn(DatalayerApi, 'requestDatalayerAPI').mockResolvedValue({
      success: true,
    } as never);
    expect(
      (await disconnectEveryAgent('token', 'https://iam.test')).revoked,
    ).toBe(0);
  });

  it('ends one team’s agents at that team’s own route', async () => {
    const request = vi
      .spyOn(DatalayerApi, 'requestDatalayerAPI')
      .mockResolvedValue({ success: true, revoked: 2 } as never);

    await disconnectEveryAgentInTeam('token', '01TEAM', 'https://iam.test');

    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'https://iam.test/api/iam/v1/oauth/teams/01TEAM/connected-agents',
        method: 'DELETE',
      }),
    );
  });

  it('tells a client registered by URL from one registered by DCR', () => {
    expect(
      isCimdClientId('https://datalayer.ai/.well-known/mcp-clients/cli.json'),
    ).toBe(true);
    expect(
      isCimdClientId('http://datalayer.ai/.well-known/mcp-clients/cli.json'),
    ).toBe(false);
    expect(isCimdClientId('https://datalayer.ai')).toBe(false);
    expect(isCimdClientId('01HZX7Q2M3N4P5R6S7T8U9V0W1')).toBe(false);
  });
});
