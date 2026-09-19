/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as DatalayerApi from '../../DatalayerApi';
import {
  attachRuntimeMounts,
  detachRuntimeMount,
  getRuntimeMounts,
  isRuntimeMountsSettled,
} from '../runtimeMounts';

const answer = {
  success: true,
  message: '2 folder(s) mounted.',
  state: 'ready',
  mounts: [
    { source: 'home/users/01H', target: 'eric', mode: 'rw', allow_exec: true },
    { source: 'home/organizations/01J', target: 'datalayer', mode: 'rw', allow_exec: true },
  ],
  mounted: ['datalayer', 'eric'],
  failed: {},
};

describe('Runtime mounts API', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('reads what a running Runtime is granted and what has arrived', async () => {
    const request = vi
      .spyOn(DatalayerApi, 'requestDatalayerAPI')
      .mockResolvedValueOnce(answer);

    const mounts = await getRuntimeMounts('token', 'jupyter-1', 'https://r1.datalayer.run');

    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'https://r1.datalayer.run/api/runtimes/v1/runtimes/jupyter-1/mounts',
        method: 'GET',
      }),
    );
    expect(mounts.mounted).toEqual(['datalayer', 'eric']);
    // Snake case on the wire, camel case in the client.
    expect(mounts.mounts[0].allowExec).toBe(true);
  });

  it('never names the folders when attaching', async () => {
    const request = vi
      .spyOn(DatalayerApi, 'requestDatalayerAPI')
      .mockResolvedValueOnce(answer);

    await attachRuntimeMounts('token', 'jupyter-1');

    // Which folders is not the client's to say: the platform resolves the
    // caller's own memberships, and a body naming one would be a way to
    // mount it.
    const [options] = request.mock.calls[0];
    expect(options.method).toBe('POST');
    expect(options.body).toEqual({});
  });

  it('detaches one folder by the name it appears under', async () => {
    const request = vi
      .spyOn(DatalayerApi, 'requestDatalayerAPI')
      .mockResolvedValueOnce({ ...answer, mounted: ['eric'] });

    await detachRuntimeMount('token', 'jupyter-1', 'datalayer');

    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        url: expect.stringContaining('/runtimes/jupyter-1/mounts/datalayer'),
        method: 'DELETE',
      }),
    );
  });

  it('escapes a name rather than putting it in a path raw', async () => {
    const request = vi
      .spyOn(DatalayerApi, 'requestDatalayerAPI')
      .mockResolvedValueOnce(answer);

    await detachRuntimeMount('token', 'jupyter-1', 'a/b');

    const [options] = request.mock.calls[0];
    expect(options.url).toContain('a%2Fb');
  });

  it('fills in the collections an older answer may not carry', async () => {
    vi.spyOn(DatalayerApi, 'requestDatalayerAPI').mockResolvedValueOnce({
      success: true,
      message: 'none',
      state: 'ready',
    });

    const mounts = await getRuntimeMounts('token', 'jupyter-1');

    expect(mounts.mounts).toEqual([]);
    expect(mounts.mounted).toEqual([]);
    expect(mounts.failed).toEqual({});
  });

  it('knows when the platform has finished applying a change', () => {
    // Polling stops on ready and on degraded — degraded is an answer, not a
    // state still being worked on.
    expect(isRuntimeMountsSettled({ ...answer } as any)).toBe(true);
    expect(isRuntimeMountsSettled({ ...answer, state: 'degraded' } as any)).toBe(true);
    expect(isRuntimeMountsSettled({ ...answer, state: 'GATEWAY_NOT_READY' } as any)).toBe(false);
    expect(isRuntimeMountsSettled(undefined)).toBe(false);
  });
});
