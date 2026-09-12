/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as DatalayerApi from '../../DatalayerApi';
import {
  cancelSyncSession,
  createSyncSession,
  getSyncSession,
  heartbeatSyncSession,
  listSyncConflicts,
  listSyncSessions,
  reconcileSyncSession,
  reportSyncSession,
  resolveSyncConflict,
} from '../sync';

const BASE = 'https://contents.test';
const SYNC = `${BASE}/api/contents/v1/sync`;

const session = {
  uid: '01SESSION',
  source_uid: '01SOURCE',
  remote_uri: 'home-folder:///research',
  direction: 'bidirectional',
  conflict_policy: 'manual',
  delete: false,
  watch: true,
  block_size: 4194304,
  exclusions: ['*.tmp'],
  status: 'watching',
  plan: { actions: [{ kind: 'download', path: 'a.csv', reason: 'remote-changed', blocks: [0, 2] }] },
  uploaded_files: 1,
  downloaded_files: 2,
  deleted_files: 0,
  conflict_count: 1,
  transferred_bytes: 4096,
  reconciliations: 3,
  last_heartbeat_at: '2026-08-24T12:00:05Z',
  error_code: null,
  error_message: null,
  created_at: '2026-08-24T12:00:00Z',
  updated_at: '2026-08-24T12:00:05Z',
  completed_at: null,
};

const manifest = {
  blockSize: 4194304,
  entries: [
    {
      path: 'a.csv',
      size: 5,
      modifiedAt: '2026-08-24T11:59:00Z',
      checksum: 'a'.repeat(64),
      blocks: ['b'.repeat(64)],
    },
  ],
  tombstones: { 'gone.txt': '2026-08-24T11:00:00Z' },
};

