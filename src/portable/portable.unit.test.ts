/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { personOf } from './index';

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

describe('the portable entry', () => {
  it('imports nothing but its own modules', () => {
    for (const file of readdirSync(__dirname).filter(
      name => name.endsWith('.ts') && !name.includes('.test.'),
    )) {
      const source = readFileSync(join(__dirname, file), 'utf8');
      const imports = [...source.matchAll(/from\s+'([^']+)'/g)].map(m => m[1]);
      expect(
        imports.filter(path => !path.startsWith('./')),
        file,
      ).toEqual([]);
    }
  });
});
