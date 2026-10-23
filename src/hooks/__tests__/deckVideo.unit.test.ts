/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * A deck's saved video, through the cache: the Spacer routes it reads and
 * writes, and the publish that takes it to the library.
 *
 * Read off the source, as the other cache contracts are: the hooks are thin
 * requests, and what can go wrong is the address, the method or a field.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(join(__dirname, '..', 'useCache.ts'), 'utf8');

const hookBody = (name: string): string => {
  const start = source.indexOf(`const ${name} = (`);
  expect(start, `${name} is not there`).toBeGreaterThan(-1);
  const next = source.slice(start + 1).search(/\n {2}const use[A-Z]/);
  return source.slice(start, start + 1 + (next > -1 ? next : 4000));
};

describe('a deck video kept with the deck', () => {
  it.each([
    ['useSavedDeckVideo', 'GET'],
    ['useSaveDeckVideo', 'PUT'],
    ['useDeleteDeckVideo', 'DELETE'],
  ])('%s is a %s on the deck’s video in Spacer', (hook, method) => {
    const body = hookBody(hook);
    expect(body).toContain(
      '/api/spacer/v1/decks/${encodeURIComponent(deckId)}/video',
    );
    expect(body).toContain(`method: '${method}'`);
  });

  it('is read under the deck, so saving the deck refreshes whether it is stale', () => {
    expect(source).toMatch(
      /video: \(deckId: string\) =>\s*\[\.\.\.queryKeys\.decks\.detail\(deckId\), 'video'\]/,
    );
  });

  it('is saved with the spec it was made from', () => {
    const body = hookBody('useSaveDeckVideo');
    for (const field of ["'video'", "'captions'", "'poster'", "'spec'"]) {
      expect(body).toContain(field);
    }
    expect(body).toContain('JSON.stringify(spec)');
  });

  it('is published with the deck only when asked', () => {
    const body = hookBody('usePublishArtifact');
    expect(body).toContain('...(video ? { video: true } : {})');
  });
});
