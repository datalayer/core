/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as DatalayerApi from '../../DatalayerApi';
import { uploadDatasetFile } from '../transfers';

const DATASET = '01ARZ3NDEKTSV4RRFFQ69G5FAV';

describe('uploadDatasetFile', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('is the same transfer, addressed to the Dataset', async () => {
    const transfer = {
      uid: '01TRANSFER0000000000000000', direction: 'upload', source_uid: DATASET,
      destination_uri: `dataset://${DATASET}/results/co2.csv`, path: 'results/co2.csv',
      media_type: 'text/csv', expected_size: 3, expected_checksum: 'a'.repeat(64),
      overwrite_policy: 'reject', status: 'pending', received_bytes: 0, part_count: 0, parts: [],
      created_at: '2026-08-26T00:00:00Z', updated_at: '2026-08-26T00:00:00Z',
    };
    const request = vi
      .spyOn(DatalayerApi, 'requestDatalayerAPI')
      .mockResolvedValueOnce(transfer)
      .mockResolvedValue({ ...transfer, status: 'succeeded' });

    const result = await uploadDatasetFile('token', DATASET, '/results/co2.csv', Uint8Array.from([97, 44, 98]), {
      idempotencyKey: 'capture', mediaType: 'text/csv',
    });

    expect(result.status).toBe('succeeded');
    const calls = request.mock.calls.map(([call]) => call);
    expect((calls[0].body as { destination_uri: string }).destination_uri).toBe(`dataset://${DATASET}/results/co2.csv`);
    expect(calls.filter(call => call.url.includes('/parts/')).map(call => call.url.split('/').pop())).toEqual(['0']);
  });
});
