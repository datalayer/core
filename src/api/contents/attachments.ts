/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { requestDatalayerAPI } from '../DatalayerApi';
import { API_BASE_PATHS, DEFAULT_SERVICE_URLS } from '../constants';
import { contentsToCamelCase, contentsToSnakeCase } from '../../models/contents';
import type { JsonValue } from '../../models/contents';
import { assertSandboxUid } from './sandboxUid';
import type {
  AttachmentCreate,
  AttachmentList,
  ContentAttachment,
  ContentAttachmentManifest,
} from './generated';

const convert = <T>(value: unknown): T =>
  contentsToCamelCase(value as JsonValue) as T;

const url = (baseUrl: string, suffix = ''): string =>
  `${baseUrl}${API_BASE_PATHS.CONTENTS}/attachments${suffix}`;

export const createAttachment = async (
  token: string,
  request: AttachmentCreate,
  idempotencyKey: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.CONTENTS,
): Promise<ContentAttachment> =>
  convert<ContentAttachment>(
    await requestDatalayerAPI({
      url: url(baseUrl),
      method: 'POST',
      token,
      headers: { 'Idempotency-Key': idempotencyKey },
      body: contentsToSnakeCase(request as unknown as JsonValue),
    }),
  );

export const listAttachments = async (
  token: string,
  options: { sandboxUid?: string; sourceUid?: string; active?: boolean } = {},
  baseUrl: string = DEFAULT_SERVICE_URLS.CONTENTS,
): Promise<AttachmentList> => {
  const parameters = new URLSearchParams();
  if (options.sandboxUid)
    parameters.set('sandbox_uid', assertSandboxUid(options.sandboxUid));
  if (options.sourceUid) parameters.set('source_uid', options.sourceUid);
  parameters.set('active', String(options.active ?? false));
  return convert<AttachmentList>(
    await requestDatalayerAPI({
      url: `${url(baseUrl)}?${parameters.toString()}`,
      method: 'GET',
      token,
    }),
  );
};

export const getAttachmentManifest = async (
  token: string,
  sandboxUid: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.CONTENTS,
): Promise<ContentAttachmentManifest> =>
  convert<ContentAttachmentManifest>(
    await requestDatalayerAPI({
      // Throws on a Pod name. Contents validates this while building its
      // reply, so sending the wrong spelling produced a 500 the caller could
      // not read; this fails where the caller can be seen.
      url: url(
        baseUrl,
        `/manifest/${encodeURIComponent(assertSandboxUid(sandboxUid))}`,
      ),
      method: 'GET',
      token,
    }),
  );

export const revokeAttachment = async (
  token: string,
  attachmentUid: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.CONTENTS,
): Promise<ContentAttachment> =>
  convert<ContentAttachment>(
    await requestDatalayerAPI({
      url: url(baseUrl, `/${encodeURIComponent(attachmentUid)}`),
      method: 'DELETE',
      token,
    }),
  );
