/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as DatalayerApi from '../../DatalayerApi';
import {
  getCredentialDiagnostics,
  listCloudObjects,
  presignCloudObject,
  rotateSourceCredential,
  testCloudConnection,
} from '../cloudStorage';

const SOURCE = '01ARZ3NDEKTSV4RRFFQ69G5FAV';

describe('Contents cloud storage API', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('lists a prefix in camel case and carries the cursor', async () => {
    const request = vi.spyOn(DatalayerApi, 'requestDatalayerAPI').mockResolvedValue({
      items: [{ path: 'data/a.csv', size: 8, is_directory: false, modified_at: null, etag: null }],
      next_cursor: 'eyJ0b2tlbiI6ICJ4In0=',
    });

    const page = await listCloudObjects('token', SOURCE, { prefix: 'data/', cursor: 'c1' }, 'https://contents');

    expect(page.items[0].isDirectory).toBe(false);
    expect(page.nextCursor).toBe('eyJ0b2tlbiI6ICJ4In0=');
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        url: `https://contents/api/contents/v1/sources/${SOURCE}/cloud/objects?prefix=data%2F&cursor=c1`,
        method: 'GET',
      }),
    );
  });

  it('asks for a presigned URL with the operation and the lifetime', async () => {
    const request = vi
      .spyOn(DatalayerApi, 'requestDatalayerAPI')
      .mockResolvedValue({ url: 'https://bucket/a?sig=1', operation: 'put', expires_in: 300 });

    const signed = await presignCloudObject('token', SOURCE, 'data/a.csv', { operation: 'put', expiresIn: 300 }, 'https://contents');

    expect(signed.expiresIn).toBe(300);
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        url: `https://contents/api/contents/v1/sources/${SOURCE}/cloud/objects/presign?path=data%2Fa.csv&operation=put&expires_in=300`,
        method: 'POST',
      }),
    );
  });

  it('tests the connection and reads the diagnostics without a value', async () => {
    const request = vi
      .spyOn(DatalayerApi, 'requestDatalayerAPI')
      .mockResolvedValueOnce({ ok: false, provider: 's3', detail: 'AccessDenied' })
      .mockResolvedValueOnce({
        source_uid: SOURCE, credential_uid: 'c', credential_name: 'bucket key',
        referenced: true, resolvable: true, detail: 'resolvable',
      });

    const verdict = await testCloudConnection('token', SOURCE, 'https://contents');
    const diagnostics = await getCredentialDiagnostics('token', SOURCE, 'https://contents');

    expect(verdict).toEqual({ ok: false, provider: 's3', detail: 'AccessDenied' });
    expect(diagnostics.credentialName).toBe('bucket key');
    expect(Object.keys(diagnostics)).not.toContain('value');
    expect(request.mock.calls[0][0].url).toBe(`https://contents/api/contents/v1/sources/${SOURCE}/cloud/test`);
    expect(request.mock.calls[1][0].url).toBe(`https://contents/api/contents/v1/sources/${SOURCE}/diagnostics`);
  });

  it('rotates the credential conditionally on the ETag', async () => {
    const request = vi.spyOn(DatalayerApi, 'requestDatalayerAPI').mockResolvedValue({ source: { uid: SOURCE } });

    await rotateSourceCredential('token', SOURCE, '01HZY7WQ8XKJ4M2N5P6R7S8T9V', '"v3"', 'https://contents');

    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'POST',
        headers: { 'If-Match': '"v3"' },
        body: { credential_uid: '01HZY7WQ8XKJ4M2N5P6R7S8T9V' },
      }),
    );
  });
});
