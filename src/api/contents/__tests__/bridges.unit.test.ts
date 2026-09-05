/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as DatalayerApi from '../../DatalayerApi';
import { RunResponseError } from '../../DatalayerApi';
import {
  getBridgeSession,
  heartbeatBridge,
  isBridgeEnded,
  listBridges,
  openBridge,
  revokeBridge,
} from '../bridges';

const BASE = 'https://contents.test';
const CONTENTS = `${BASE}/api/contents/v1`;

const bridge = {
  uid: '01BRIDGE',
  attachment_uid: '01ATTACHMENT',
  sandbox_uid: '01SANDBOX',
  owner_uid: '01OWNER',
  mount_path: '/home/jovyan/local',
  mode: 'ro',
  local_root_fingerprint: 'a'.repeat(64),
  exclusions: ['*.tmp'],
  state: 'connected',
  client_seen_at: '2026-08-26T12:00:00Z',
  mount_seen_at: '2026-08-26T12:00:30Z',
  created_at: '2026-08-26T12:00:00Z',
  updated_at: '2026-08-26T12:00:30Z',
  expires_at: '2026-08-27T00:00:00Z',
  revoked_at: null,
};

describe('Contents bridge API', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('reads the session of an attachment in camel case', async () => {
    const request = vi
      .spyOn(DatalayerApi, 'requestDatalayerAPI')
      .mockResolvedValueOnce(bridge);

    const session = await getBridgeSession('token', '01ATTACHMENT', BASE);

    expect(session).not.toBeNull();
    expect(session?.attachmentUid).toBe('01ATTACHMENT');
    expect(session?.mountSeenAt).toBe('2026-08-26T12:00:30Z');
    expect(session?.localRootFingerprint).toBe('a'.repeat(64));
    expect(isBridgeEnded(session!)).toBe(false);
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        url: `${CONTENTS}/attachments/01ATTACHMENT/bridge`,
        method: 'GET',
      }),
    );
  });

  it('answers null for an attachment nothing has dialled yet, and rethrows anything else', async () => {
    vi.spyOn(DatalayerApi, 'requestDatalayerAPI').mockRejectedValueOnce(
      new RunResponseError({ status: 404 } as Response, 'Bridge session not found'),
    );
    expect(await getBridgeSession('token', '01ATTACHMENT', BASE)).toBeNull();

    vi.spyOn(DatalayerApi, 'requestDatalayerAPI').mockRejectedValueOnce(
      new RunResponseError({ status: 403 } as Response, 'forbidden'),
    );
    await expect(getBridgeSession('token', '01ATTACHMENT', BASE)).rejects.toThrow('forbidden');
  });

  it('opens a session with a snake-case fingerprint and never a path', async () => {
    const request = vi
      .spyOn(DatalayerApi, 'requestDatalayerAPI')
      .mockResolvedValueOnce({
        bridge,
        client_token: 'client-token',
        relay_url: 'wss://relay.test/bridges/01BRIDGE',
        session_key: 'ab'.repeat(32),
      });

    const opened = await openBridge(
      'token',
      '01ATTACHMENT',
      { localRootFingerprint: 'a'.repeat(64), exclusions: ['*.tmp'] },
      BASE,
    );

    expect(opened.clientToken).toBe('client-token');
    expect(opened.relayUrl).toBe('wss://relay.test/bridges/01BRIDGE');
    expect(opened.bridge.state).toBe('connected');
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        url: `${CONTENTS}/attachments/01ATTACHMENT/bridge`,
        method: 'POST',
        body: { local_root_fingerprint: 'a'.repeat(64), exclusions: ['*.tmp'] },
      }),
    );
  });

  it('lists, heartbeats and revokes by uid', async () => {
    const request = vi
      .spyOn(DatalayerApi, 'requestDatalayerAPI')
      .mockResolvedValueOnce({ items: [bridge] })
      .mockResolvedValueOnce({ bridge, client_token: 'fresh' })
      .mockResolvedValueOnce({ ...bridge, state: 'revoked', revoked_at: '2026-08-26T13:00:00Z' });

    const listed = await listBridges('token', { active: true }, BASE);
    const beat = await heartbeatBridge('token', '01BRIDGE', BASE);
    const revoked = await revokeBridge('token', '01BRIDGE', BASE);

    expect(listed.items[0].uid).toBe('01BRIDGE');
    expect(beat.clientToken).toBe('fresh');
    expect(revoked.state).toBe('revoked');
    expect(revoked.revokedAt).toBe('2026-08-26T13:00:00Z');
    expect(isBridgeEnded(revoked)).toBe(true);
    expect(request).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ url: `${CONTENTS}/bridges?active=true`, method: 'GET' }),
    );
    expect(request).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ url: `${CONTENTS}/bridges/01BRIDGE/heartbeat`, method: 'POST' }),
    );
    expect(request).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({ url: `${CONTENTS}/bridges/01BRIDGE`, method: 'DELETE' }),
    );
  });
});
