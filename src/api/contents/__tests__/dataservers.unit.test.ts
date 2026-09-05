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
import {
  dataserverActionAvailability,
  drainDataserver,
  getDataserverStatus,
  issueDataserverIdentity,
  resumeDataserver,
  revokeDataserver,
  rotateDataserverIdentity,
  testDataserver,
} from '../dataservers';

const SOURCE = '01ARZ3NDEKTSV4RRFFQ69G5FAV';
const BASE = 'https://contents';

const status = (state: string) => ({
  state,
  last_heartbeat_at: '2026-08-26T12:00:00Z',
  lease_seconds: 90,
  connectors: [{ connector_type: 'sql', operations: ['select'], policy_version: '3' }],
  queue_depth: 2,
  identity_serial: '1a2b',
  identity_expires_at: '2026-12-01T00:00:00Z',
});

describe('Contents dataserver API', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('reads the status and moves the gateway between states', async () => {
    const request = vi
      .spyOn(DatalayerApi, 'requestDatalayerAPI')
      .mockResolvedValueOnce(status('ready'))
      .mockResolvedValueOnce(status('draining'))
      .mockResolvedValueOnce(status('ready'))
      .mockResolvedValueOnce(status('revoked'))
      .mockResolvedValueOnce({
        ok: true,
        flight: { reachable: true, endpoint: 'grpc+tls://flight.example', detail: 'gRPC reachable' },
        https_fallback: { reachable: false, url: null, detail: 'blocked at the edge' },
        detail: 'gRPC reachable',
      });

    const read = await getDataserverStatus('token', SOURCE, BASE);
    const drained = await drainDataserver('token', SOURCE, BASE);
    const resumed = await resumeDataserver('token', SOURCE, BASE);
    const revoked = await revokeDataserver('token', SOURCE, BASE);
    const tested = await testDataserver('token', SOURCE, BASE);

    expect(read.connectors[0]).toEqual({ connectorType: 'sql', operations: ['select'], policyVersion: '3' });
    expect(read.queueDepth).toBe(2);
    expect([drained.state, resumed.state, revoked.state]).toEqual(['draining', 'ready', 'revoked']);
    expect(tested.flight.reachable).toBe(true);
    expect(tested.httpsFallback.reachable).toBe(false);
    expect(request.mock.calls.map(call => [call[0].url, call[0].method])).toEqual([
      [`${BASE}/api/contents/v1/dataservers/${SOURCE}/status`, 'GET'],
      [`${BASE}/api/contents/v1/dataservers/${SOURCE}/drain`, 'POST'],
      [`${BASE}/api/contents/v1/dataservers/${SOURCE}/resume`, 'POST'],
      [`${BASE}/api/contents/v1/dataservers/${SOURCE}/revoke`, 'POST'],
      [`${BASE}/api/contents/v1/dataservers/${SOURCE}/test`, 'POST'],
    ]);
  });

  it('issues and rotates an identity from a CSR and gets only a certificate back', async () => {
    const request = vi
      .spyOn(DatalayerApi, 'requestDatalayerAPI')
      .mockResolvedValueOnce({ certificate: 'CERT', serial: '1a2c', expires_at: '2027-01-01T00:00:00Z', ca_certificate: 'CA' })
      .mockResolvedValueOnce({ certificate: 'CERT2', serial: '1a2d', expires_at: '2027-06-01T00:00:00Z', ca_certificate: 'CA' });

    const issued = await issueDataserverIdentity('token', SOURCE, { csr: 'CSR' }, BASE);
    const rotated = await rotateDataserverIdentity('token', SOURCE, { csr: 'CSR2' }, BASE);

    expect(issued.serial).toBe('1a2c');
    expect(issued.caCertificate).toBe('CA');
    expect(rotated.serial).toBe('1a2d');
    expect(Object.keys(issued)).not.toContain('privateKey');
    expect(request.mock.calls[0][0]).toEqual(
      expect.objectContaining({ url: `${BASE}/api/contents/v1/dataservers/${SOURCE}/identity`, body: { csr: 'CSR' } }),
    );
    expect(request.mock.calls[1][0].url).toBe(`${BASE}/api/contents/v1/dataservers/${SOURCE}/identity/rotate`);
  });

  describe('action availability', () => {
    const owner = { isOwner: true, update: true, execute: true };
    const viewer = { isOwner: false, update: false, execute: false };
    const executor = { isOwner: false, update: false, execute: true };

    it('lets an owner drain an online gateway and resume a draining one, not the other way round', () => {
      const online = dataserverActionAvailability('ready', owner);
      const draining = dataserverActionAvailability('draining', owner);

      expect(online.drain.enabled).toBe(true);
      expect(online.resume).toEqual({ enabled: false, reason: 'Only a draining gateway is resumed.' });
      expect(draining.drain).toEqual({ enabled: false, reason: 'The gateway is already draining.' });
      expect(draining.resume.enabled).toBe(true);
    });

    it('names the state as the reason on a revoked or silent gateway', () => {
      const revoked = dataserverActionAvailability('revoked', owner);
      const silent = dataserverActionAvailability('unavailable', owner);

      expect(revoked.test.enabled).toBe(false);
      expect(revoked.test.reason).toMatch(/revoked/);
      expect(revoked.revoke).toEqual({ enabled: false, reason: 'The gateway is already revoked.' });
      expect(revoked.rotateIdentity.enabled).toBe(false);
      // The record stays: it can still be archived or deleted.
      expect(revoked.archive.enabled).toBe(true);
      expect(revoked.delete.enabled).toBe(true);
      expect(silent.drain.enabled).toBe(false);
      expect(silent.drain.reason).toMatch(/not online/);
      expect(silent.revoke.enabled).toBe(true);
    });

    it('gates management on the permission before the state', () => {
      const asViewer = dataserverActionAvailability('ready', viewer);
      const asExecutor = dataserverActionAvailability('ready', executor);

      expect(asViewer.test.enabled).toBe(false);
      expect(asViewer.drain).toEqual({ enabled: false, reason: 'Only the owner or an update-holder may do this.' });
      expect(asExecutor.test.enabled).toBe(true);
      expect(asExecutor.revoke.enabled).toBe(false);
      expect(dataserverActionAvailability('ready', owner, { archived: true }).archive.enabled).toBe(false);
    });
  });
});