describe('Contents sync API', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('opens a session with an idempotency key and a snake-case manifest', async () => {
    const request = vi
      .spyOn(DatalayerApi, 'requestDatalayerAPI')
      .mockResolvedValueOnce(session);

    const created = await createSyncSession(
      'token',
      {
        remoteUri: 'home-folder:///research',
        direction: 'bidirectional',
        conflictPolicy: 'manual',
        watch: true,
        exclusions: ['*.tmp'],
        localManifest: manifest,
      },
      'sync-research',
      BASE,
    );

    expect(created.remoteUri).toBe('home-folder:///research');
    expect(created.blockSize).toBe(4194304);
    expect(created.plan?.actions?.[0]).toEqual({
      kind: 'download',
      path: 'a.csv',
      reason: 'remote-changed',
      blocks: [0, 2],
    });
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        url: SYNC,
        method: 'POST',
        token: 'token',
        headers: { 'Idempotency-Key': 'sync-research' },
        body: expect.objectContaining({
          remote_uri: 'home-folder:///research',
          conflict_policy: 'manual',
          local_manifest: expect.objectContaining({
            block_size: 4194304,
            entries: [
              expect.objectContaining({
                modified_at: '2026-08-24T11:59:00Z',
                checksum: 'a'.repeat(64),
              }),
            ],
          }),
        }),
      }),
    );
  });

  it('reads one session and lists them with the active filter and cursor', async () => {
    const request = vi
      .spyOn(DatalayerApi, 'requestDatalayerAPI')
      .mockResolvedValueOnce(session)
      .mockResolvedValueOnce({ items: [session], next_cursor: 'more' })
      .mockResolvedValueOnce({ items: [], next_cursor: null });

    const one = await getSyncSession('token', 'id/with slash', BASE);
    const active = await listSyncSessions(
      'token',
      { active: true, limit: 5, cursor: 'c1' },
      BASE,
    );
    const defaults = await listSyncSessions('token', {}, BASE);

    expect(one.lastHeartbeatAt).toBe('2026-08-24T12:00:05Z');
    expect(one.conflictCount).toBe(1);
    expect(active.items[0].transferredBytes).toBe(4096);
    expect(active.nextCursor).toBe('more');
    expect(defaults.nextCursor).toBeNull();
    expect(request).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ url: `${SYNC}/id%2Fwith%20slash`, method: 'GET' }),
    );
    expect(request).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        url: `${SYNC}?active=true&limit=5&cursor=c1`,
        method: 'GET',
      }),
    );
    expect(request).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({ url: `${SYNC}?active=false&limit=50` }),
    );
  });

  it('reconciles with a fresh manifest, heartbeats and reports', async () => {
    const request = vi
      .spyOn(DatalayerApi, 'requestDatalayerAPI')
      .mockResolvedValue(session);

    await reconcileSyncSession('token', '01SESSION', { localManifest: manifest }, BASE);
    await heartbeatSyncSession('token', '01SESSION', BASE);
    const reported = await reportSyncSession(
      'token',
      '01SESSION',
      { applied: ['a.csv'], failed: { 'b.csv': 'EACCES' }, transferredBytes: 4096 },
      BASE,
    );

    expect(reported.uploadedFiles).toBe(1);
    expect(request).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        url: `${SYNC}/01SESSION/reconcile`,
        method: 'POST',
        body: {
          local_manifest: expect.objectContaining({
            tombstones: { 'gone.txt': '2026-08-24T11:00:00Z' },
          }),
        },
      }),
    );
    expect(request).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ url: `${SYNC}/01SESSION/heartbeat`, method: 'POST' }),
    );
    expect(request.mock.calls[1][0]).not.toHaveProperty('body');
    expect(request).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        url: `${SYNC}/01SESSION/report`,
        method: 'POST',
        body: {
          applied: ['a.csv'],
          failed: { 'b.csv': 'EACCES' },
          transferred_bytes: 4096,
        },
      }),
    );
  });

  it('cancels a session with DELETE', async () => {
    const request = vi
      .spyOn(DatalayerApi, 'requestDatalayerAPI')
      .mockResolvedValueOnce({ ...session, status: 'cancelled', completed_at: '2026-08-24T12:01:00Z' });

    const cancelled = await cancelSyncSession('token', '01SESSION', BASE);

    expect(cancelled.status).toBe('cancelled');
    expect(cancelled.completedAt).toBe('2026-08-24T12:01:00Z');
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({ url: `${SYNC}/01SESSION`, method: 'DELETE', token: 'token' }),
    );
  });

  it('lists conflicts with both versions and resolves one into the session', async () => {
    const conflict = {
      uid: '01CONFLICT',
      session_uid: '01SESSION',
      path: 'notes.md',
      reason: 'both-changed',
      local_entry: {
        path: 'notes.md',
        size: 10,
        modified_at: '2026-08-24T11:58:00Z',
        checksum: 'c'.repeat(64),
      },
      remote_entry: null,
      status: 'open',
      resolution: null,
      resolved_at: null,
      created_at: '2026-08-24T12:00:01Z',
    };
    const request = vi
      .spyOn(DatalayerApi, 'requestDatalayerAPI')
      .mockResolvedValueOnce({ items: [conflict] })
      .mockResolvedValueOnce({ items: [conflict] })
      .mockResolvedValueOnce({ ...session, conflict_count: 0 });

    const open = await listSyncConflicts('token', '01SESSION', { openOnly: true }, BASE);
    const all = await listSyncConflicts('token', '01SESSION', {}, BASE);
    const resolved = await resolveSyncConflict(
      'token',
      '01SESSION',
      '01CONFLICT',
      { use: 'keep-both' },
      BASE,
    );

    expect(open.items[0].localEntry?.modifiedAt).toBe('2026-08-24T11:58:00Z');
    expect(open.items[0].remoteEntry).toBeNull();
    expect(open.items[0].sessionUid).toBe('01SESSION');
    expect(all.items).toHaveLength(1);
    expect(resolved.conflictCount).toBe(0);
    expect(request).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        url: `${SYNC}/01SESSION/conflicts?open_only=true`,
        method: 'GET',
      }),
    );
    expect(request).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ url: `${SYNC}/01SESSION/conflicts?open_only=false` }),
    );
    expect(request).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        url: `${SYNC}/01SESSION/conflicts/01CONFLICT/resolve`,
        method: 'POST',
        body: { use: 'keep-both' },
      }),
    );
  });

  it('falls back to the default Contents service URL', async () => {
    const request = vi
      .spyOn(DatalayerApi, 'requestDatalayerAPI')
      .mockResolvedValueOnce(session);

    await getSyncSession('token', '01SESSION');

    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        url: expect.stringMatching(/^https:\/\/.+\/api\/contents\/v1\/sync\/01SESSION$/),
      }),
    );
  });
});
