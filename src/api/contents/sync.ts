/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { requestDatalayerAPI } from '../DatalayerApi';
import { API_BASE_PATHS, DEFAULT_SERVICE_URLS } from '../constants';
import { contentsToCamelCase, contentsToSnakeCase } from '../../models/contents';
import type { JsonValue } from '../../models/contents';
import type {
  ConflictResolution,
  SyncConflictList,
  SyncCreate,
  SyncReconcile,
  SyncReport,
  SyncSessionList,
  SyncSessionView,
} from './generated';

const convertResponse = <T>(value: unknown): T =>
  contentsToCamelCase(value as JsonValue) as unknown as T;

const convertRequest = (value: unknown): JsonValue =>
  contentsToSnakeCase(value as JsonValue);

const syncUrl = (baseUrl: string, suffix = ''): string =>
  `${baseUrl}${API_BASE_PATHS.CONTENTS}/sync${suffix}`;

/** Open a synchronization session; the answer carries the first plan. */
export const createSyncSession = async (
  token: string,
  request: SyncCreate,
  idempotencyKey: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.CONTENTS,
): Promise<SyncSessionView> =>
  convertResponse<SyncSessionView>(
    await requestDatalayerAPI({
      url: syncUrl(baseUrl),
      method: 'POST',
      token,
      headers: { 'Idempotency-Key': idempotencyKey },
      body: convertRequest(request),
    }),
  );

export const getSyncSession = async (
  token: string,
  sessionUid: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.CONTENTS,
): Promise<SyncSessionView> =>
  convertResponse<SyncSessionView>(
    await requestDatalayerAPI({
      url: syncUrl(baseUrl, `/${encodeURIComponent(sessionUid)}`),
      method: 'GET',
      token,
    }),
  );

export const listSyncSessions = async (
  token: string,
  options: { active?: boolean; cursor?: string; limit?: number } = {},
  baseUrl: string = DEFAULT_SERVICE_URLS.CONTENTS,
): Promise<SyncSessionList> => {
  const parameters = new URLSearchParams();
  parameters.set('active', String(options.active ?? false));
  parameters.set('limit', String(options.limit ?? 50));
  if (options.cursor) parameters.set('cursor', options.cursor);
  return convertResponse<SyncSessionList>(
    await requestDatalayerAPI({
      url: `${syncUrl(baseUrl)}?${parameters.toString()}`,
      method: 'GET',
      token,
    }),
  );
};

/** A fresh local manifest; a fresh plan. A watch pass and a reconnect both. */
export const reconcileSyncSession = async (
  token: string,
  sessionUid: string,
  request: SyncReconcile,
  baseUrl: string = DEFAULT_SERVICE_URLS.CONTENTS,
): Promise<SyncSessionView> =>
  convertResponse<SyncSessionView>(
    await requestDatalayerAPI({
      url: syncUrl(baseUrl, `/${encodeURIComponent(sessionUid)}/reconcile`),
      method: 'POST',
      token,
      body: convertRequest(request),
    }),
  );

export const heartbeatSyncSession = async (
  token: string,
  sessionUid: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.CONTENTS,
): Promise<SyncSessionView> =>
  convertResponse<SyncSessionView>(
    await requestDatalayerAPI({
      url: syncUrl(baseUrl, `/${encodeURIComponent(sessionUid)}/heartbeat`),
      method: 'POST',
      token,
    }),
  );

export const reportSyncSession = async (
  token: string,
  sessionUid: string,
  request: SyncReport,
  baseUrl: string = DEFAULT_SERVICE_URLS.CONTENTS,
): Promise<SyncSessionView> =>
  convertResponse<SyncSessionView>(
    await requestDatalayerAPI({
      url: syncUrl(baseUrl, `/${encodeURIComponent(sessionUid)}/report`),
      method: 'POST',
      token,
      body: convertRequest(request),
    }),
  );

export const cancelSyncSession = async (
  token: string,
  sessionUid: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.CONTENTS,
): Promise<SyncSessionView> =>
  convertResponse<SyncSessionView>(
    await requestDatalayerAPI({
      url: syncUrl(baseUrl, `/${encodeURIComponent(sessionUid)}`),
      method: 'DELETE',
      token,
    }),
  );

export const listSyncConflicts = async (
  token: string,
  sessionUid: string,
  options: { openOnly?: boolean } = {},
  baseUrl: string = DEFAULT_SERVICE_URLS.CONTENTS,
): Promise<SyncConflictList> =>
  convertResponse<SyncConflictList>(
    await requestDatalayerAPI({
      url: syncUrl(
        baseUrl,
        `/${encodeURIComponent(sessionUid)}/conflicts?open_only=${String(options.openOnly ?? false)}`,
      ),
      method: 'GET',
      token,
    }),
  );

export const resolveSyncConflict = async (
  token: string,
  sessionUid: string,
  conflictUid: string,
  request: ConflictResolution,
  baseUrl: string = DEFAULT_SERVICE_URLS.CONTENTS,
): Promise<SyncSessionView> =>
  convertResponse<SyncSessionView>(
    await requestDatalayerAPI({
      url: syncUrl(
        baseUrl,
        `/${encodeURIComponent(sessionUid)}/conflicts/${encodeURIComponent(conflictUid)}/resolve`,
      ),
      method: 'POST',
      token,
      body: convertRequest(request),
    }),
  );
