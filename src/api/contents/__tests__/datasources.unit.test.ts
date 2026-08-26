/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as DatalayerApi from '../../DatalayerApi';
import {
  cancelDatasourceQuery,
  createDatasourceQuery,
  createDatasourceQueryTicket,
  datasourceQueryResultsUrl,
  discoverDatasourceSchema,
  downloadDatasourceQueryResults,
  getDatasourceCapabilities,
  getDatasourceQuery,
  isDatasourceQueryTerminal,
  listDatasourceQueries,
  saveDatasourceQueryAsDataset,
  testDatasource,
} from '../datasources';

const SOURCE = '01ARZ3NDEKTSV4RRFFQ69G5FAV';
const QUERY = '01QRY3NDEKTSV4RRFFQ69G5FAV';
const BASE = 'https://contents';

const queryPayload = (status: string) => ({
  uid: QUERY,
  source_uid: SOURCE,
  actor_uid: '01BX5ZZKBKACTAV9WEVGEMMVRZ',
  sandbox_uid: null,
  sql_hash: 'sha256:abc',
  status,
  row_limit: 1000,
  max_bytes: 268435456,
  max_seconds: 60,
  rows: status === 'succeeded' ? 3 : null,
  bytes: status === 'succeeded' ? 512 : null,
  result:
    status === 'succeeded'
      ? { object_uid: '01OBJ', version_uid: '01VER', checksum: 'c', media_type: 'application/vnd.apache.arrow.stream' }
      : null,
  operation_uid: '01OP',
  data_server_uid: null,
  policy_version: '3',
  error: null,
  created_at: '2026-08-26T12:00:00Z',
  started_at: null,
  finished_at: null,
});

