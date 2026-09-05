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
import { getEffectivePolicy } from '../policy';

const BASE = 'https://mcp.test/mcp';

describe('MCP policy API', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('reads the effective policy, each rule naming the layer that decided', async () => {
    const request = vi.spyOn(DatalayerApi, 'requestDatalayerAPI').mockResolvedValue({
      scope: 'organization',
      org_uid: '01ORG',
      scopes: ['notebooks:read', 'code:execute'],
      rules: [
        { name: 'tool_denylist', value: ['delete_cell'], decided_by: 'organization' },
        { name: 'calls_per_minute', value: 60, decided_by: 'platform' },
      ],
      tools: [
        { tool: 'read_cell', scope: 'notebooks:read', access: 'read', allowed: true, decided_by: 'platform' },
        { tool: 'delete_cell', scope: 'notebooks:write', access: 'write', allowed: false, decided_by: 'organization' },
      ],
    });

    const policy = await getEffectivePolicy('token', { agent: 'https://claude.ai/.well-known/mcp-client.json' }, BASE);

    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'https://mcp.test/api/mcp/v1/policy?agent=https%3A%2F%2Fclaude.ai%2F.well-known%2Fmcp-client.json',
      }),
    );
    expect(policy.rules[0].decidedBy).toBe('organization');
    expect(policy.tools.find(rule => rule.tool === 'delete_cell')?.allowed).toBe(false);
  });
});
