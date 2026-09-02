/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * A Datasource through the service: tested, described, queried.
 *
 * Nothing here talks to the database. Contents does, with the credential it
 * holds — directly, or through a Dataserver in the customer's network — and
 * answers with a verdict, a schema, or a query job. A job is polled to its
 * end; its result is Arrow IPC bytes read by range, and it can be kept as a
 * Dataset revision rather than downloaded to be uploaded again.
 *
 * The wire types are the generated ones; what is declared here is what the
 * contract does not name — the unions as standalone types, the labels a
 * form shows, which statuses are terminal, and the bytes of a result.
 */

import {
  requestDatalayerAPI,
  requestDatalayerAPIWithResponse,
} from '../DatalayerApi';
import { API_BASE_PATHS, DEFAULT_SERVICE_URLS } from '../constants';
import {
  contentsToCamelCase,
  contentsToSnakeCase,
} from '../../models/contents';
import type { JsonValue } from '../../models/contents';
import type {
  CapabilityTicket,
  CapabilityTicketRequest,
  DatasetRevision,
  DatasourceCapabilities,
  DatasourceConfiguration,
  DatasourceQuery,
  DatasourceQueryCreate,
  DatasourceQueryList,
  DatasourceSchema,
  DatasourceTest,
  QuerySave,
} from './generated';

export type DatasourceConnectorType = DatasourceConfiguration['connectorType'];
export type DatasourceNetworkRoute = NonNullable<
  DatasourceConfiguration['networkRoute']
>;
export type DatasourceOperation = DatasourceCapabilities['operations'][number];
export type DatasourceQueryStatus = DatasourceQuery['status'];

/** The operations a Datasource may allow, in the order a form lists them. */
export const DATASOURCE_OPERATIONS: ReadonlyArray<DatasourceOperation> = [
  'select',
  'describe',
  'list',
];

/**
 * The connectors a person can pick in a form.
 *
 * `table` is not one of them: a published table is created by publishing it
 * from a sandbox, and `POST /sources` refuses one made by hand
 * (`PUBLISHED_TABLE_MANAGED`) because the record and its files have to come
 * into being together. Saying that in the type keeps a creation form from
 * having to invent labels and hints for something it cannot create.
 */
export type CreatableDatasourceConnectorType = Exclude<
  DatasourceConnectorType,
  'table'
>;

export const DATASOURCE_CONNECTOR_LABELS: Record<
  DatasourceConnectorType,
  string
> = {
  athena: 'Amazon Athena',
  bigquery: 'Google BigQuery',
  sql: 'SQL database',
  // Listed, unlike above: a published table is a Datasource people see in
  // the catalog and query like any other, even though no form makes one.
  table: 'Published table',
};

/** A query the service has finished with, one way or another. */
export const DATASOURCE_QUERY_TERMINAL_STATUSES: ReadonlySet<DatasourceQueryStatus> =
  new Set<DatasourceQueryStatus>(['succeeded', 'failed', 'cancelled']);

export const isDatasourceQueryTerminal = (
  status: DatasourceQueryStatus,
): boolean => DATASOURCE_QUERY_TERMINAL_STATUSES.has(status);

/** The bytes of a result, or a range of them, with what the headers said. */
export interface DatasourceQueryResultBytes {
  body: ArrayBuffer;
  status: number;
  headers: Record<string, string>;
}

const convertResponse = <T>(value: unknown): T =>
  contentsToCamelCase(value as JsonValue) as T;

const convertRequest = (value: unknown): unknown =>
  contentsToSnakeCase(value as JsonValue);

const datasourceUrl = (
  baseUrl: string,
  sourceUid: string,
  suffix = '',
): string =>
  `${baseUrl}${API_BASE_PATHS.CONTENTS}/sources/${encodeURIComponent(sourceUid)}/datasource${suffix}`;

const queryUrl = (baseUrl: string, queryUid: string, suffix = ''): string =>
  `${baseUrl}${API_BASE_PATHS.CONTENTS}/queries/${encodeURIComponent(queryUid)}${suffix}`;

/** Does the database answer through this source, right now? A verdict, not a stack trace. */
export const testDatasource = async (
  token: string,
  sourceUid: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.CONTENTS,
): Promise<DatasourceTest> =>
  convertResponse<DatasourceTest>(
    await requestDatalayerAPI({
      url: datasourceUrl(baseUrl, sourceUid, '/test'),
      method: 'POST',
      token,
    }),
  );

/** The tables and columns the source exposes, as the service saw them. */
export const discoverDatasourceSchema = async (
  token: string,
  sourceUid: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.CONTENTS,
): Promise<DatasourceSchema> =>
  convertResponse<DatasourceSchema>(
    await requestDatalayerAPI({
      url: datasourceUrl(baseUrl, sourceUid, '/schema'),
      method: 'GET',
      token,
    }),
  );

