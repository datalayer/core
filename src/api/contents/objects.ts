/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { requestDatalayerAPI } from '../DatalayerApi';
import { API_BASE_PATHS, DEFAULT_SERVICE_URLS } from '../constants';
import { contentsToCamelCase, contentsToSnakeCase } from '../../models/contents';
import type { JsonValue } from '../../models/contents';
import type {
  ContentObject,
  ObjectList,
  RestoreRequest,
  HomeFolderQuota,
  VersionList,
} from './generated';

const convertResponse = <T>(value: unknown): T =>
  contentsToCamelCase(value as JsonValue) as T;

const homeFolderObjectsUrl = (baseUrl: string, suffix = ''): string =>
  `${baseUrl}${API_BASE_PATHS.CONTENTS}/sources/home-folder/objects${suffix}`;

export type HomeFolderObjectListOptions = {
  prefix?: string;
  cursor?: string;
  limit?: number;
  order?: 'path' | 'updated';
};

export const getHomeFolderQuota = async (
  token: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.CONTENTS,
): Promise<HomeFolderQuota> =>
  convertResponse<HomeFolderQuota>(
    await requestDatalayerAPI({
      url: `${baseUrl}${API_BASE_PATHS.CONTENTS}/sources/home-folder/quota`,
      method: 'GET',
      token,
    }),
  );

export const listHomeFolderObjects = async (
  token: string,
  options: HomeFolderObjectListOptions = {},
  baseUrl: string = DEFAULT_SERVICE_URLS.CONTENTS,
): Promise<ObjectList> => {
  const parameters = new URLSearchParams();
  parameters.set('limit', String(options.limit ?? 100));
  if (options.prefix) {
    parameters.set('prefix', options.prefix);
  }
  if (options.cursor) {
    parameters.set('cursor', options.cursor);
  }
  if (options.order) {
    parameters.set('order', options.order);
  }
  return convertResponse<ObjectList>(
    await requestDatalayerAPI({
      url: `${homeFolderObjectsUrl(baseUrl)}?${parameters.toString()}`,
      method: 'GET',
      token,
    }),
  );
};

export const statHomeFolderObject = async (
  token: string,
  path: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.CONTENTS,
): Promise<ContentObject> => {
  const parameters = new URLSearchParams({ path });
  return convertResponse<ContentObject>(
    await requestDatalayerAPI({
      url: `${homeFolderObjectsUrl(baseUrl, '/stat')}?${parameters.toString()}`,
      method: 'GET',
      token,
    }),
  );
};

export const listHomeFolderObjectVersions = async (
  token: string,
  objectUid: string,
  options: { cursor?: string; limit?: number } = {},
  baseUrl: string = DEFAULT_SERVICE_URLS.CONTENTS,
): Promise<VersionList> => {
  const parameters = new URLSearchParams();
  parameters.set('limit', String(options.limit ?? 100));
  if (options.cursor) {
    parameters.set('cursor', options.cursor);
  }
  return convertResponse<VersionList>(
    await requestDatalayerAPI({
      url: `${homeFolderObjectsUrl(baseUrl, `/${encodeURIComponent(objectUid)}/versions`)}?${parameters.toString()}`,
      method: 'GET',
      token,
    }),
  );
};

export const deleteHomeFolderObject = async (
  token: string,
  objectUid: string,
  idempotencyKey: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.CONTENTS,
): Promise<ContentObject> =>
  convertResponse<ContentObject>(
    await requestDatalayerAPI({
      url: homeFolderObjectsUrl(baseUrl, `/${encodeURIComponent(objectUid)}`),
      method: 'DELETE',
      token,
      headers: { 'Idempotency-Key': idempotencyKey },
    }),
  );

export const restoreHomeFolderObject = async (
  token: string,
  objectUid: string,
  request: RestoreRequest,
  idempotencyKey: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.CONTENTS,
): Promise<ContentObject> =>
  convertResponse<ContentObject>(
    await requestDatalayerAPI({
      url: homeFolderObjectsUrl(
        baseUrl,
        `/${encodeURIComponent(objectUid)}/restore`,
      ),
      method: 'POST',
      token,
      headers: { 'Idempotency-Key': idempotencyKey },
      body: contentsToSnakeCase(request as unknown as JsonValue),
    }),
  );
