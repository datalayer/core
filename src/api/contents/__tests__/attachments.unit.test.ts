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
import { createAttachment, getAttachmentManifest } from '../attachments';

const attachment = {
  uid: '01ATTACHMENT',
  source_uid: '01SOURCE',
  sandbox_uid: '01SANDBOX',
  sandbox_provider: 'datalayer',
  mode: 'rw',
  mount_path: '/home/jovyan/volumes/work',
  delivery: 'mount',
  required: true,
  capabilities: [],
  status: 'requested',
  limits: {},
  created_at: '2026-08-24T12:00:00Z',
  cleanup_policy: 'revoke',
};

describe('Contents attachment API', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('creates requests and reads provider-neutral manifests', async () => {
    const request = vi
      .spyOn(DatalayerApi, 'requestDatalayerAPI')
      .mockResolvedValueOnce(attachment)
      .mockResolvedValueOnce({
        contract_version: 'v1',
        sandbox_uid: '01SANDBOX',
        sandbox_provider: 'datalayer',
        generated_at: '2026-08-24T12:00:00Z',
        attachments: [attachment],
      });

    const created = await createAttachment(
      'token',
      {
        sourceUid: '01SOURCE',
        sandboxUid: '01SANDBOX',
        sandboxProvider: 'datalayer',
        mode: 'rw',
        mountPath: '/home/jovyan/volumes/work',
      },
      'attach-volume',
    );
    const manifest = await getAttachmentManifest('token', '01SANDBOX');

    expect(created.mountPath).toBe('/home/jovyan/volumes/work');
    expect(manifest.contractVersion).toBe('v1');
    expect(request).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        headers: { 'Idempotency-Key': 'attach-volume' },
        body: expect.objectContaining({ sandbox_uid: '01SANDBOX' }),
      }),
    );
  });
});
