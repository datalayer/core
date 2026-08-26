/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import {
  requestDatalayerAPI,
  requestDatalayerAPIWithResponse,
} from '../DatalayerApi';
import { API_BASE_PATHS, DEFAULT_SERVICE_URLS } from '../constants';
import { contentsToCamelCase, contentsToSnakeCase } from '../../models/contents';
import type { JsonValue } from '../../models/contents';
import type {
  CatalogSource,
  ContentSourceCreate,
  ContentSourceUpdate,
  EffectivePermissions,
  Sharing,
  SourceList,
} from './generated';

export interface ConditionalCatalogSource {
  value: CatalogSource;
  etag: string;
}

const convertRequest = (value: unknown): unknown =>
  contentsToSnakeCase(value as JsonValue);

const convertResponse = <T>(value: unknown): T =>
  contentsToCamelCase(value as JsonValue) as T;

const sourceUrl = (baseUrl: string, suffix = ''): string =>
  `${baseUrl}${API_BASE_PATHS.CONTENTS}/sources${suffix}`;

const requiredEtag = (headers: Record<string, string>): string => {
  const etag = headers.etag ?? headers.ETag;
  if (!etag) {
    throw new Error('Contents response did not include an ETag');
  }
  return etag;
};

export const listSources = async (
  token: string,
  options: { kind?: string; spaceUid?: string; cursor?: string; limit?: number } = {},
  baseUrl: string = DEFAULT_SERVICE_URLS.CONTENTS,
): Promise<SourceList> => {
  const parameters = new URLSearchParams();
  parameters.set('limit', String(options.limit ?? 50));
  if (options.kind) {
    parameters.set('kind', options.kind);
  }
  if (options.spaceUid) {
    parameters.set('space_uid', options.spaceUid);
  }
  if (options.cursor) {
    parameters.set('cursor', options.cursor);
  }
  const value = await requestDatalayerAPI({
    url: `${sourceUrl(baseUrl)}?${parameters.toString()}`,
    method: 'GET',
    token,
  });
  return convertResponse<SourceList>(value);
};

export const createSource = async (
  token: string,
  source: ContentSourceCreate,
  idempotencyKey: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.CONTENTS,
): Promise<ConditionalCatalogSource> => {
  const response = await requestDatalayerAPIWithResponse({
    url: sourceUrl(baseUrl),
    method: 'POST',
    token,
    headers: { 'Idempotency-Key': idempotencyKey },
    body: convertRequest(source),
  });
  return {
    value: convertResponse<CatalogSource>(response.data),
    etag: requiredEtag(response.headers),
  };
};

export const getSource = async (
  token: string,
  sourceUid: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.CONTENTS,
): Promise<ConditionalCatalogSource> => {
  const response = await requestDatalayerAPIWithResponse({
    url: sourceUrl(baseUrl, `/${encodeURIComponent(sourceUid)}`),
    method: 'GET',
    token,
  });
  return {
    value: convertResponse<CatalogSource>(response.data),
    etag: requiredEtag(response.headers),
  };
};

export const getHomeFolder = async (
  token: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.CONTENTS,
): Promise<ConditionalCatalogSource> => {
  const response = await requestDatalayerAPIWithResponse({
    url: sourceUrl(baseUrl, '/home-folder'),
    method: 'GET',
    token,
  });
  return {
    value: convertResponse<CatalogSource>(response.data),
    etag: requiredEtag(response.headers),
  };
};

export const updateSource = async (
  token: string,
  sourceUid: string,
  update: ContentSourceUpdate,
  etag: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.CONTENTS,
): Promise<ConditionalCatalogSource> => {
  const response = await requestDatalayerAPIWithResponse({
    url: sourceUrl(baseUrl, `/${encodeURIComponent(sourceUid)}`),
    method: 'PATCH',
    token,
    headers: { 'If-Match': etag },
    body: convertRequest(update),
  });
  return {
    value: convertResponse<CatalogSource>(response.data),
    etag: requiredEtag(response.headers),
  };
};

export const archiveSource = async (
  token: string,
  sourceUid: string,
  etag: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.CONTENTS,
): Promise<ConditionalCatalogSource> => {
  const response = await requestDatalayerAPIWithResponse({
    url: sourceUrl(baseUrl, `/${encodeURIComponent(sourceUid)}`),
    method: 'DELETE',
    token,
    headers: { 'If-Match': etag },
  });
  return {
    value: convertResponse<CatalogSource>(response.data),
    etag: requiredEtag(response.headers),
  };
};

export const getSourcePermissions = async (
  token: string,
  sourceUid: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.CONTENTS,
): Promise<EffectivePermissions> =>
  convertResponse<EffectivePermissions>(
    await requestDatalayerAPI({
      url: sourceUrl(baseUrl, `/${encodeURIComponent(sourceUid)}/permissions`),
      method: 'GET',
      token,
    }),
  );

export const getSourceSharing = async (
  token: string,
  sourceUid: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.CONTENTS,
): Promise<Sharing> =>
  convertResponse<Sharing>(
    await requestDatalayerAPI({
      url: sourceUrl(baseUrl, `/${encodeURIComponent(sourceUid)}/sharing`),
      method: 'GET',
      token,
    }),
  );

export const replaceSourceSharing = async (
  token: string,
  sourceUid: string,
  sharing: Sharing,
  etag: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.CONTENTS,
): Promise<ConditionalCatalogSource> => {
  const response = await requestDatalayerAPIWithResponse({
    url: sourceUrl(baseUrl, `/${encodeURIComponent(sourceUid)}/sharing`),
    method: 'PUT',
    token,
    headers: { 'If-Match': etag },
    body: convertRequest(sharing),
  });
  return {
    value: convertResponse<CatalogSource>(response.data),
    etag: requiredEtag(response.headers),
  };
};
