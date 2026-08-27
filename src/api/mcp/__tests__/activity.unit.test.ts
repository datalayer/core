/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as DatalayerApi from '../../DatalayerApi';
import { getMcpActivity } from '../activity';

const BASE = 'https://mcp.test/mcp';

describe('MCP activity API', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('reads one answer for what is going on, for the caller or an organization', async () => {
    const request = vi.spyOn(DatalayerApi, 'requestDatalayerAPI').mockResolvedValue({
      at: '2026-08-27T10:00:05Z',
      org_uid: '01ORG',
      clients: [
        {
          client_id: 'https://claude.ai/.well-known/mcp-client.json',
          client_name: 'Claude Code',
          grant_uid: '01GRANT',
          scopes: ['notebooks:read'],
          last_call: { uid: '01A', at: '2026-08-27T10:00:00Z', user_uid: '01U', method: 'tools/call', tool: 'read_cell', decision: 'allowed' },
        },
      ],
      sandboxes: [{ uid: 'sb_1', kind: 'sandbox', user_uid: '01U', state: 'active', created_at: '2026-08-27T09:00:00Z' }],
      tasks: [],
      calls: [],
      today: { calls: 12, refusals: 1, tasks: 3, credits: 4.5 },
    });

    const activity = await getMcpActivity('token', { org: '01ORG' }, BASE);

    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({ url: 'https://mcp.test/api/mcp/v1/activity?org=01ORG', method: 'GET' }),
    );
    expect(activity.clients[0].grantUid).toBe('01GRANT');
    expect(activity.clients[0].lastCall?.tool).toBe('read_cell');
    expect(activity.sandboxes[0].state).toBe('active');
    expect(activity.today.credits).toBe(4.5);
  });
});
