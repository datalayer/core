/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * A published application's face, kind and liveness, as the Library answers
 * them (LOOP I-08, R-13): `toItem` carried none of them, so its card drew no
 * face and the gallery could not tell which one to open.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { libraryAppFaceOf, libraryAppFieldsOf } from '../libraryApp';

describe('a published application', () => {
  it('carries its face as Spacer keeps it, each part only when set', () => {
    expect(
      libraryAppFieldsOf({
        face_s:
          '{"avatar": "owl", "banner": "dawn", "emoji": "🦉", "id": "ship-or-fix"}',
        app_kind_s: 'decision',
        runs_live_b: false,
      }),
    ).toEqual({
      face: { id: 'ship-or-fix', emoji: '🦉', avatar: 'owl', banner: 'dawn' },
      appKind: 'decision',
      runsLive: false,
    });
    expect(libraryAppFaceOf('{"id": "x", "emoji": ""}')).toEqual({ id: 'x' });
  });

  it('says its kind and runs live only when the Library says so', () => {
    expect(
      libraryAppFieldsOf({ app_kind_s: 'chat', runs_live_b: true }),
    ).toEqual({ appKind: 'chat', runsLive: true });
    expect(libraryAppFieldsOf({})).toEqual({ runsLive: false });
  });

  it('refuses a face or a kind that is not one', () => {
    expect(() => libraryAppFaceOf('not json')).toThrow();
    expect(() => libraryAppFaceOf('[1]')).toThrow(/not an object/);
    expect(() => libraryAppFieldsOf({ app_kind_s: 'robot' })).toThrow(/kind/);
  });

  it('is what the Library item of an app is mapped with', () => {
    const source = readFileSync(join(__dirname, '..', 'useCache.ts'), 'utf8');
    expect(source).toMatch(
      /const toApp = [\s\S]*?\.\.\.libraryAppFieldsOf\(raw\),[\s\S]*?type: 'app',/,
    );
  });
});