/** What the source may be asked, and how the answer can travel. */
export const getDatasourceCapabilities = async (
  token: string,
  sourceUid: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.CONTENTS,
): Promise<DatasourceCapabilities> =>
  convertResponse<DatasourceCapabilities>(
    await requestDatalayerAPI({
      url: datasourceUrl(baseUrl, sourceUid, '/capabilities'),
      method: 'GET',
      token,
    }),
  );

/**
 * Submit a statement; the answer is the job, not the rows.
 *
 * The service checks the statement against the source's operation allowlist
 * and the limits against its policy before the job exists, so a refused
 * query is refused here, with a reason, and not later on the stream.
 */
export const createDatasourceQuery = async (
  token: string,
  sourceUid: string,
  request: DatasourceQueryCreate,
  idempotencyKey: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.CONTENTS,
): Promise<DatasourceQuery> =>
  convertResponse<DatasourceQuery>(
    await requestDatalayerAPI({
      url: `${baseUrl}${API_BASE_PATHS.CONTENTS}/sources/${encodeURIComponent(sourceUid)}/queries`,
      method: 'POST',
      token,
      headers: { 'Idempotency-Key': idempotencyKey },
      body: convertRequest(request),
    }),
  );

/** The queries run against a source, newest first: its history. */
export const listDatasourceQueries = async (
  token: string,
  sourceUid: string,
  options: { cursor?: string; limit?: number } = {},
  baseUrl: string = DEFAULT_SERVICE_URLS.CONTENTS,
): Promise<DatasourceQueryList> => {
  const parameters = new URLSearchParams();
  parameters.set('limit', String(options.limit ?? 50));
  if (options.cursor) {
    parameters.set('cursor', options.cursor);
  }
  return convertResponse<DatasourceQueryList>(
    await requestDatalayerAPI({
      url: `${baseUrl}${API_BASE_PATHS.CONTENTS}/sources/${encodeURIComponent(sourceUid)}/queries?${parameters.toString()}`,
      method: 'GET',
      token,
    }),
  );
};

export const getDatasourceQuery = async (
  token: string,
  queryUid: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.CONTENTS,
): Promise<DatasourceQuery> =>
  convertResponse<DatasourceQuery>(
    await requestDatalayerAPI({
      url: queryUrl(baseUrl, queryUid),
      method: 'GET',
      token,
    }),
  );

/** Ask for the query to stop; the cancellation reaches the connector. */
export const cancelDatasourceQuery = async (
  token: string,
  queryUid: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.CONTENTS,
): Promise<DatasourceQuery> =>
  convertResponse<DatasourceQuery>(
    await requestDatalayerAPI({
      url: queryUrl(baseUrl, queryUid, '/cancel'),
      method: 'POST',
      token,
    }),
  );

/** Where a browser fetches a result from; a link, for a download. */
export const datasourceQueryResultsUrl = (
  queryUid: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.CONTENTS,
): string => queryUrl(baseUrl, queryUid, '/results');

/**
 * The result of a finished query, as Arrow IPC bytes, or a `Range` of them.
 *
 * A range is how a stream that broke halfway is resumed rather than
 * restarted — and how a preview reads the first bytes of a large result
 * without the rest.
 */
export const downloadDatasourceQueryResults = async (
  token: string,
  queryUid: string,
  options: { range?: string } = {},
  baseUrl: string = DEFAULT_SERVICE_URLS.CONTENTS,
): Promise<DatasourceQueryResultBytes> => {
  const response = await requestDatalayerAPIWithResponse({
    url: datasourceQueryResultsUrl(queryUid, baseUrl),
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

/**
 * Keep a result: written into a Dataset as a verified revision.
 *
 * The bytes go from the service into the Dataset; nothing is downloaded to
 * be uploaded again, and the answer is the revision that now holds them.
 */
export const saveDatasourceQueryAsDataset = async (
  token: string,
  queryUid: string,
  request: QuerySave,
  baseUrl: string = DEFAULT_SERVICE_URLS.CONTENTS,
): Promise<DatasetRevision> =>
  convertResponse<DatasetRevision>(
    await requestDatalayerAPI({
      url: queryUrl(baseUrl, queryUid, '/save'),
      method: 'POST',
      token,
      body: convertRequest({
        ...request,
        path: request.path.replace(/^\/+/, ''),
      }),
    }),
  );

/** A Flight ticket for the result, for a client inside a sandbox. Never for the browser. */
export const createDatasourceQueryTicket = async (
  token: string,
  queryUid: string,
  request: CapabilityTicketRequest = {},
  baseUrl: string = DEFAULT_SERVICE_URLS.CONTENTS,
): Promise<CapabilityTicket> =>
  convertResponse<CapabilityTicket>(
    await requestDatalayerAPI({
      url: queryUrl(baseUrl, queryUid, '/ticket'),
      method: 'POST',
      token,
      body: convertRequest(request),
    }),
  );
