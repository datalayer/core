/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Trying a rule before trusting it.
 *
 * The answer that matters is `readable`. A rule on something nothing reads
 * never fires, and never firing is exactly what a correctly-quiet rule looks
 * like — so a client that folded "could not read it" into "would not fire"
 * would hide the one thing worth asking.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as DatalayerApi from '../../DatalayerApi';
import { testAlertRule } from '../alerts';

const MCP = 'https://mcp.test/mcp';

const RULE = {
  condition: 'tasks.open',
  operator: 'gt',
  threshold: 20,
  // Deliberately not the default an hour: a hardcoded window in the
  // client would be invisible against a fixture that used the same one.
  windowSeconds: 300,
};

describe('testing an alert rule', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('reports the reading and whether it would fire', async () => {
    vi.spyOn(DatalayerApi, 'requestDatalayerAPI').mockResolvedValue({
      readable: true,
      value: 42,
      would_fire: true,
      detail: '',
    } as never);

    const trial = await testAlertRule('token', RULE, MCP);

    expect(trial.readable).toBe(true);
    expect(trial.value).toBe(42);
    expect(trial.wouldFire).toBe(true);
  });

  it('keeps "could not read it" apart from "would not fire"', async () => {
    // Folded together, the one answer worth having disappears.
    vi.spyOn(DatalayerApi, 'requestDatalayerAPI').mockResolvedValue({
      readable: false,
      would_fire: false,
      detail: 'nothing reads sli.latency',
    } as never);

    const trial = await testAlertRule('token', RULE, MCP);

    expect(trial.readable).toBe(false);
    expect(trial.detail).toContain('sli.latency');
  });

  it('keeps a reading of zero rather than losing it', async () => {
    // Falsy and real: no open tasks is an answer.
    vi.spyOn(DatalayerApi, 'requestDatalayerAPI').mockResolvedValue({
      readable: true,
      value: 0,
      would_fire: false,
    } as never);

    expect((await testAlertRule('token', RULE, MCP)).value).toBe(0);
  });

  it('sends the wire names the gateway reads', async () => {
    const request = vi
      .spyOn(DatalayerApi, 'requestDatalayerAPI')
      .mockResolvedValue({ readable: true } as never);

    await testAlertRule('token', RULE, MCP);

    expect(request.mock.calls[0][0].body).toEqual({
      condition: 'tasks.open',
      operator: 'gt',
      threshold: 20,
      window_seconds: 300,
      scope_kind: 'organization',
      scope_uid: '',
    });
  });

  it('posts to the gateway rather than to IAM', async () => {
    // The reading comes from the service that holds the counters; IAM holds
    // the rule and has nothing to read it with.
    const request = vi
      .spyOn(DatalayerApi, 'requestDatalayerAPI')
      .mockResolvedValue({ readable: true } as never);

    await testAlertRule('token', RULE, MCP);

    expect(request.mock.calls[0][0].url).toContain('/alerts/test');
    expect(request.mock.calls[0][0].method).toBe('POST');
  });
});
