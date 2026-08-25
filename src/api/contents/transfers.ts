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
import type { TransferCreate, TransferList, TransferView } from './generated';

const convertResponse = <T>(value: unknown): T =>
  contentsToCamelCase(value as JsonValue) as T;

const transferUrl = (baseUrl: string, suffix = ''): string =>
  `${baseUrl}${API_BASE_PATHS.CONTENTS}/transfers${suffix}`;

export const createTransfer = async (
  token: string,
  request: TransferCreate,
  idempotencyKey: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.CONTENTS,
): Promise<TransferView> =>
  convertResponse<TransferView>(
    await requestDatalayerAPI({
      url: transferUrl(baseUrl),
      method: 'POST',
      token,
      headers: { 'Idempotency-Key': idempotencyKey },
      body: contentsToSnakeCase(request as unknown as JsonValue),
    }),
  );

export const getTransfer = async (
  token: string,
  transferUid: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.CONTENTS,
): Promise<TransferView> =>
  convertResponse<TransferView>(
    await requestDatalayerAPI({
      url: transferUrl(baseUrl, `/${encodeURIComponent(transferUid)}`),
      method: 'GET',
      token,
    }),
  );

export const listTransfers = async (
  token: string,
  options: { active?: boolean; cursor?: string; limit?: number } = {},
  baseUrl: string = DEFAULT_SERVICE_URLS.CONTENTS,
): Promise<TransferList> => {
  const parameters = new URLSearchParams();
  parameters.set('active', String(options.active ?? false));
  parameters.set('limit', String(options.limit ?? 50));
  if (options.cursor) parameters.set('cursor', options.cursor);
  return convertResponse<TransferList>(
    await requestDatalayerAPI({
      url: `${transferUrl(baseUrl)}?${parameters.toString()}`,
      method: 'GET',
      token,
    }),
  );
};

export const uploadTransferPart = async (
  token: string,
  transferUid: string,
  partNumber: number,
  content: Uint8Array,
  checksum: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.CONTENTS,
): Promise<TransferView> =>
  convertResponse<TransferView>(
    await requestDatalayerAPI({
      url: transferUrl(
        baseUrl,
        `/${encodeURIComponent(transferUid)}/parts/${partNumber}`,
      ),
      method: 'PUT',
      token,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-SHA256': checksum,
      },
      body: content,
    }),
  );

export const completeTransfer = async (
  token: string,
  transferUid: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.CONTENTS,
): Promise<TransferView> =>
  convertResponse<TransferView>(
    await requestDatalayerAPI({
      url: transferUrl(baseUrl, `/${encodeURIComponent(transferUid)}/complete`),
      method: 'POST',
      token,
    }),
  );

export const cancelTransfer = async (
  token: string,
  transferUid: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.CONTENTS,
): Promise<TransferView> =>
  convertResponse<TransferView>(
    await requestDatalayerAPI({
      url: transferUrl(baseUrl, `/${encodeURIComponent(transferUid)}`),
      method: 'DELETE',
      token,
    }),
  );

export type DownloadedObject = {
  data: ArrayBuffer;
  status: number;
  headers: Record<string, string>;
};

export const downloadUserFolderObject = async (
  token: string,
  objectUid: string,
  options: { versionUid?: string; range?: string } = {},
  baseUrl: string = DEFAULT_SERVICE_URLS.CONTENTS,
): Promise<DownloadedObject> => {
  const parameters = new URLSearchParams();
  if (options.versionUid) parameters.set('version_uid', options.versionUid);
  const query = parameters.size ? `?${parameters.toString()}` : '';
  const response = await requestDatalayerAPIWithResponse<ArrayBuffer>({
    url: `${baseUrl}${API_BASE_PATHS.CONTENTS}/sources/user-folder/objects/${encodeURIComponent(objectUid)}/download${query}`,
    method: 'GET',
    token,
    headers: options.range ? { Range: options.range } : {},
    responseType: 'arraybuffer',
  });
  return {
    data: response.data,
    status: response.status,
    headers: response.headers,
  };
};

const bytes = async (content: Blob | Uint8Array | ArrayBuffer): Promise<Uint8Array> => {
  if (content instanceof Uint8Array) return content;
  if (content instanceof ArrayBuffer) return new Uint8Array(content);
  return new Uint8Array(await content.arrayBuffer());
};

const sha256 = async (content: Uint8Array): Promise<string> => {
  const copy = new Uint8Array(content.byteLength);
  copy.set(content);
  const digest = await crypto.subtle.digest('SHA-256', copy.buffer);
  return Array.from(new Uint8Array(digest), value =>
    value.toString(16).padStart(2, '0'),
  ).join('');
};

export type UploadProgress = {
  transferUid: string;
  uploadedBytes: number;
  totalBytes: number;
};

/** Create or resume a checksummed multipart upload and atomically finalize it. */
export const uploadUserFolderFile = async (
  token: string,
  path: string,
  content: Blob | Uint8Array | ArrayBuffer,
  options: {
    idempotencyKey: string;
    mediaType?: string;
    overwrite?: 'reject' | 'replace' | 'new-version';
    chunkSize?: number;
    onProgress?: (progress: UploadProgress) => void;
  },
  baseUrl: string = DEFAULT_SERVICE_URLS.CONTENTS,
): Promise<TransferView> => {
  const payload = await bytes(content);
  const checksum = await sha256(payload);
  const transfer = await createTransfer(
    token,
    {
      destinationUri: `user-folder:///${path.replace(/^\/+/, '')}`,
      size: payload.byteLength,
      checksum,
      mediaType: options.mediaType ?? 'application/octet-stream',
      overwrite: options.overwrite ?? 'reject',
    },
    options.idempotencyKey,
    baseUrl,
  );
  const chunkSize = Math.max(256 * 1024, options.chunkSize ?? 8 * 1024 * 1024);
  const verified = new Set((transfer.parts ?? []).map(part => part.number));
  let uploadedBytes = (transfer.parts ?? []).reduce(
    (total, part) => total + part.size,
    0,
  );
  for (let offset = 0, number = 0; offset < payload.byteLength; number += 1) {
    const end = Math.min(offset + chunkSize, payload.byteLength);
    const part = payload.slice(offset, end);
    if (!verified.has(number)) {
      await uploadTransferPart(
        token,
        transfer.uid,
        number,
        part,
        await sha256(part),
        baseUrl,
      );
      uploadedBytes += part.byteLength;
      options.onProgress?.({
        transferUid: transfer.uid,
        uploadedBytes,
        totalBytes: payload.byteLength,
      });
    }
    offset = end;
  }
  return completeTransfer(token, transfer.uid, baseUrl);
};