describe('Contents datasource API', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('tests, describes and reads the capabilities of a source', async () => {
    const request = vi
      .spyOn(DatalayerApi, 'requestDatalayerAPI')
      .mockResolvedValueOnce({ ok: true, connector_type: 'bigquery', detail: 'answered in 120ms' })
      .mockResolvedValueOnce({
        tables: [{ name: 'observations', columns: [{ name: 'id', type: 'int64' }] }],
        discovered_at: '2026-08-26T12:00:00Z',
      })
      .mockResolvedValueOnce({
        operations: ['select', 'describe'], streaming: true, flight: true,
        https_fallback: true, row_limit: 10000, max_bytes: 268435456, max_seconds: 60,
      });

    const verdict = await testDatasource('token', SOURCE, BASE);
    const schema = await discoverDatasourceSchema('token', SOURCE, BASE);
    const capabilities = await getDatasourceCapabilities('token', SOURCE, BASE);

    expect(verdict).toEqual({ ok: true, connectorType: 'bigquery', detail: 'answered in 120ms' });
    expect(schema.tables[0].columns?.[0].type).toBe('int64');
    expect(schema.discoveredAt).toBe('2026-08-26T12:00:00Z');
    expect(capabilities.httpsFallback).toBe(true);
    expect(capabilities.rowLimit).toBe(10000);
    expect(request.mock.calls.map(call => [call[0].url, call[0].method])).toEqual([
      [`${BASE}/api/contents/v1/sources/${SOURCE}/datasource/test`, 'POST'],
      [`${BASE}/api/contents/v1/sources/${SOURCE}/datasource/schema`, 'GET'],
      [`${BASE}/api/contents/v1/sources/${SOURCE}/datasource/capabilities`, 'GET'],
    ]);
  });

  it('submits a query in snake case under an idempotency key and reads the job back', async () => {
    const request = vi
      .spyOn(DatalayerApi, 'requestDatalayerAPI')
      .mockResolvedValueOnce(queryPayload('pending'))
      .mockResolvedValueOnce(queryPayload('running'))
      .mockResolvedValueOnce(queryPayload('cancelled'))
      .mockResolvedValueOnce({ items: [queryPayload('succeeded')], next_cursor: 'c2' });

    const submitted = await createDatasourceQuery(
      'token', SOURCE, { sql: 'SELECT 1', rowLimit: 1000, maxSeconds: 60 }, 'k1', BASE,
    );
    const polled = await getDatasourceQuery('token', QUERY, BASE);
    const cancelled = await cancelDatasourceQuery('token', QUERY, BASE);
    const history = await listDatasourceQueries('token', SOURCE, { cursor: 'c1', limit: 5 }, BASE);

    expect(submitted.status).toBe('pending');
    expect(submitted.sqlHash).toBe('sha256:abc');
    expect(isDatasourceQueryTerminal(submitted.status)).toBe(false);
    expect(polled.status).toBe('running');
    expect(cancelled.status).toBe('cancelled');
    expect(isDatasourceQueryTerminal(cancelled.status)).toBe(true);
    expect(history.items[0].result?.objectUid).toBe('01OBJ');
    expect(history.nextCursor).toBe('c2');
    expect(request.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        url: `${BASE}/api/contents/v1/sources/${SOURCE}/queries`,
        method: 'POST',
        headers: { 'Idempotency-Key': 'k1' },
        body: { sql: 'SELECT 1', row_limit: 1000, max_seconds: 60 },
      }),
    );
    expect(request.mock.calls[1][0].url).toBe(`${BASE}/api/contents/v1/queries/${QUERY}`);
    expect(request.mock.calls[2][0].url).toBe(`${BASE}/api/contents/v1/queries/${QUERY}/cancel`);
    expect(request.mock.calls[3][0].url).toBe(
      `${BASE}/api/contents/v1/sources/${SOURCE}/queries?limit=5&cursor=c1`,
    );
  });

  it('reads a result by range as bytes and names where a browser downloads it', async () => {
    const body = new Uint8Array([65, 82, 82, 79, 87]).buffer;
    const request = vi.spyOn(DatalayerApi, 'requestDatalayerAPIWithResponse').mockResolvedValue({
      data: body, status: 206, statusText: 'Partial Content',
      headers: { 'content-range': 'bytes 0-4/512' },
    });

    const result = await downloadDatasourceQueryResults('token', QUERY, { range: 'bytes=0-4' }, BASE);

    expect(result.status).toBe(206);
    expect(new Uint8Array(result.body)).toEqual(new Uint8Array([65, 82, 82, 79, 87]));
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        url: `${BASE}/api/contents/v1/queries/${QUERY}/results`,
        headers: { Range: 'bytes=0-4' },
        responseType: 'arraybuffer',
      }),
    );
    expect(datasourceQueryResultsUrl(QUERY, BASE)).toBe(`${BASE}/api/contents/v1/queries/${QUERY}/results`);
  });

  it('saves a result into a Dataset by relative path and mints a ticket', async () => {
    const request = vi
      .spyOn(DatalayerApi, 'requestDatalayerAPI')
      .mockResolvedValueOnce({
        uid: '01REV', source_uid: '01DATASET', actor_uid: 'a', origin_kind: 'datasource-query',
        file_count: 1, total_size: 512, manifest_checksum: 'm', status: 'ready',
        created_at: '2026-08-26T12:00:00Z', files: [],
      })
      .mockResolvedValueOnce({
        ticket: 'opaque', expires_at: '2026-08-26T12:05:00Z',
        flight_endpoint: 'grpc+tls://flight.example', https_fallback_url: 'https://x/y',
      });

    const revision = await saveDatasourceQueryAsDataset(
      'token', QUERY, { datasetUid: '01DATASET', path: '/results/a.arrow' }, BASE,
    );
    const ticket = await createDatasourceQueryTicket('token', QUERY, { sandboxUid: '01SBX', expiresIn: 300 }, BASE);

    expect(revision.uid).toBe('01REV');
    expect(revision.originKind).toBe('datasource-query');
    expect(ticket.flightEndpoint).toBe('grpc+tls://flight.example');
    expect(request.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        url: `${BASE}/api/contents/v1/queries/${QUERY}/save`,
        method: 'POST',
        // A path inside the Dataset is relative; a leading slash is not a path.
        body: { dataset_uid: '01DATASET', path: 'results/a.arrow' },
      }),
    );
    expect(request.mock.calls[1][0]).toEqual(
      expect.objectContaining({
        url: `${BASE}/api/contents/v1/queries/${QUERY}/ticket`,
        body: { sandbox_uid: '01SBX', expires_in: 300 },
      }),
    );
  });
});
