/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/* Copyright (c) 2023-2026 Datalayer, Inc. */

import { requestDatalayerAPI } from '../DatalayerApi';
import { API_BASE_PATHS, DEFAULT_SERVICE_URLS } from '../constants';
import { contentsToCamelCase, contentsToSnakeCase } from '../../models/contents';
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
const resourceUrl = (baseUrl: string, sourceUid: string, resource: string, suffix = '') =>
  `${baseUrl}${API_BASE_PATHS.CONTENTS}/sources/${encodeURIComponent(sourceUid)}/${resource}${suffix}`;

export const createDatasetRevision = async (
  token: string, sourceUid: string, request: DatasetRevisionCreate,
  idempotencyKey: string, baseUrl: string = DEFAULT_SERVICE_URLS.CONTENTS,
): Promise<DatasetRevision> => convert<DatasetRevision>(await requestDatalayerAPI({
  url: resourceUrl(baseUrl, sourceUid, 'revisions'), method: 'POST', token,
  headers: { 'Idempotency-Key': idempotencyKey },
  body: contentsToSnakeCase(request as unknown as JsonValue),
}));

export const listDatasetRevisions = async (
  token: string, sourceUid: string, baseUrl: string = DEFAULT_SERVICE_URLS.CONTENTS,
): Promise<DatasetRevisionList> => convert<DatasetRevisionList>(await requestDatalayerAPI({
  url: resourceUrl(baseUrl, sourceUid, 'revisions'), method: 'GET', token,
}));

export const getDatasetRevision = async (
  token: string, sourceUid: string, revisionUid: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.CONTENTS,
): Promise<DatasetRevision> => convert<DatasetRevision>(await requestDatalayerAPI({
  url: resourceUrl(baseUrl, sourceUid, 'revisions', `/${encodeURIComponent(revisionUid)}`),
  method: 'GET', token,
}));

export const createDatasetPublication = async (
  token: string, sourceUid: string, request: DatasetPublicationCreate,
  idempotencyKey: string, baseUrl: string = DEFAULT_SERVICE_URLS.CONTENTS,
): Promise<DatasetPublication> => convert<DatasetPublication>(await requestDatalayerAPI({
  url: resourceUrl(baseUrl, sourceUid, 'publications'), method: 'POST', token,
  headers: { 'Idempotency-Key': idempotencyKey },
  body: contentsToSnakeCase(request as unknown as JsonValue),
}));

export const listDatasetPublications = async (
  token: string, sourceUid: string, baseUrl: string = DEFAULT_SERVICE_URLS.CONTENTS,
): Promise<DatasetPublicationList> => convert<DatasetPublicationList>(await requestDatalayerAPI({
  url: resourceUrl(baseUrl, sourceUid, 'publications'), method: 'GET', token,
}));

export const unpublishDataset = async (
  token: string, sourceUid: string, publicationUid: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.CONTENTS,
): Promise<DatasetPublication> => convert<DatasetPublication>(await requestDatalayerAPI({
  url: resourceUrl(baseUrl, sourceUid, 'publications', `/${encodeURIComponent(publicationUid)}`),
  method: 'DELETE', token,
}));
