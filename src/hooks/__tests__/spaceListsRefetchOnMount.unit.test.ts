/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Every list of what a space holds is read again when a page mounts it.
 *
 * The app builds its `QueryClient` with `refetchOnMount: false`, and the
 * default options here keep a query fresh for five minutes — so a list that
 * takes the defaults shows, on coming back to it, what it held before the
 * item just created elsewhere existed. `LIST_QUERY_OPTIONS` is the answer,
 * and it only works on the lists that take it: two of them did not.
 *
 * The hooks live in one closure that needs a whole application to call, so
 * this reads the source: each query on a space's items, of every type or of
 * one, must spread the list options and not the default ones.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(resolve(__dirname, '../useCache.ts'), 'utf8');

/** The hooks of the cache, each with the source that defines it. */
const hooks = source
  .split(/\n {2}(?=const use[A-Z]\w* = )/)
  .slice(1)
  .map(block => ({
    name: /^const (use\w+)/.exec(block)?.[1] ?? '',
    block,
  }));

/** A request for a space's items: all of them, or those of one type. */
const SPACE_ITEMS_URL = /\/spaces\/\$\{spaceId\}\/items(\/types\/[a-z]+)?`/;

const spaceLists = hooks.filter(
  ({ block }) => /\buseQuery\(/.test(block) && SPACE_ITEMS_URL.test(block),
);

describe('the lists of what a space holds', () => {
  it('are found by this test', () => {
    // A scan that matched nothing would pass the next test by saying nothing.
    expect(spaceLists.map(({ name }) => name)).toEqual(
      expect.arrayContaining([
        'useSpaceItems',
        'useNotebooksBySpace',
        'useDocumentsBySpace',
        'useEnvironmentsBySpace',
        'useCellsBySpace',
      ]),
    );
  });

  it.each(spaceLists)('$name is read again on mount', ({ block }) => {
    expect(block).toContain('...LIST_QUERY_OPTIONS');
    expect(block).not.toContain('...DEFAULT_QUERY_OPTIONS');
  });

  it('refetch on mount whatever the client says', () => {
    const options = /const LIST_QUERY_OPTIONS = \{[^}]*\}/.exec(source)?.[0];
    expect(options).toContain("refetchOnMount: 'always'");
  });
});
