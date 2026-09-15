/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * The bridge session behind a `local-bridge` attachment.
 *
 * A session is what the attachment holds while a person's computer serves a
 * folder to the sandbox through the relay. A browser never serves one — the
 * CLI does — so what it does here is look: the session of an attachment,
 * the caller's sessions, and the one thing it may do to them, revoke.
 * Opening and heartbeating are here for completeness and for a desktop
 * client that embeds this library; a page has no folder to bind.
 */

import { RunResponseError, requestDatalayerAPI } from '../DatalayerApi';
import { API_BASE_PATHS, DEFAULT_SERVICE_URLS } from '../constants';
import { contentsToCamelCase, contentsToSnakeCase } from '../../models/contents';
import type { JsonValue } from '../../models/contents';
import type {
  BridgeCreate,
  BridgeHeartbeat,
  BridgeList,
  BridgeOpened,
  BridgeSession,
} from './generated';

export type BridgeState = BridgeSession['state'];

/** The states a bridge does not leave on its own; polling stops on them. */
export const ENDED_BRIDGE_STATES: ReadonlySet<BridgeState> = new Set<BridgeState>([
  'revoked',
  'expired',
]);

export const isBridgeEnded = (bridge: Pick<BridgeSession, 'state'>): boolean =>
  ENDED_BRIDGE_STATES.has(bridge.state);

const convert = <T>(value: unknown): T =>
  contentsToCamelCase(value as JsonValue) as unknown as T;

const contentsUrl = (baseUrl: string, suffix: string): string =>
  `${baseUrl}${API_BASE_PATHS.CONTENTS}${suffix}`;

/** Open the session of a `local-bridge` attachment, or find it open. */
export const openBridge = async (
  token: string,
  attachmentUid: string,
  request: BridgeCreate,
  baseUrl: string = DEFAULT_SERVICE_URLS.CONTENTS,
): Promise<BridgeOpened> =>
  convert<BridgeOpened>(
    await requestDatalayerAPI({
      url: contentsUrl(baseUrl, `/attachments/${encodeURIComponent(attachmentUid)}/bridge`),
      method: 'POST',
      token,
      body: contentsToSnakeCase(request as unknown as JsonValue),
    }),
  );

/**
 * The live session of one attachment, or `null` when none has been opened:
 * an attachment asked for and not yet dialled has no session, which is an
 * answer rather than a failure.
 */
export const getBridgeSession = async (
  token: string,
  attachmentUid: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.CONTENTS,
): Promise<BridgeSession | null> => {
  try {
    return convert<BridgeSession>(
      await requestDatalayerAPI({
        url: contentsUrl(baseUrl, `/attachments/${encodeURIComponent(attachmentUid)}/bridge`),
        method: 'GET',
        token,
      }),
    );
  } catch (error) {
    if (error instanceof RunResponseError && error.response.status === 404) {
      return null;
    }
    throw error;
  }
};

/** The caller's sessions, newest first; `active` leaves out the ended ones. */
export const listBridges = async (
  token: string,
  options: { active?: boolean } = {},
  baseUrl: string = DEFAULT_SERVICE_URLS.CONTENTS,
): Promise<BridgeList> => {
  const parameters = new URLSearchParams();
  parameters.set('active', String(options.active ?? false));
  return convert<BridgeList>(
    await requestDatalayerAPI({
      url: `${contentsUrl(baseUrl, '/bridges')}?${parameters.toString()}`,
      method: 'GET',
      token,
    }),
  );
};

export const getBridge = async (
  token: string,
  bridgeUid: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.CONTENTS,
): Promise<BridgeSession> =>
  convert<BridgeSession>(
    await requestDatalayerAPI({
      url: contentsUrl(baseUrl, `/bridges/${encodeURIComponent(bridgeUid)}`),
      method: 'GET',
      token,
    }),
  );

/** Still here: the session stays alive and the answer carries a fresh client token. */
export const heartbeatBridge = async (
  token: string,
  bridgeUid: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.CONTENTS,
): Promise<BridgeHeartbeat> =>
  convert<BridgeHeartbeat>(
    await requestDatalayerAPI({
      url: contentsUrl(baseUrl, `/bridges/${encodeURIComponent(bridgeUid)}/heartbeat`),
      method: 'POST',
      token,
    }),
  );

/** End a session: its tokens stop working before the sandbox side unmounts. */
export const revokeBridge = async (
  token: string,
  bridgeUid: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.CONTENTS,
): Promise<BridgeSession> =>
  convert<BridgeSession>(
    await requestDatalayerAPI({
      url: contentsUrl(baseUrl, `/bridges/${encodeURIComponent(bridgeUid)}`),
      method: 'DELETE',
      token,
    }),
  );
