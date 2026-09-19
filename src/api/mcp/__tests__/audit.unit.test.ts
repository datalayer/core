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
import { exportAuditEvents, listAuditEvents } from '../audit';

const BASE = 'https://mcp.test/mcp';

describe('MCP audit API', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('pages the audit log with the filters in the gateway\'s names', async () => {
    const request = vi.spyOn(DatalayerApi, 'requestDatalayerAPI').mockResolvedValue({
      items: [
        {
          uid: '01AUDIT',
          at: '2026-08-27T10:00:00Z',
          org_uid: '01ORG',
          user_uid: '01USER',
          client_id: 'https://claude.ai/.well-known/mcp-client.json',
          method: 'tools/call',
          tool: 'execute_cell',
          arguments_hash: 'sha256:abc',
          redacted_arguments: { notebook_path: 'a.ipynb', cell_index: 2 },
          decision: 'refused',
          refusal_reason: 'organization: tool_denylist',
          outcome: null,
          task_id: null,
          trace_id: 'abc',
        },
      ],
      next_cursor: 'n1',
    });

    const page = await listAuditEvents(
      'token',
      { org: '01ORG', decision: 'refused', taskId: '01T', since: '2026-08-27T00:00:00Z', cursor: 'c0', limit: 50 },
      BASE,
    );

    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'https://mcp.test/api/mcp/v1/audit?org=01ORG&decision=refused&since=2026-08-27T00%3A00%3A00Z&task_id=01T&cursor=c0&limit=50',
        method: 'GET',
      }),
    );
    expect(page.nextCursor).toBe('n1');
    expect(page.items[0].refusalReason).toBe('organization: tool_denylist');
    // A tool's argument names are the tool's own and survive as typed.
    expect(page.items[0].redactedArguments).toEqual({ notebook_path: 'a.ipynb', cell_index: 2 });
  });

  it('exports the selection as text, in the format asked for', async () => {
    const request = vi
      .spyOn(DatalayerApi, 'requestDatalayerAPI')
      .mockResolvedValue('uid,at,decision\n01AUDIT,2026-08-27T10:00:00Z,allowed\n');

    const csv = await exportAuditEvents('token', { org: '01ORG' }, 'csv', BASE);

    expect(csv.startsWith('uid,at,decision')).toBe(true);
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'https://mcp.test/api/mcp/v1/audit?org=01ORG&export=csv',
        headers: { Accept: 'text/csv' },
        responseType: 'text',
      }),
    );
  });

  it('exports JSONL by default', async () => {
    const request = vi.spyOn(DatalayerApi, 'requestDatalayerAPI').mockResolvedValue('{"uid":"01"}\n');
    await exportAuditEvents('token', {}, undefined, BASE);
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'https://mcp.test/api/mcp/v1/audit?export=jsonl',
        headers: { Accept: 'application/x-ndjson' },
      }),
    );
  });
});
