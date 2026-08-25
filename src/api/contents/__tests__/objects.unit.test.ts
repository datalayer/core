/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as DatalayerApi from '../../DatalayerApi';
import {
  deleteUserFolderObject,
  listUserFolderObjects,
  restoreUserFolderObject,
} from '../objects';

const object = {
  uid: '01OBJECT',
  source_uid: '01SOURCE',
  path: 'reports/earth.csv',
  kind: 'file',
  current_version_uid: '01VERSION',
  size: 42,
  media_type: 'text/csv',
  checksum_algorithm: 'sha256',
  checksum: 'abc123',
  deleted: false,
  created_by_uid: '01OWNER',
  created_at: '2026-08-24T12:00:00Z',
  updated_at: '2026-08-24T12:00:01Z',
};

describe('Contents User Folder object API', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('converts browse metadata and preserves opaque cursors', async () => {
    const request = vi
      .spyOn(DatalayerApi, 'requestDatalayerAPI')
      .mockResolvedValue({ items: [object], next_cursor: 'signed.cursor' });

    const page = await listUserFolderObjects('token', {
      prefix: 'reports',
      cursor: 'previous.cursor',
      limit: 25,
    });

    expect(page.items[0].currentVersionUid).toBe('01VERSION');
    expect(page.nextCursor).toBe('signed.cursor');
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        url: expect.stringContaining(
          'prefix=reports&cursor=previous.cursor',
        ),
      }),
    );
  });

  it('sends idempotency and snake-case restoration payloads', async () => {
    const request = vi
      .spyOn(DatalayerApi, 'requestDatalayerAPI')
      .mockResolvedValue(object);

    await deleteUserFolderObject('token', 'object uid', 'delete-object');
    await restoreUserFolderObject(
      'token',
      'object uid',
      { versionUid: '01VERSION' },
      'restore-object',
    );

    expect(request).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        method: 'DELETE',
        url: expect.stringContaining('/object%20uid'),
        headers: { 'Idempotency-Key': 'delete-object' },
      }),
    );
    expect(request).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        method: 'POST',
        body: { version_uid: '01VERSION' },
        headers: { 'Idempotency-Key': 'restore-object' },
      }),
    );
  });
});
