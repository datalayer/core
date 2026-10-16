/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  detailOf,
  kindOfStatus,
  personOf,
  Problem,
  problemOf,
  retries,
} from '../portable';

describe('personOf', () => {
  it('names the person by first and last name, else by handle', () => {
    expect(
      personOf({
        uid: 'u1',
        handle_s: 'ada',
        first_name_t: 'Ada',
        last_name_t: 'Lovelace',
        avatar_icon_s: 'cat',
      }),
    ).toEqual({
      uid: 'u1',
      handle: 'ada',
      displayName: 'Ada Lovelace',
      avatarIcon: 'cat',
    });
    expect(personOf({ uid: 'u1', handle_s: 'ada', first_name_t: ' ' })).toEqual(
      { uid: 'u1', handle: 'ada', displayName: 'ada', avatarIcon: undefined },
    );
  });

  it('is undefined without a uid and a handle', () => {
    expect(personOf(undefined)).toBeUndefined();
    expect(personOf({ uid: 'u1' })).toBeUndefined();
    expect(personOf({ handle_s: 'ada' })).toBeUndefined();
  });
});

describe('states (MOBILE M-013b)', () => {
  it('words each failed status, and keeps the detail free of query values', () => {
    expect([401, 403, 404, 409, 429, 503, 500].map(kindOfStatus)).toEqual([
      'unauthenticated',
      'forbidden',
      'not-found',
      'conflict',
      'rate-limited',
      'unavailable',
      'unexpected',
    ]);
    expect(
      detailOf('GET', '/api/x?token=secret', 404, { detail: 'No such app.' }),
    ).toBe('GET /api/x → 404: No such app.');
  });

  it('says a problem in the person’s words, and when trying again helps', () => {
    const problem = new Problem('offline', 'fetch failed');
    expect(problem.message).toBe('You are offline. Connect to continue.');
    expect(retries(problem)).toBe(true);
    expect(retries(new Problem('forbidden', ''))).toBe(false);
    expect(problemOf(new Error('boom'))).toMatchObject({
      kind: 'unexpected',
      detail: 'boom',
    });
  });
});

describe('the portable entry', () => {
  const folder = join(__dirname, '..', 'portable');
  it('imports nothing but its own modules and Core’s pure Person model', () => {
    for (const file of readdirSync(folder).filter(
      name => name.endsWith('.ts') && !name.includes('.test.'),
    )) {
      const source = readFileSync(join(folder, file), 'utf8');
      const imports = [...source.matchAll(/from\s+'([^']+)'/g)].map(m => m[1]);
      expect(
        imports.filter(
          path => !path.startsWith('./') && path !== '../models/Person',
        ),
        file,
      ).toEqual([]);
    }
    const person = readFileSync(
      join(__dirname, '..', 'models', 'Person.ts'),
      'utf8',
    );
    expect(person).not.toMatch(/^import /m);
  });
});
