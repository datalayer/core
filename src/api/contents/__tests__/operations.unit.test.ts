/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as DatalayerApi from '../../DatalayerApi';
import { cancelOperation, getOperation } from '../operations';

const response = {
  uid: '01ARZ3NDEKTSV4RRFFQ69G5FAV',
  operation_kind: 'transfer',
  source_uid: null,
  status: 'running',
  attempt: 1,
  max_attempts: 3,
  cancellation_requested: false,
  result: null,
  error_code: null,
  error_message: null,
  created_at: '2026-08-24T12:00:00Z',
  updated_at: '2026-08-24T12:00:10Z',
  completed_at: null,
};

describe('Contents operations API', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('returns camel-case status and URL-encodes the operation UID', async () => {
    const request = vi
      .spyOn(DatalayerApi, 'requestDatalayerAPI')
      .mockResolvedValue(response);

    const operation = await getOperation('token', 'operation uid');

    expect(operation.operationKind).toBe('transfer');
    expect(operation.maxAttempts).toBe(3);
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        url: expect.stringContaining('/operations/operation%20uid'),
        method: 'GET',
      }),
    );
  });

  it('uses the cancellation action endpoint', async () => {
    const request = vi
      .spyOn(DatalayerApi, 'requestDatalayerAPI')
      .mockResolvedValue({ ...response, cancellation_requested: true });

    const operation = await cancelOperation('token', response.uid);

    expect(operation.cancellationRequested).toBe(true);
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        url: expect.stringMatching(/\/operations\/[^/]+\/cancel$/),
        method: 'POST',
      }),
    );
  });
});
