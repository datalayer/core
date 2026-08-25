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
  UserFolderQuota,
  VersionList,
} from './generated';

const convertResponse = <T>(value: unknown): T =>
  contentsToCamelCase(value as JsonValue) as T;

const userFolderObjectsUrl = (baseUrl: string, suffix = ''): string =>
  `${baseUrl}${API_BASE_PATHS.CONTENTS}/sources/user-folder/objects${suffix}`;

export type UserFolderObjectListOptions = {
  prefix?: string;
  cursor?: string;
  limit?: number;
  order?: 'path' | 'updated';
};

export const getUserFolderQuota = async (
  token: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.CONTENTS,
): Promise<UserFolderQuota> =>
  convertResponse<UserFolderQuota>(
    await requestDatalayerAPI({
      url: `${baseUrl}${API_BASE_PATHS.CONTENTS}/sources/user-folder/quota`,
      method: 'GET',
      token,
    }),
  );

export const listUserFolderObjects = async (
  token: string,
  options: UserFolderObjectListOptions = {},
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
      url: `${userFolderObjectsUrl(baseUrl)}?${parameters.toString()}`,
      method: 'GET',
      token,
    }),
  );
};

export const statUserFolderObject = async (
  token: string,
  path: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.CONTENTS,
): Promise<ContentObject> => {
  const parameters = new URLSearchParams({ path });
  return convertResponse<ContentObject>(
    await requestDatalayerAPI({
      url: `${userFolderObjectsUrl(baseUrl, '/stat')}?${parameters.toString()}`,
      method: 'GET',
      token,
    }),
  );
};

export const listUserFolderObjectVersions = async (
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
      url: `${userFolderObjectsUrl(baseUrl, `/${encodeURIComponent(objectUid)}/versions`)}?${parameters.toString()}`,
      method: 'GET',
      token,
    }),
  );
};

export const deleteUserFolderObject = async (
  token: string,
  objectUid: string,
  idempotencyKey: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.CONTENTS,
): Promise<ContentObject> =>
  convertResponse<ContentObject>(
    await requestDatalayerAPI({
      url: userFolderObjectsUrl(baseUrl, `/${encodeURIComponent(objectUid)}`),
      method: 'DELETE',
      token,
      headers: { 'Idempotency-Key': idempotencyKey },
    }),
  );

export const restoreUserFolderObject = async (
  token: string,
  objectUid: string,
  request: RestoreRequest,
  idempotencyKey: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.CONTENTS,
): Promise<ContentObject> =>
  convertResponse<ContentObject>(
    await requestDatalayerAPI({
      url: userFolderObjectsUrl(
        baseUrl,
        `/${encodeURIComponent(objectUid)}/restore`,
      ),
      method: 'POST',
      token,
      headers: { 'Idempotency-Key': idempotencyKey },
      body: contentsToSnakeCase(request as unknown as JsonValue),
    }),
  );
