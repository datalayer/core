/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * The TypeScript client resumes from the transfer the service answers.
 *
 * The fixture is the service's own — `k8s/services/contents/tests/fixtures/
 * interrupted-transfer.json`, proved there to be what the service says after
 * a connection drops with two parts of three received. Handed that answer,
 * the client must upload only the third part, with the checksum the service
 * will verify it against, and then complete. The Python client and the CLI
 * are held to the same file.
 */

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as DatalayerApi from '../../DatalayerApi';
import { uploadHomeFolderFile } from '../transfers';

const FIXTURE = resolve(
  __dirname,
  '../../../../../../../k8s/services/contents/tests/fixtures/interrupted-transfer.json',
);

type Fixture = {
  generator: { size: number };
  part_size: number;
  checksum: string;
  parts: { number: number; size: number; checksum: string }[];
  transfer: Record<string, unknown>;
};

const content = (size: number): Uint8Array =>
  Uint8Array.from({ length: size }, (_, i) => (i * 7 + (i >> 16)) & 0xff);

describe.skipIf(!existsSync(FIXTURE))('Contents transfer resume fixture', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('uploads only the part the service has not verified', async () => {
    const fixture = JSON.parse(readFileSync(FIXTURE, 'utf8')) as Fixture;
    const finished = {
      ...fixture.transfer,
      status: 'succeeded',
      part_count: 3,
      received_bytes: fixture.generator.size,
    };
    const request = vi
      .spyOn(DatalayerApi, 'requestDatalayerAPI')
      .mockResolvedValueOnce(fixture.transfer)
      .mockResolvedValue(finished);

    const result = await uploadHomeFolderFile(
      'token',
      'datasets/interrupted.bin',
      content(fixture.generator.size),
      { idempotencyKey: 'resume-fixture' },
    );

    expect(result.status).toBe('succeeded');
    const calls = request.mock.calls.map(([call]) => call);
    // Same bytes: the whole-file checksum the client computed is the fixture's.
    expect(calls[0].method).toBe('POST');
    expect((calls[0].body as { checksum: string }).checksum).toBe(fixture.checksum);
    // Exactly one part goes up — the third — and it is the third.
    const parts = calls.filter(call => call.url.includes('/parts/'));
    expect(parts.map(call => call.url.split('/').pop())).toEqual(['2']);
    expect((parts[0].headers as Record<string, string>)['Content-SHA256']).toBe(
      fixture.parts[2].checksum,
    );
    expect((parts[0].body as Uint8Array).byteLength).toBe(fixture.parts[2].size);
    expect(calls[calls.length - 1].url.endsWith('/complete')).toBe(true);
  });
});
