/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as DatalayerApi from '../../DatalayerApi';
import {
  callMcpTool,
  createMcpSession,
  decideMcpApproval,
  discoverMcpTools,
  getMcpCall,
  isMcpCallTerminal,
  listMcpApprovals,
  listMcpCalls,
  listMcpSessions,
  testMcpSource,
} from '../mcp';

const SOURCE = '01ARZ3NDEKTSV4RRFFQ69G5FAV';
const SESSION = '01SESSION00000000000000000';
const CALL = '01CALL0000000000000000000';
const BASE = 'https://contents';

describe('Contents MCP API', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('discovers tools and keeps the argument names of the input schema as typed', async () => {
    const request = vi.spyOn(DatalayerApi, 'requestDatalayerAPI').mockResolvedValue({
      tools: [
        {
          name: 'search_earth_datasets',
          description: 'Search datasets',
          input_schema: {
            type: 'object',
            properties: { search_keywords: { type: 'string' }, bounding_box: { type: 'array' } },
            required: ['search_keywords'],
          },
        },
      ],
      resources: [{ uri: 'earthdata://catalog', name: 'Catalog', media_type: 'application/json' }],
      discovered_at: '2026-08-26T10:00:00Z',
    });

    const discovered = await discoverMcpTools('token', SOURCE, BASE);

    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        url: `${BASE}/api/contents/v1/sources/${SOURCE}/mcp/tools`,
        method: 'GET',
      }),
    );
    expect(discovered.discoveredAt).toBe('2026-08-26T10:00:00Z');
    expect(discovered.tools[0].inputSchema).toEqual({
      type: 'object',
      properties: { search_keywords: { type: 'string' }, bounding_box: { type: 'array' } },
      required: ['search_keywords'],
    });
    expect(discovered.resources[0].mediaType).toBe('application/json');
  });

  it('tests the source with a POST and reads the verdict', async () => {
    const request = vi
      .spyOn(DatalayerApi, 'requestDatalayerAPI')
      .mockResolvedValue({ ok: false, transport: 'streamable-http', detail: 'connection refused' });

    const health = await testMcpSource('token', SOURCE, BASE);

    expect(health.ok).toBe(false);
    expect(health.detail).toBe('connection refused');
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        url: `${BASE}/api/contents/v1/sources/${SOURCE}/mcp/health`,
        method: 'POST',
      }),
    );
  });

  it('opens a session with an idempotency key and the narrowed tools in snake case', async () => {
    const request = vi.spyOn(DatalayerApi, 'requestDatalayerAPI').mockResolvedValue({
      uid: SESSION,
      source_uid: SOURCE,
      actor_uid: '01ACTOR',
      sandbox_uid: null,
      allowed_tools: ['search_earth_datasets'],
      allowed_resources: [],
      allowed_domains: ['earthdata.nasa.gov'],
      approval_policy: 'explicit',
      destination_policy: 'allowlist',
      max_result_bytes: 1048576,
      status: 'active',
      created_at: '2026-08-26T10:00:00Z',
      expires_at: '2026-08-26T11:00:00Z',
    });

    const session = await createMcpSession(
      'token',
      { sourceUid: SOURCE, tools: ['search_earth_datasets'], expiresIn: 3600 },
      'session-1',
      BASE,
    );

    expect(session.allowedTools).toEqual(['search_earth_datasets']);
    expect(session.approvalPolicy).toBe('explicit');
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        url: `${BASE}/api/contents/v1/mcp-sessions`,
        method: 'POST',
        headers: { 'Idempotency-Key': 'session-1' },
        body: { source_uid: SOURCE, tools: ['search_earth_datasets'], expires_in: 3600 },
      }),
    );
  });

  it('lists the sessions whole: the contract filters on nothing', async () => {
    const request = vi
      .spyOn(DatalayerApi, 'requestDatalayerAPI')
      .mockResolvedValue({ items: [] });

    await listMcpSessions('token', BASE);

    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({ url: `${BASE}/api/contents/v1/mcp-sessions`, method: 'GET' }),
    );
  });

  it('sends the tool arguments as typed and reads a pending call back', async () => {
    const request = vi.spyOn(DatalayerApi, 'requestDatalayerAPI').mockResolvedValue({
      uid: CALL,
      session_uid: SESSION,
      tool: 'download_earth_data_granules',
      arguments_redacted: { short_name: 'MUR', folder_name: '[redacted]' },
      arguments_hash: 'sha256:abc',
      destination_uri: 'home-folder:///earthdata',
      status: 'pending-approval',
      approval_uid: '01APPROVAL',
      result: null,
      created_at: '2026-08-26T10:00:00Z',
      updated_at: '2026-08-26T10:00:00Z',
    });

    const call = await callMcpTool(
      'token',
      SESSION,
      {
        tool: 'download_earth_data_granules',
        arguments: { short_name: 'MUR', bounding_box: [-4, 51, 9, 61], mode: 'manifest' },
        destinationUri: 'home-folder:///earthdata',
      },
      BASE,
    );

    expect(call.status).toBe('pending-approval');
    expect(call.approvalUid).toBe('01APPROVAL');
    expect(isMcpCallTerminal(call.status)).toBe(false);
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        url: `${BASE}/api/contents/v1/mcp-sessions/${SESSION}/calls`,
        method: 'POST',
        body: {
          tool: 'download_earth_data_granules',
          arguments: { short_name: 'MUR', bounding_box: [-4, 51, 9, 61], mode: 'manifest' },
          destination_uri: 'home-folder:///earthdata',
        },
      }),
    );
  });

  it('reads a finished call whose artifacts name a Transfer rather than bytes', async () => {
    vi.spyOn(DatalayerApi, 'requestDatalayerAPI').mockResolvedValue({
      uid: CALL,
      session_uid: SESSION,
      tool: 'download_earth_data_granules',
      arguments_redacted: {},
      arguments_hash: 'sha256:abc',
      status: 'succeeded',
      created_at: '2026-08-26T10:00:00Z',
      updated_at: '2026-08-26T10:05:00Z',
      completed_at: '2026-08-26T10:05:00Z',
      result: {
        content: [{ type: 'text', text: '2 granules' }],
        artifacts: [
          { name: 'a.nc', size: 1024, media_type: 'application/x-netcdf', transfer_uid: '01TRANSFER' },
        ],
      },
    });

    const call = await getMcpCall('token', SESSION, CALL, BASE);

    expect(isMcpCallTerminal(call.status)).toBe(true);
    expect(call.result?.artifacts?.[0].transferUid).toBe('01TRANSFER');
    expect(call.result?.artifacts?.[0].mediaType).toBe('application/x-netcdf');
  });

  it('lists the calls of a session and the approvals by status', async () => {
    const request = vi
      .spyOn(DatalayerApi, 'requestDatalayerAPI')
      .mockResolvedValueOnce({ items: [] })
      .mockResolvedValueOnce({
        items: [
          {
            uid: '01APPROVAL',
            source_uid: SOURCE,
            session_uid: SESSION,
            call_uid: CALL,
            actor_uid: '01ACTOR',
            tool: 'download_earth_data_granules',
            arguments_hash: 'sha256:abc',
            arguments_redacted: {},
            status: 'pending',
            created_at: '2026-08-26T10:00:00Z',
            expires_at: '2026-08-26T11:00:00Z',
          },
        ],
      });

    const calls = await listMcpCalls('token', SESSION, BASE);
    const approvals = await listMcpApprovals('token', { status: 'pending' }, BASE);

    expect(calls.items).toEqual([]);
    expect(approvals.items[0].callUid).toBe(CALL);
    expect(request).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        url: `${BASE}/api/contents/v1/mcp-sessions/${SESSION}/calls`,
      }),
    );
    expect(request).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        url: `${BASE}/api/contents/v1/mcp-approvals?status=pending`,
      }),
    );
  });

  it('decides an approval on its own endpoint with the note', async () => {
    const request = vi.spyOn(DatalayerApi, 'requestDatalayerAPI').mockResolvedValue({
      uid: '01APPROVAL',
      source_uid: SOURCE,
      session_uid: SESSION,
      call_uid: CALL,
      actor_uid: '01ACTOR',
      tool: 'download_earth_data_granules',
      arguments_hash: 'sha256:abc',
      arguments_redacted: {},
      status: 'rejected',
      decided_by: '01ACTOR',
      decided_at: '2026-08-26T10:10:00Z',
      note: 'too large',
      created_at: '2026-08-26T10:00:00Z',
      expires_at: '2026-08-26T11:00:00Z',
    });

    const decided = await decideMcpApproval('token', '01APPROVAL', 'reject', 'too large', BASE);

    expect(decided.status).toBe('rejected');
    expect(decided.decidedBy).toBe('01ACTOR');
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        url: `${BASE}/api/contents/v1/mcp-approvals/01APPROVAL/reject`,
        method: 'POST',
        body: { note: 'too large' },
      }),
    );
  });
});
