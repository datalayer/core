/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * What the library is asked for when the caller names no types.
 *
 * The administration page for the featured ribbon lists what could be
 * featured by asking for the default. A deck was published, found by its
 * address and by searching for it, and yet never appeared there — the default
 * list had been written before decks were a library type, so the page never
 * asked for one and there was nothing to press Feature on.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(join(__dirname, '..', 'useCache.ts'), 'utf8');

/** The default list, as written. */
const defaults = (): string[] => {
  const match = /const LIBRARY_ARTIFACT_TYPES = \[([^\]]*)\]/.exec(source);
  expect(match, 'the default type list is not there any more').not.toBeNull();
  return [...match![1].matchAll(/'([a-z]+)'/g)].map(type => type[1]);
};

describe('the library types searched by default', () => {
  it('include decks, so that a published deck can be offered for the ribbon', () => {
    expect(defaults()).toContain('deck');
  });

  it('keep every type that was already there', () => {
    expect(defaults()).toEqual(
      expect.arrayContaining([
        'notebook',
        'document',
        'cell',
        'lesson',
        'exercise',
        'assignment',
        'course',
        'evalset',
        'dataset',
        'agent',
      ]),
    );
  });

  it('are what a search uses when it names none', () => {
    expect(source).toMatch(
      /normalizedTypes\.length > 0\s*\?\s*normalizedTypes\s*:\s*LIBRARY_ARTIFACT_TYPES/,
    );
  });
});
