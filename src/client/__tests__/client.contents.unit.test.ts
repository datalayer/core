/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as ContentsApi from '../../api/contents';
import { DEFAULT_SERVICE_URLS } from '../../api/constants';
import { DatalayerCoreClient } from '../index';

describe('DatalayerCoreClient Contents configuration', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('defaults Contents to prod1 and includes it in the resolved config', () => {
    const client = new DatalayerCoreClient({});
    expect(client.getContentsUrl()).toBe(DEFAULT_SERVICE_URLS.CONTENTS);
    expect(client.getConfig().contentsUrl).toBe(DEFAULT_SERVICE_URLS.CONTENTS);
  });

  it('passes an explicit Contents URL to catalog methods', async () => {
    const list = vi.spyOn(ContentsApi, 'listSources').mockResolvedValue({
      items: [],
      nextCursor: null,
    });
    const client = new DatalayerCoreClient({
      token: 'token',
      contentsUrl: 'http://localhost:9400',
    });

    await client.listContentSources({ kind: 'dataset' });

    expect(list).toHaveBeenCalledWith(
      'token',
      { kind: 'dataset' },
      'http://localhost:9400',
    );
  });
});
