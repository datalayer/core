/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as DatalayerApi from '../../DatalayerApi';
import { listBindings, terminateBinding } from '../bindings';

const BASE = 'https://mcp.test/mcp';

describe('MCP bindings API', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('lists the handles of one kind', async () => {
    const request = vi.spyOn(DatalayerApi, 'requestDatalayerAPI').mockResolvedValue({
      items: [
        {
          uid: 'sb_01',
          kind: 'sandbox',
          user_uid: '01USER',
          client_id: 'https://claude.ai/.well-known/mcp-client.json',
          sandbox_uid: '01RUNTIME',
          sandbox_provider: 'datalayer',
          capabilities: ['sandbox', 'gpu'],
          on_lost: 'fail',
          worker_replica: 'gateway-0',
          state: 'active',
          created_at: '2026-08-27T10:00:00Z',
        },
      ],
    });

    const page = await listBindings('token', { kind: 'sandbox' }, BASE);

    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({ url: 'https://mcp.test/api/mcp/v1/bindings?kind=sandbox', method: 'GET' }),
    );
    expect(page.items[0].sandboxProvider).toBe('datalayer');
    expect(page.items[0].workerReplica).toBe('gateway-0');
    expect(page.items[0].capabilities).toEqual(['sandbox', 'gpu']);
  });

  it('terminates a binding with a DELETE', async () => {
    const request = vi.spyOn(DatalayerApi, 'requestDatalayerAPI').mockResolvedValue({
      uid: 'sb_01',
      kind: 'sandbox',
      user_uid: '01USER',
      state: 'closed',
      created_at: '2026-08-27T10:00:00Z',
    });

    const binding = await terminateBinding('token', 'sb_01', BASE);

    expect(binding.state).toBe('closed');
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({ url: 'https://mcp.test/api/mcp/v1/bindings/sb_01', method: 'DELETE' }),
    );
  });
});
