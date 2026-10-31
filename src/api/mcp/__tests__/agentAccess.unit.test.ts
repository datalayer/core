/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as DatalayerApi from '../../DatalayerApi';
import { getAgentReach, getAgentToolsets } from '../agentAccess';

const BASE = 'https://mcp.test/mcp';

describe('MCP agent access API', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('asks about one connected agent by its grant, as camel case', async () => {
    const request = vi
      .spyOn(DatalayerApi, 'requestDatalayerAPI')
      .mockResolvedValue({
        agent: {
          grant: 'g-1',
          client_id: 'claude',
          client_name: 'Claude Code',
          scopes: [],
          org_uid: null,
          team_uid: null,
        },
        toolsets: [
          {
            kind: 'source',
            uid: 's-1',
            name: 'github',
            title: 'GitHub',
            description: null,
            selected: 'source',
            health: {
              state: 'degraded',
              detail: 'Contents reports it pending.',
            },
            approval_policy: 'explicit',
            tools: [
              {
                name: 'github__search',
                scope: 'tools:use data:read',
                allowed: false,
                rule: 'scope',
                decided_by: 'platform',
                detail: 'This agent was not granted tools:use.',
                approval: null,
              },
            ],
          },
        ],
        sources_error: null,
      });

    const answer = await getAgentToolsets('token', { grant: 'g-1' }, BASE);

    expect(request).toHaveBeenCalledWith({
      url: 'https://mcp.test/api/mcp/v1/toolsets?grant=g-1',
      method: 'GET',
      token: 'token',
    });
    expect(answer.agent.clientName).toBe('Claude Code');
    expect(answer.toolsets[0].approvalPolicy).toBe('explicit');
    expect(answer.toolsets[0].tools[0].decidedBy).toBe('platform');
    expect(answer.sourcesError).toBeNull();
  });

  it('asks about the token itself when no agent is named', async () => {
    const request = vi
      .spyOn(DatalayerApi, 'requestDatalayerAPI')
      .mockResolvedValue({
        agent: { grant: null, scopes: [] },
        notebooks: [],
        sources: [],
        notebooks_listed: 0,
        sources_listed: 3,
        limit: 200,
        sources_truncated: false,
        notebooks_error: 'Spacer could not be reached',
        sources_error: null,
      });

    const answer = await getAgentReach('token', {}, BASE);

    expect(request).toHaveBeenCalledWith({
      url: 'https://mcp.test/api/mcp/v1/reach',
      method: 'GET',
      token: 'token',
    });
    expect(answer.sourcesListed).toBe(3);
    expect(answer.notebooksError).toBe('Spacer could not be reached');
  });
});
