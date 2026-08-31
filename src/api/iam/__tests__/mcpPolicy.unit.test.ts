/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * The MCP policy layer an organization writes.
 *
 * Two behaviours carry this module, and both are about *not losing an
 * edit*: a layer nobody has written is `null` rather than an error, because
 * most organizations have never written one; and a write that would
 * overwrite somebody else's is a conflict the caller is told about rather
 * than a silent win.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as DatalayerApi from '../../DatalayerApi';
import {
  MCP_POLICY_RULES,
  MCP_POLICY_SCOPES,
  McpPolicyConflict,
  deleteMcpPolicy,
  getMcpPolicy,
  setMcpPolicy,
} from '../mcpPolicy';

const IAM = 'https://iam.test';
const ORG = '01ORG';

/** An error shaped the way `requestDatalayerAPI` throws them. */
const httpError = (status: number): Error => {
  const error = new Error(`HTTP ${status}`) as Error & {
    response: { status: number };
  };
  error.response = { status };
  return error;
};

describe('the MCP policy layer', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('reads one layer with the version a write has to carry back', async () => {
    vi.spyOn(DatalayerApi, 'requestDatalayerAPI').mockResolvedValue({
      toolDenylist: ['execute_cell'],
      maxCallsPerMinute: 30,
      version: 7,
    } as never);

    const policy = await getMcpPolicy('token', 'organization', ORG, IAM);

    expect(policy?.toolDenylist).toEqual(['execute_cell']);
    expect(policy?.version).toBe(7);
  });

  it('answers null for a layer nobody has written', async () => {
    // The common case, not a failure: most organizations have never written
    // a policy. An error here would put a red box on every such page.
    vi.spyOn(DatalayerApi, 'requestDatalayerAPI').mockRejectedValue(
      httpError(404),
    );

    expect(await getMcpPolicy('token', 'organization', ORG, IAM)).toBeNull();
  });

  it('does not swallow a failure that is not a missing policy', async () => {
    // A 403 read as "no policy" would show an owner an empty form and lose
    // whatever they typed into it.
    vi.spyOn(DatalayerApi, 'requestDatalayerAPI').mockRejectedValue(
      httpError(403),
    );

    await expect(
      getMcpPolicy('token', 'organization', ORG, IAM),
    ).rejects.toThrow();
  });

  it('writes the rules as the body, replacing rather than merging', async () => {
    const request = vi
      .spyOn(DatalayerApi, 'requestDatalayerAPI')
      .mockResolvedValue({ success: true, policy: { version: 8 } } as never);

    await setMcpPolicy(
      'token',
      'organization',
      ORG,
      { toolDenylist: ['execute_cell'] },
      {},
      IAM,
    );

    const call = request.mock.calls[0][0];
    expect(call.method).toBe('PUT');
    expect(call.body).toEqual({ toolDenylist: ['execute_cell'] });
  });

  it('sends the version it read, so a racing edit cannot be lost', async () => {
    const request = vi
      .spyOn(DatalayerApi, 'requestDatalayerAPI')
      .mockResolvedValue({ success: true, policy: {} } as never);

    await setMcpPolicy('token', 'organization', ORG, {}, { expectedVersion: 7 }, IAM);

    expect(request.mock.calls[0][0].url).toContain('expected_version=7');
  });

  it('sends no version when there was none to read', async () => {
    // A layer nobody has written has no version, and inventing one would
    // make the first write of every policy a conflict.
    const request = vi
      .spyOn(DatalayerApi, 'requestDatalayerAPI')
      .mockResolvedValue({ success: true, policy: {} } as never);

    await setMcpPolicy('token', 'organization', ORG, {}, {}, IAM);

    expect(request.mock.calls[0][0].url).not.toContain('expected_version');
  });

  it('sends version zero rather than dropping it', async () => {
    // `0` is falsy and a real version. Dropped, the write stops being
    // conditional and silently overwrites.
    const request = vi
      .spyOn(DatalayerApi, 'requestDatalayerAPI')
      .mockResolvedValue({ success: true, policy: {} } as never);

    await setMcpPolicy('token', 'organization', ORG, {}, { expectedVersion: 0 }, IAM);

    expect(request.mock.calls[0][0].url).toContain('expected_version=0');
  });

  it('turns a racing write into a conflict that says what to do', async () => {
    vi.spyOn(DatalayerApi, 'requestDatalayerAPI').mockRejectedValue(
      httpError(409),
    );

    await expect(
      setMcpPolicy('token', 'organization', ORG, {}, { expectedVersion: 7 }, IAM),
    ).rejects.toBeInstanceOf(McpPolicyConflict);
  });

  it('reads the status off the error the API actually throws', async () => {
    // `RunResponseError` keeps the `Response` on `.response`; this is the
    // assumption the two branches above stand on, so it is pinned here
    // rather than left to be discovered when a 404 renders as a red box.
    class Shaped extends Error {
      response = { status: 404 };
    }
    vi.spyOn(DatalayerApi, 'requestDatalayerAPI').mockRejectedValue(new Shaped());

    expect(await getMcpPolicy('token', 'organization', ORG, IAM)).toBeNull();
  });

  it('addresses the layer by scope and subject', async () => {
    const request = vi
      .spyOn(DatalayerApi, 'requestDatalayerAPI')
      .mockResolvedValue({} as never);

    await getMcpPolicy('token', 'team', '01TEAM', IAM);

    expect(request.mock.calls[0][0].url).toBe(
      `${IAM}/api/iam/v1/mcp-policies/team/01TEAM`,
    );
  });

  it('removes a layer so it narrows nothing again', async () => {
    const request = vi
      .spyOn(DatalayerApi, 'requestDatalayerAPI')
      .mockResolvedValue({} as never);

    await deleteMcpPolicy('token', 'organization', ORG, IAM);

    expect(request.mock.calls[0][0].method).toBe('DELETE');
  });

  it('spells the layers the way IAM stores them', () => {
    // `personal`, not `user`. IAM refuses an unknown scope with a 422, so
    // this is not a subtle mis-scoping: it is every read and every write of
    // that layer failing. It shipped wrong once.
    expect([...MCP_POLICY_SCOPES]).toEqual(['organization', 'team', 'personal']);
  });

  it('names only the rules the gateway enforces', () => {
    // A rule rendered in a form and unknown to IAM is refused at the write,
    // which reads to whoever filled it in as the page being broken.
    expect(MCP_POLICY_RULES).toEqual([
      'toolDenylist',
      'toolAllowlist',
      'allowedClients',
      'maxCallsPerMinute',
      'maxCreditsPerDay',
      'maxConcurrentSandboxes',
    ]);
  });
});
