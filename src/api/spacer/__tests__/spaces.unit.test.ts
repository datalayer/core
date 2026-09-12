/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import * as DatalayerApi from '../../DatalayerApi';
import { getManagedSpace } from '../spaces';

describe('getManagedSpace', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("asks Spacer for an account's managed space of a kind, and answers the space", async () => {
    const space = {
      uid: 'space-1',
      handle: 'orchestration',
      name: 'Orchestration',
      variant: 'orchestration',
      account_uid: 'org-1',
      account_type: 'organization',
      account_handle: 'acme',
    };
    const request = vi
      .spyOn(DatalayerApi, 'requestDatalayerAPI')
      .mockResolvedValue({ success: true, space });

    const found = await getManagedSpace(
      { baseUrl: 'https://spacer.test/', token: 'token' },
      'orchestration',
      'org-1',
    );

    expect(found).toEqual(space);
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'https://spacer.test/api/spacer/v1/spaces/orchestration?account_uid=org-1',
        method: 'GET',
        token: 'token',
      }),
    );
  });

  it("asks for the caller's own when no account is named", async () => {
    const request = vi
      .spyOn(DatalayerApi, 'requestDatalayerAPI')
      .mockResolvedValue({ success: true, space: {} });

    await getManagedSpace({ baseUrl: 'https://spacer.test' }, 'benchmarks');

    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({ url: 'https://spacer.test/api/spacer/v1/spaces/benchmarks' }),
    );
  });
});
