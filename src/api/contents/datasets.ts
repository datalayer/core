/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { requestDatalayerAPI } from '../DatalayerApi';
import { API_BASE_PATHS, DEFAULT_SERVICE_URLS } from '../constants';
import {
  contentsToCamelCase,
  contentsToSnakeCase,
} from '../../models/contents';
import type { JsonValue } from '../../models/contents';
import type {
  DatasetPublication,
  DatasetPublicationCreate,
  DatasetPublicationList,
  DatasetRevision,
  DatasetRevisionCreate,
  DatasetRevisionList,
} from './generated';

const convert = <T>(value: unknown): T =>
  contentsToCamelCase(value as JsonValue) as T;
const resourceUrl = (
  baseUrl: string,
  sourceUid: string,
  resource: string,
  suffix = '',
) =>
  `${baseUrl}${API_BASE_PATHS.CONTENTS}/sources/${encodeURIComponent(sourceUid)}/${resource}${suffix}`;

export const createDatasetRevision = async (
  token: string,
  sourceUid: string,
  request: DatasetRevisionCreate,
  idempotencyKey: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.CONTENTS,
): Promise<DatasetRevision> =>
  convert<DatasetRevision>(
    await requestDatalayerAPI({
      url: resourceUrl(baseUrl, sourceUid, 'revisions'),
      method: 'POST',
      token,
      headers: { 'Idempotency-Key': idempotencyKey },
      body: contentsToSnakeCase(request as unknown as JsonValue),
    }),
  );

export const listDatasetRevisions = async (
  token: string,
  sourceUid: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.CONTENTS,
): Promise<DatasetRevisionList> =>
  convert<DatasetRevisionList>(
    await requestDatalayerAPI({
      url: resourceUrl(baseUrl, sourceUid, 'revisions'),
      method: 'GET',
      token,
    }),
  );

export const getDatasetRevision = async (
  token: string,
  sourceUid: string,
  revisionUid: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.CONTENTS,
): Promise<DatasetRevision> =>
  convert<DatasetRevision>(
    await requestDatalayerAPI({
      url: resourceUrl(
        baseUrl,
        sourceUid,
        'revisions',
        `/${encodeURIComponent(revisionUid)}`,
      ),
      method: 'GET',
      token,
    }),
  );

export const createDatasetPublication = async (
  token: string,
  sourceUid: string,
  request: DatasetPublicationCreate,
  idempotencyKey: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.CONTENTS,
): Promise<DatasetPublication> =>
  convert<DatasetPublication>(
    await requestDatalayerAPI({
      url: resourceUrl(baseUrl, sourceUid, 'publications'),
      method: 'POST',
      token,
      headers: { 'Idempotency-Key': idempotencyKey },
      body: contentsToSnakeCase(request as unknown as JsonValue),
    }),
  );

export const listDatasetPublications = async (
  token: string,
  sourceUid: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.CONTENTS,
): Promise<DatasetPublicationList> =>
  convert<DatasetPublicationList>(
    await requestDatalayerAPI({
      url: resourceUrl(baseUrl, sourceUid, 'publications'),
      method: 'GET',
      token,
    }),
  );

export const unpublishDataset = async (
  token: string,
  sourceUid: string,
  publicationUid: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.CONTENTS,
): Promise<DatasetPublication> =>
  convert<DatasetPublication>(
    await requestDatalayerAPI({
      url: resourceUrl(
        baseUrl,
        sourceUid,
        'publications',
        `/${encodeURIComponent(publicationUid)}`,
      ),
      method: 'DELETE',
      token,
    }),
  );

/** The Dataset a clone produced, and where it came from. */
export type DatasetClone = {
  uid: string;
  name: string;
  sourceUid: string;
  publicationUid: string;
  revisionUid: string;
  fileCount: number;
  totalSize: number;
};

/**
 * Take a published Dataset into your own catalog.
 *
 * A publication names one immutable revision, so the clone is a Dataset of
 * the caller's own whose first revision names the same objects. Nothing is
 * copied: the bytes cannot change, which is what makes sharing them safe, and
 * the record and its permissions belong to the caller from that moment.
 */
export const cloneDatasetPublication = async (
  token: string,
  sourceUid: string,
  publicationUid: string,
  idempotencyKey: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.CONTENTS,
): Promise<DatasetClone> =>
  convert<DatasetClone>(
    await requestDatalayerAPI({
      url: resourceUrl(
        baseUrl,
        sourceUid,
        'publications',
        `/${encodeURIComponent(publicationUid)}/clone`,
      ),
      method: 'POST',
      token,
      headers: { 'Idempotency-Key': idempotencyKey },
    }),
  );

/**
 * Every Dataset currently published, across sources.
 *
 * What the Library shows: a publication names one immutable revision of a
 * Dataset, so this is the list of what has been made public, not of Datasets.
 * Any signed-in caller may read it — published means public.
 */
export const listPublishedDatasets = async (
  token: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.CONTENTS,
): Promise<DatasetPublicationList> =>
  convert<DatasetPublicationList>(
    await requestDatalayerAPI({
      url: `${baseUrl}${API_BASE_PATHS.CONTENTS}/publications`,
      method: 'GET',
      token,
    }),
  );

/** A published Data Server's catalog, as the library shows it. */
export type DataServerPublication = {
  uid: string;
  sourceUid: string;
  actorUid: string;
  ownerUid: string;
  name: string;
  description?: string | null;
  tags: string[];
  connectors: string[];
  relations: string[];
  status: string;
  createdAt: string;
};

/** The Datasource an attach produced, naming the published Data Server. */
export type DataServerAttachment = {
  uid: string;
  name: string;
  sourceUid: string;
  publicationUid: string;
};

/**
 * Attach a published Data Server as a Datasource of your own.
 *
 * The Datasource names it and the relations it publishes, and carries no
 * credential: the Data Server's own mTLS still decides whether a query
 * reaches it. That is what makes publishing a catalog safe.
 */
export const attachDataServerPublication = async (
  token: string,
  sourceUid: string,
  publicationUid: string,
  idempotencyKey: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.CONTENTS,
): Promise<DataServerAttachment> =>
  convert<DataServerAttachment>(
    await requestDatalayerAPI({
      url: `${baseUrl}/api/contents/v1/sources/${encodeURIComponent(sourceUid)}/dataserver-publications/${encodeURIComponent(publicationUid)}/attach`,
      method: 'POST',
      token,
      headers: { 'Idempotency-Key': idempotencyKey },
    }),
  );
