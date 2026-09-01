/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Whether the audit is reaching the organization's own system of record.
 *
 * Forwarding never fails the call it describes — holding up a tool call
 * because somebody's SIEM is down would be the worse trade — so a failure is
 * invisible unless something reports it. A silently dropped audit record
 * looks exactly like nothing having happened, and this is the only place the
 * difference is said.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as DatalayerApi from '../../DatalayerApi';
import { getMcpForwarding } from '../forwarding';

const MCP = 'https://mcp.test/mcp';

describe('audit forwarding', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('reports a healthy destination with what it has delivered', async () => {
    vi.spyOn(DatalayerApi, 'requestDatalayerAPI').mockResolvedValue({
      configured: true,
      state: {
        org_uid: '01ORG',
        delivered: 12,
        failed: 0,
        healthy: true,
        last_delivered_at: '2026-09-01T10:00:00Z',
      },
    } as never);

    const answer = await getMcpForwarding('token', '01ORG', MCP);

    expect(answer.configured).toBe(true);
    expect(answer.state?.healthy).toBe(true);
    expect(answer.state?.delivered).toBe(12);
  });

  it('reports a failure with what the destination said', async () => {
    // The reason is the whole value: "forwarding is failing" without it
    // sends somebody to read logs on a service that is not theirs.
    vi.spyOn(DatalayerApi, 'requestDatalayerAPI').mockResolvedValue({
      configured: true,
      state: {
        org_uid: '01ORG',
        delivered: 3,
        failed: 9,
        healthy: false,
        last_error: '401 from the destination',
      },
    } as never);

    const answer = await getMcpForwarding('token', '01ORG', MCP);

    expect(answer.state?.healthy).toBe(false);
    expect(answer.state?.lastError).toContain('401');
  });

  it('keeps "never attempted" apart from "working"', async () => {
    // They read the same in a counter, and for an organization that
    // configured a destination the first is the worse state — and the one
    // that looks most like fine.
    vi.spyOn(DatalayerApi, 'requestDatalayerAPI').mockResolvedValue({
      configured: false,
      state: null,
    } as never);

    const answer = await getMcpForwarding('token', '01ORG', MCP);

    expect(answer.configured).toBe(false);
    expect(answer.state).toBeNull();
  });

  it('a destination that has never been attempted is not "configured"', async () => {
    // The state the whole distinction exists for, and the one my first
    // version of these tests missed: an organization *has* a destination,
    // and nothing has ever been shipped to it. The counters are zero and
    // there is no error — which reads exactly like a healthy destination
    // with a quiet week.
    vi.spyOn(DatalayerApi, 'requestDatalayerAPI').mockResolvedValue({
      configured: false,
      state: {
        org_uid: '01ORG',
        delivered: 0,
        failed: 0,
        healthy: true,
        last_error: null,
      },
    } as never);

    const answer = await getMcpForwarding('token', '01ORG', MCP);

    // The server decides this, not the presence of a state object.
    expect(answer.configured).toBe(false);
    expect(answer.state).not.toBeNull();
  });

  it('carries no destination and no secret', async () => {
    // A URL is not a credential, but it is where somebody's audit goes.
    vi.spyOn(DatalayerApi, 'requestDatalayerAPI').mockResolvedValue({
      configured: true,
      state: { org_uid: '01ORG', delivered: 1, failed: 0, healthy: true },
    } as never);

    const answer = await getMcpForwarding('token', '01ORG', MCP);

    expect(JSON.stringify(answer)).not.toMatch(/https?:\/\//);
    expect(Object.keys(answer.state ?? {})).not.toContain('destinationUrl');
  });

  it('asks about one organization when given one', async () => {
    const request = vi
      .spyOn(DatalayerApi, 'requestDatalayerAPI')
      .mockResolvedValue({ configured: false, state: null } as never);

    await getMcpForwarding('token', '01ORG', MCP);

    expect(request.mock.calls[0][0].url).toContain('org=01ORG');
  });

  it('does not send an empty org, which would ask about everything', async () => {
    const request = vi
      .spyOn(DatalayerApi, 'requestDatalayerAPI')
      .mockResolvedValue({ configured: false, state: null } as never);

    await getMcpForwarding('token', '', MCP);

    expect(request.mock.calls[0][0].url).not.toContain('org=');
  });

  it('reads a count of zero rather than losing it', async () => {
    vi.spyOn(DatalayerApi, 'requestDatalayerAPI').mockResolvedValue({
      configured: true,
      state: { org_uid: '01ORG', delivered: 0, failed: 0, healthy: true },
    } as never);

    expect((await getMcpForwarding('token', '01ORG', MCP)).state?.delivered).toBe(0);
  });
});
