/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Every artifact the library answers with carries its tags to the card.
 *
 * The library indexes `tags_ss` for all eleven kinds and searches on it. Ten
 * of the eleven mappers read it. The six space items — notebook, document,
 * cell, lesson, exercise, assignment — did not, and they are most of what the
 * library holds.
 *
 * The failure had no symptom anywhere it could be seen: a notebook could be
 * published under tags, be *found* by searching for one of them, and arrive
 * at the card that shows tags with none. The field was dropped one layer
 * below anything that renders.
 *
 * So this is asked of the mappers as a set, rather than of one of them:
 * the bug was a mapper that was forgotten, and a test naming only the
 * mappers somebody remembered would be forgotten in the same way.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';

/** The mapper source, which is where the field is either read or is not. */
const source = readFileSync(join(__dirname, '..', 'useCache.ts'), 'utf8');

/**
 * One mapper's body: from its own declaration to the next one's.
 *
 * Bounded by the next declaration rather than by a character count. A fixed
 * window is the way this test fails to fail — 2000 characters spills into
 * the mappers below, so a mapper that had lost its `tags` still "found" one,
 * in its neighbour. Every mutation of this file passed until the window was
 * closed.
 */
const mapperBody = (name: string): string => {
  const start = source.indexOf(`const ${name} = (`);
  expect(start, `${name} is not there any more`).toBeGreaterThan(-1);
  const next = source.slice(start + 1).search(/\n {2}const to[A-Z]/);
  expect(next, `${name} has no mapper after it to bound it`).toBeGreaterThan(
    -1,
  );
  return source.slice(start, start + 1 + next);
};

/**
 * The artifact types the library holds, and the mapper each one goes
 * through. Read off `ARTIFACT_TYPES` in `datalayer_solr/library.py`.
 */
const MAPPERS: Array<[string, string]> = [
  ['notebook', 'toNotebook'],
  ['document', 'toDocument'],
  ['cell', 'toCell'],
  ['lesson', 'toLesson'],
  ['exercise', 'toExercise'],
  ['assignment', 'toAssignment'],
  ['dataset', 'toDataset'],
  ['dataserver', 'toDataserver'],
  ['agent', 'toAgent'],
  ['evalset', 'toEvalset'],
];

describe('a library artifact keeps its tags on the way to the card', () => {
  it.each(MAPPERS)('a %s does, through %s', (_type, mapper) => {
    const body = mapperBody(mapper);
    expect(body).toMatch(/tags:/);
    // Read from the Solr field, not invented: `tags_ss` is what the library
    // indexes and what a search matches against.
    expect(body).toMatch(/tags_ss/);
  });

  it('describes itself too', () => {
    // The other half of what a card shows. This one was never missing, and
    // is here so that removing it fails something.
    for (const [, mapper] of MAPPERS) {
      expect(mapperBody(mapper)).toMatch(/description/);
    }
  });

  it('answers with a list when the artifact has no tags', () => {
    /*
     * `undefined` and `[]` render the same today, but they are different
     * answers: one is "no tags", the other is "this mapper does not know".
     * The card counts what it is given, so it has to be given a count.
     */
    for (const [, mapper] of MAPPERS) {
      const body = mapperBody(mapper);
      expect(body, mapper).toMatch(
        /Array\.isArray\([a-z_]+\.tags_ss\)|tags_ss\s*(\?\?|\|\|)\s*\[\]/,
      );
    }
  });
});
