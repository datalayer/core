/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import * as DatalayerApi from '../../DatalayerApi';
import { getNotebookModel } from '../notebooks';

const NOTEBOOK = {
  cells: [{ cell_type: 'code', source: '1 + 1', outputs: [{ output_type: 'execute_result', data: { 'text/plain': '2' } }] }],
  metadata: {},
  nbformat: 4,
  nbformat_minor: 5,
};

describe('getNotebookModel', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("reads the notebook's content by its uid", async () => {
    const request = vi
      .spyOn(DatalayerApi, 'requestDatalayerAPI')
      .mockResolvedValue({ success: true, notebook: { uid: 'nb-1', model_s: JSON.stringify(NOTEBOOK) } });

    const model = await getNotebookModel({ baseUrl: 'https://spacer.test', token: 'token' }, 'nb-1');

    expect(model).toEqual(NOTEBOOK);
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({ url: 'https://spacer.test/api/spacer/v1/notebooks/nb-1', method: 'GET' }),
    );
  });

  it('answers nothing for content that is not a notebook', async () => {
    const request = vi.spyOn(DatalayerApi, 'requestDatalayerAPI');
    request.mockResolvedValueOnce({ notebook: { model_s: 'not json' } });
    request.mockResolvedValueOnce({ notebook: { model_s: '{"no":"cells"}' } });
    request.mockResolvedValueOnce({ notebook: {} });

    expect(await getNotebookModel({}, 'a')).toBeUndefined();
    expect(await getNotebookModel({}, 'b')).toBeUndefined();
    expect(await getNotebookModel({}, 'c')).toBeUndefined();
  });
});
