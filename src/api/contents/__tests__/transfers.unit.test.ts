/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as DatalayerApi from '../../DatalayerApi';
import {
  createTransfer,
  downloadUserFolderObject,
  listTransfers,
  uploadTransferPart,
} from '../transfers';

const transfer = {
  uid: '01TRANSFER',
  direction: 'upload',
  source_uid: '01SOURCE',
  destination_uri: 'user-folder:///earth.csv',
  path: 'earth.csv',
  media_type: 'text/csv',
  expected_size: 5,
  expected_checksum: 'a'.repeat(64),
  overwrite_policy: 'reject',
  status: 'pending',
  received_bytes: 0,
  part_count: 0,
  created_at: '2026-08-24T12:00:00Z',
  updated_at: '2026-08-24T12:00:00Z',
  parts: [],
};

describe('Contents transfer API', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('creates and lists durable transfer metadata in camel case', async () => {
    const request = vi
      .spyOn(DatalayerApi, 'requestDatalayerAPI')
      .mockResolvedValueOnce(transfer)
      .mockResolvedValueOnce({ items: [transfer], next_cursor: 'next' });

    const created = await createTransfer(
      'token',
      {
        destinationUri: 'user-folder:///earth.csv',
        size: 5,
        checksum: 'a'.repeat(64),
      },
      'upload-earth',
    );
    const listed = await listTransfers('token', { active: true, limit: 5 });

    expect(created.expectedSize).toBe(5);
    expect(listed.nextCursor).toBe('next');
    expect(request).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        headers: { 'Idempotency-Key': 'upload-earth' },
        body: expect.objectContaining({
          destination_uri: 'user-folder:///earth.csv',
        }),
      }),
    );
  });

  it('uploads raw checksummed bytes and requests ranged binary downloads', async () => {
    const jsonRequest = vi
      .spyOn(DatalayerApi, 'requestDatalayerAPI')
      .mockResolvedValue(transfer);
    const binaryRequest = vi
      .spyOn(DatalayerApi, 'requestDatalayerAPIWithResponse')
      .mockResolvedValue({
        data: new ArrayBuffer(5),
        status: 206,
        statusText: 'Partial Content',
        headers: { 'content-range': 'bytes 0-4/10' },
      });

    await uploadTransferPart(
      'token',
      'transfer uid',
      0,
      new Uint8Array([1, 2, 3]),
      'b'.repeat(64),
    );
    const downloaded = await downloadUserFolderObject(
      'token',
      'object uid',
      { range: 'bytes=0-4' },
    );

    expect(downloaded.status).toBe(206);
    expect(jsonRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        url: expect.stringContaining('/transfer%20uid/parts/0'),
        headers: expect.objectContaining({ 'Content-SHA256': 'b'.repeat(64) }),
      }),
    );
    expect(binaryRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        headers: { Range: 'bytes=0-4' },
        responseType: 'arraybuffer',
      }),
    );
  });
});
