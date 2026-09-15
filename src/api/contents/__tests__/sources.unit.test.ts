/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as DatalayerApi from '../../DatalayerApi';
import {
  createSource,
  getHomeFolder,
  listSources,
  updateSource,
} from '../sources';

const response = {
  source: {
    contract_version: 'v1',
    uid: '01ARZ3NDEKTSV4RRFFQ69G5FAV',
    kind: 'dataset',
    name: 'Dataset',
    principal_uid: '01BX5ZZKBKACTAV9WEVGEMMVRZ',
    principal_kind: 'user',
    configuration: {
      kind: 'dataset',
      current_revision_uid: null,
      tags: [],
      publication_eligible: false,
    },
    capabilities: ['browse'],
    status: 'ready',
    created_at: '2026-08-24T12:00:00Z',
    updated_at: '2026-08-24T12:00:00Z',
  },
  permissions: {
    view: true,
    update: true,
    execute: true,
    effective_access_level: 'execute',
    is_owner: true,
  },
};

describe('Contents source API', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('converts the HTTP snake-case payload and retains the ETag', async () => {
    const request = vi
      .spyOn(DatalayerApi, 'requestDatalayerAPIWithResponse')
      .mockResolvedValue({
      data: response,
      status: 201,
      statusText: 'Created',
      headers: { etag: '"v1.hash"' },
    });

    const created = await createSource(
      'token',
      {
        kind: 'datasource',
        name: 'Warehouse',
        configuration: {
          kind: 'datasource',
          connectorType: 'postgresql',
        },
      },
      'create-datasource',
    );

    expect(created.etag).toBe('"v1.hash"');
    expect(created.value.source.principalUid).toBe(
      '01BX5ZZKBKACTAV9WEVGEMMVRZ',
    );
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({
          kind: 'datasource',
          configuration: {
            kind: 'datasource',
            connector_type: 'postgresql',
          },
        }),
        headers: { 'Idempotency-Key': 'create-datasource' },
      }),
    );
  });

  it('sends If-Match and converts camel-case updates to snake case', async () => {
    const request = vi
      .spyOn(DatalayerApi, 'requestDatalayerAPIWithResponse')
      .mockResolvedValue({
      data: response,
      status: 200,
      statusText: 'OK',
      headers: { etag: '"v1.next"' },
    });

    await updateSource(
      'token',
      'source uid',
      {
        configuration: {
          kind: 'datasource',
          connectorType: 'postgresql',
          defaultRowLimit: 1000,
        },
      },
      '"v1.hash"',
    );

    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        url: expect.stringContaining('/source%20uid'),
        headers: { 'If-Match': '"v1.hash"' },
        body: {
          configuration: {
            kind: 'datasource',
            connector_type: 'postgresql',
            default_row_limit: 1000,
          },
        },
      }),
    );
  });

  it('does not interpret the signed catalog cursor', async () => {
    const request = vi
      .spyOn(DatalayerApi, 'requestDatalayerAPI')
      .mockResolvedValue({
      items: [response],
      next_cursor: 'signed.cursor',
    });

    const page = await listSources('token', {
      kind: 'dataset',
      cursor: 'previous.cursor',
      limit: 25,
    });

    expect(page.nextCursor).toBe('signed.cursor');
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        url: expect.stringContaining('cursor=previous.cursor'),
      }),
    );
  });

  it('resolves the server-managed Home Folder and retains its ETag', async () => {
    const request = vi
      .spyOn(DatalayerApi, 'requestDatalayerAPIWithResponse')
      .mockResolvedValue({
        data: {
          ...response,
          source: { ...response.source, kind: 'files', name: 'Home Folder' },
        },
        status: 200,
        statusText: 'OK',
        headers: { etag: '"folder.hash"' },
      });

    const folder = await getHomeFolder('token');

    expect(folder.value.source.name).toBe('Home Folder');
    expect(folder.etag).toBe('"folder.hash"');
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({ url: expect.stringMatching(/\/sources\/home-folder$/) }),
    );
  });
});
