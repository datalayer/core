/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * A bucket through the service: listed, stat'ed, read, tested and signed.
 *
 * The credential never comes this way. The service resolves it for each
 * request and hands it to a provider adapter; what a browser gets back is
 * objects, bytes, a verdict, or a URL good for one path, one operation and a
 * bounded time.
 */

import {
  requestDatalayerAPI,
  requestDatalayerAPIWithResponse,
} from '../DatalayerApi';
import { API_BASE_PATHS, DEFAULT_SERVICE_URLS } from '../constants';
import { contentsToCamelCase } from '../../models/contents';
import type { JsonValue } from '../../models/contents';
import type {
  CloudObjectList,
  CloudObjectView,
  ConnectionTest,
  CredentialDiagnostics,
  CatalogSource,
} from './generated';

export interface PresignedObjectUrl {
  url: string;
  operation: 'get' | 'put';
  expiresIn: number;
}

const convertResponse = <T>(value: unknown): T =>
  contentsToCamelCase(value as JsonValue) as T;

const cloudUrl = (baseUrl: string, sourceUid: string, suffix = ''): string =>
  `${baseUrl}${API_BASE_PATHS.CONTENTS}/sources/${encodeURIComponent(sourceUid)}/cloud${suffix}`;

/** One page of a bucket under a prefix; `nextCursor` continues it. */
export const listCloudObjects = async (
  token: string,
  sourceUid: string,
  options: { prefix?: string; cursor?: string } = {},
  baseUrl: string = DEFAULT_SERVICE_URLS.CONTENTS,
): Promise<CloudObjectList> => {
  const parameters = new URLSearchParams();
  if (options.prefix) {
    parameters.set('prefix', options.prefix);
  }
  if (options.cursor) {
    parameters.set('cursor', options.cursor);
  }
  const query = parameters.toString();
  return convertResponse<CloudObjectList>(
    await requestDatalayerAPI({
      url: `${cloudUrl(baseUrl, sourceUid, '/objects')}${query ? `?${query}` : ''}`,
      method: 'GET',
      token,
    }),
  );
};

export const statCloudObject = async (
  token: string,
  sourceUid: string,
  path: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.CONTENTS,
): Promise<CloudObjectView> =>
  convertResponse<CloudObjectView>(
    await requestDatalayerAPI({
      url: `${cloudUrl(baseUrl, sourceUid, '/objects/stat')}?path=${encodeURIComponent(path)}`,
      method: 'GET',
      token,
    }),
  );

/** The bytes of one object, or a range of them. */
export const downloadCloudObject = async (
  token: string,
  sourceUid: string,
  path: string,
  options: { range?: string } = {},
  baseUrl: string = DEFAULT_SERVICE_URLS.CONTENTS,
): Promise<{ body: ArrayBuffer; status: number; headers: Record<string, string> }> => {
  const response = await requestDatalayerAPIWithResponse({
    url: `${cloudUrl(baseUrl, sourceUid, '/objects/content')}?path=${encodeURIComponent(path)}`,
    method: 'GET',
    token,
    headers: options.range ? { Range: options.range } : undefined,
    responseType: 'arraybuffer',
  });
  return {
    body: response.data as ArrayBuffer,
    status: response.status,
    headers: response.headers,
  };
};

/** Can the bucket be reached with the credential attached: a verdict, not a stack trace. */
export const testCloudConnection = async (
  token: string,
  sourceUid: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.CONTENTS,
): Promise<ConnectionTest> =>
  convertResponse<ConnectionTest>(
    await requestDatalayerAPI({
      url: cloudUrl(baseUrl, sourceUid, '/test'),
      method: 'POST',
      token,
    }),
  );

/** A URL good for one path, one operation, a bounded time. A `put` needs the right to update. */
export const presignCloudObject = async (
  token: string,
  sourceUid: string,
  path: string,
  options: { operation?: 'get' | 'put'; expiresIn?: number } = {},
  baseUrl: string = DEFAULT_SERVICE_URLS.CONTENTS,
): Promise<PresignedObjectUrl> => {
  const parameters = new URLSearchParams({ path, operation: options.operation ?? 'get' });
  if (options.expiresIn) {
    parameters.set('expires_in', String(options.expiresIn));
  }
  return convertResponse<PresignedObjectUrl>(
    await requestDatalayerAPI({
      url: `${cloudUrl(baseUrl, sourceUid, '/objects/presign')}?${parameters.toString()}`,
      method: 'POST',
      token,
    }),
  );
};

/** Whether the source's credential is referenced and resolvable — never its value. */
export const getCredentialDiagnostics = async (
  token: string,
  sourceUid: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.CONTENTS,
): Promise<CredentialDiagnostics> =>
  convertResponse<CredentialDiagnostics>(
    await requestDatalayerAPI({
      url: `${baseUrl}${API_BASE_PATHS.CONTENTS}/sources/${encodeURIComponent(sourceUid)}/diagnostics`,
      method: 'GET',
      token,
    }),
  );

/** Point the source at another credential. Owner only, conditional on the ETag. */
export const rotateSourceCredential = async (
  token: string,
  sourceUid: string,
  credentialUid: string,
  etag: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.CONTENTS,
): Promise<CatalogSource> =>
  convertResponse<CatalogSource>(
    await requestDatalayerAPI({
      url: `${baseUrl}${API_BASE_PATHS.CONTENTS}/sources/${encodeURIComponent(sourceUid)}/credential`,
      method: 'POST',
      token,
      headers: { 'If-Match': etag },
      body: { credential_uid: credentialUid },
    }),
  );
