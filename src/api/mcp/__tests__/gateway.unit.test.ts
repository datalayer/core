/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { describe, expect, it } from 'vitest';
import { fromWire, mcpGatewayOrigin, mcpServiceUrl, mcpUrl, toWire } from '../gateway';

describe('MCP gateway addressing', () => {
  it('takes the resource path off the configured MCP URL', () => {
    expect(mcpGatewayOrigin('https://mcp.datalayer.run/mcp')).toBe('https://mcp.datalayer.run');
    expect(mcpGatewayOrigin('https://mcp.datalayer.run/mcp/')).toBe('https://mcp.datalayer.run');
    expect(mcpGatewayOrigin('http://localhost:4404')).toBe('http://localhost:4404');
    expect(mcpGatewayOrigin()).toBe('https://mcp.datalayer.run');
  });

  it('builds versioned routes with only the query parameters that have a value', () => {
    expect(
      mcpUrl('https://mcp.datalayer.run/mcp', '/tasks', {
        status: 'working',
        cursor: undefined,
        limit: 20,
        org: '',
      }),
    ).toBe('https://mcp.datalayer.run/api/mcp/v1/tasks?status=working&limit=20');
    expect(mcpServiceUrl('https://mcp.datalayer.run/mcp', '/version')).toBe(
      'https://mcp.datalayer.run/api/mcp/version',
    );
  });
});

describe('MCP wire conversion', () => {
  it('converts the envelope and carries a tool result as it came', () => {
    const task = fromWire<{
      sandboxBindingUid: string;
      result: { structuredContent: { row_count: number } };
      outputs: Array<{ outputType: string }>;
    }>({
      sandbox_binding_uid: 'sb_1',
      result: { structuredContent: { row_count: 3 } },
      outputs: [{ output_type: 'stream' }],
    });
    expect(task.sandboxBindingUid).toBe('sb_1');
    expect(task.result.structuredContent.row_count).toBe(3);
    expect(task.outputs[0].outputType).toBe('stream');
  });

  it('keeps redacted arguments and client info under the tool\'s own names', () => {
    const row = fromWire<{ redactedArguments: Record<string, unknown>; clientInfo: Record<string, unknown> }>({
      redacted_arguments: { notebook_path: 'a.ipynb', api_key: '***' },
      client_info: { name: 'claude-code', protocol_version: '2026-07-28' },
    });
    expect(row.redactedArguments).toEqual({ notebook_path: 'a.ipynb', api_key: '***' });
    expect(row.clientInfo).toEqual({ name: 'claude-code', protocol_version: '2026-07-28' });
  });

  it('writes requests in snake case', () => {
    expect(toWire({ sandboxUid: 'x', onLost: 'relaunch' })).toEqual({
      sandbox_uid: 'x',
      on_lost: 'relaunch',
    });
  });
});
