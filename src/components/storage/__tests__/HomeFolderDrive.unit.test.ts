/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * The JupyterLab drive writes through the one transfer — and so resumes from
 * the service's interrupted-transfer fixture like every other client.
 */

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as DatalayerApi from '../../../api/DatalayerApi';
import { HomeFolderDrive } from '../HomeFolderDrive';

const FIXTURE = resolve(
  __dirname,
  '../../../../../../../k8s/services/contents/tests/fixtures/interrupted-transfer.json',
);

type Fixture = {
  generator: { size: number };
  checksum: string;
  parts: { number: number; size: number; checksum: string }[];
  transfer: Record<string, unknown>;
};

const content = (size: number): Uint8Array =>
  Uint8Array.from({ length: size }, (_, i) => (i * 7 + (i >> 16)) & 0xff);

const base64 = (bytes: Uint8Array): string => {
  let binary = '';
  for (let index = 0; index < bytes.byteLength; index += 1) {
    binary += String.fromCharCode(bytes[index]);
  }
  return btoa(binary);
};

describe('HomeFolderDrive', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('lists a folder as a directory model', async () => {
    vi.spyOn(DatalayerApi, 'requestDatalayerAPI').mockResolvedValue({
      path: 'reports',
      items: [
        { name: 'earth.csv', path: 'reports/earth.csv', is_directory: false, size: 5, modified_at: '2026-08-26T00:00:00Z' },
        { name: 'q3', path: 'reports/q3', is_directory: true, size: 0, modified_at: null },
      ],
    });
    const drive = new HomeFolderDrive({ contentsUrl: 'https://contents', token: 'token' });

    const listing = await drive.get('reports');

    expect(listing.type).toBe('directory');
    expect((listing.content as { path: string; type: string }[]).map(item => [item.path, item.type])).toEqual([
      ['reports/earth.csv', 'file'],
      ['reports/q3', 'directory'],
    ]);
  });

  it.skipIf(!existsSync(FIXTURE))('resumes an interrupted upload from the verified parts', async () => {
    const fixture = JSON.parse(readFileSync(FIXTURE, 'utf8')) as Fixture;
    const finished = { ...fixture.transfer, status: 'succeeded', part_count: 3, received_bytes: fixture.generator.size };
    const request = vi
      .spyOn(DatalayerApi, 'requestDatalayerAPI')
      .mockResolvedValueOnce(fixture.transfer)
      .mockResolvedValue(finished);
    const drive = new HomeFolderDrive({ contentsUrl: 'https://contents', token: 'token' });
    const bytes = content(fixture.generator.size);
    const half = Math.floor(bytes.byteLength / 2);

    // The browser hands the file over in two chunks; the drive sends one transfer.
    await drive.save('datasets/interrupted.bin', { type: 'file', format: 'base64', content: base64(bytes.slice(0, half)), chunk: 1 } as never);
    const saved = await drive.save('datasets/interrupted.bin', { type: 'file', format: 'base64', content: base64(bytes.slice(half)), chunk: -1 } as never);

    expect(saved.path).toBe('datasets/interrupted.bin');
    const calls = request.mock.calls.map(([call]) => call);
    expect((calls[0].body as { checksum: string; destination_uri: string }).checksum).toBe(fixture.checksum);
    expect((calls[0].body as { destination_uri: string }).destination_uri).toBe('home-folder:///datasets/interrupted.bin');
    const parts = calls.filter(call => call.url.includes('/parts/'));
    expect(parts.map(call => call.url.split('/').pop())).toEqual(['2']);
    expect((parts[0].headers as Record<string, string>)['Content-SHA256']).toBe(fixture.parts[2].checksum);
  });
});
