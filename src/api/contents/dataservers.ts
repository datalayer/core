/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * A Dataserver registration through the service: read, moved, re-identified.
 *
 * The gateway itself runs in a customer's network. What is here is what it
 * last said of itself — a heartbeat lease, the connectors it advertises,
 * its queue — and the levers the catalog has on it: drain, resume, revoke,
 * and a certificate issued or rotated from a CSR the gateway made, so the
 * private key never travels.
 *
 * The wire types are the generated ones; what is declared here is what the
 * contract does not name — the state union as a standalone type, its labels,
 * and which action a reader may take on a gateway in a given state.
 */

import { requestDatalayerAPI } from '../DatalayerApi';
import { API_BASE_PATHS, DEFAULT_SERVICE_URLS } from '../constants';
import { contentsToCamelCase } from '../../models/contents';
import type { JsonValue } from '../../models/contents';
import type {
  CertificateSigningRequest,
  DataServerConnectivity,
  DataServerStatus,
  EffectivePermissions,
  IssuedIdentity,
} from './generated';

/** The states the service keeps a registration in. */
export type DataserverState = DataServerStatus['state'];

export const DATASERVER_STATES: ReadonlyArray<DataserverState> = [
  'registering',
  'ready',
  'degraded',
  'unavailable',
  'draining',
  'revoked',
];

/** The state as a person reads it. */
export const DATASERVER_STATE_LABELS: Record<DataserverState, string> = {
  registering: 'Registering',
  ready: 'Online',
  degraded: 'Degraded',
  unavailable: 'Offline',
  draining: 'Draining',
  revoked: 'Revoked',
};

export type DataserverAction =
  | 'test'
  | 'rotateIdentity'
  | 'drain'
  | 'resume'
  | 'revoke'
  | 'archive'
  | 'delete';

export interface DataserverActionAvailability {
  enabled: boolean;
  /** Why not, when not: the state or the permission that stands in the way. */
  reason?: string;
}

/**
 * Which actions a reader may take on a gateway in this state, and why not.
 *
 * `view` inspects; `execute` tests; owner or update-holder registers,
 * rotates, drains, resumes, revokes, archives and deletes. A gateway that is
 * revoked, or one that has gone quiet, keeps its record — the disabled
 * actions name the state as the reason rather than disappearing.
 */
export const dataserverActionAvailability = (
  state: DataserverState | null | undefined,
  permissions: Pick<EffectivePermissions, 'isOwner' | 'update' | 'execute'>,
  options: { archived?: boolean } = {},
): Record<DataserverAction, DataserverActionAvailability> => {
  const manages = permissions.isOwner || permissions.update;
  const needsManage = 'Only the owner or an update-holder may do this.';
  const revoked = state === 'revoked';
  const decide = (
    allowed: boolean,
    permissionReason: string,
    stateReason?: string,
  ): DataserverActionAvailability => {
    if (!allowed) {
      return { enabled: false, reason: permissionReason };
    }
    if (stateReason) {
      return { enabled: false, reason: stateReason };
    }
    return { enabled: true };
  };
  return {
    test: decide(
      permissions.execute || manages,
      'Only someone who may execute through this gateway can test it.',
      revoked ? 'The gateway is revoked; its identity is no longer accepted.' : undefined,
    ),
    rotateIdentity: decide(
      manages,
      needsManage,
      revoked ? 'A revoked gateway is re-admitted with a new identity, not a rotation.' : undefined,
    ),
    drain: decide(
      manages,
      needsManage,
      revoked
        ? 'The gateway is revoked.'
        : state === 'draining'
          ? 'The gateway is already draining.'
          : state === 'registering' || state === 'unavailable' || !state
            ? 'Nothing routes to a gateway that is not online; there is nothing to drain.'
            : undefined,
    ),
    resume: decide(
      manages,
      needsManage,
      revoked
        ? 'The gateway is revoked.'
        : state !== 'draining'
          ? 'Only a draining gateway is resumed.'
          : undefined,
    ),
    revoke: decide(manages, needsManage, revoked ? 'The gateway is already revoked.' : undefined),
    archive: decide(
      manages,
      needsManage,
      options.archived ? 'The registration is already archived.' : undefined,
    ),
    delete: decide(manages, needsManage),
  };
};

const convertResponse = <T>(value: unknown): T =>
  contentsToCamelCase(value as JsonValue) as T;

const dataserverUrl = (baseUrl: string, sourceUid: string, suffix = ''): string =>
  `${baseUrl}${API_BASE_PATHS.CONTENTS}/dataservers/${encodeURIComponent(sourceUid)}${suffix}`;

/** The gateway as last heard: its lease, its connectors, its queue. */
export const getDataserverStatus = async (
  token: string,
  sourceUid: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.CONTENTS,
): Promise<DataServerStatus> =>
  convertResponse<DataServerStatus>(
    await requestDatalayerAPI({
      url: dataserverUrl(baseUrl, sourceUid, '/status'),
      method: 'GET',
      token,
    }),
  );

/** Try the gateway on Flight and on the HTTPS fallback; the answer is a verdict per path. */
export const testDataserver = async (
  token: string,
  sourceUid: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.CONTENTS,
): Promise<DataServerConnectivity> =>
  convertResponse<DataServerConnectivity>(
    await requestDatalayerAPI({
      url: dataserverUrl(baseUrl, sourceUid, '/test'),
      method: 'POST',
      token,
    }),
  );

const transition = async (
  token: string,
  sourceUid: string,
  action: 'drain' | 'resume' | 'revoke',
  baseUrl: string,
): Promise<DataServerStatus> =>
  convertResponse<DataServerStatus>(
    await requestDatalayerAPI({
      url: dataserverUrl(baseUrl, sourceUid, `/${action}`),
      method: 'POST',
      token,
    }),
  );

/** Stop routing new queries; the ones running finish. */
export const drainDataserver = (
  token: string,
  sourceUid: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.CONTENTS,
): Promise<DataServerStatus> => transition(token, sourceUid, 'drain', baseUrl);

/** Route to the gateway again. */
export const resumeDataserver = (
  token: string,
  sourceUid: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.CONTENTS,
): Promise<DataServerStatus> => transition(token, sourceUid, 'resume', baseUrl);

/** Refuse the gateway's identity from now on. Nothing in its network changes. */
export const revokeDataserver = (
  token: string,
  sourceUid: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.CONTENTS,
): Promise<DataServerStatus> => transition(token, sourceUid, 'revoke', baseUrl);

/** A first certificate for the identity the CSR names. */
export const issueDataserverIdentity = async (
  token: string,
  sourceUid: string,
  request: CertificateSigningRequest,
  baseUrl: string = DEFAULT_SERVICE_URLS.CONTENTS,
): Promise<IssuedIdentity> =>
  convertResponse<IssuedIdentity>(
    await requestDatalayerAPI({
      url: dataserverUrl(baseUrl, sourceUid, '/identity'),
      method: 'POST',
      token,
      body: { csr: request.csr },
    }),
  );

/** A new certificate that overlaps the current one, so nothing stops. */
export const rotateDataserverIdentity = async (
  token: string,
  sourceUid: string,
  request: CertificateSigningRequest,
  baseUrl: string = DEFAULT_SERVICE_URLS.CONTENTS,
): Promise<IssuedIdentity> =>
  convertResponse<IssuedIdentity>(
    await requestDatalayerAPI({
      url: dataserverUrl(baseUrl, sourceUid, '/identity/rotate'),
      method: 'POST',
      token,
      body: { csr: request.csr },
    }),
  );
