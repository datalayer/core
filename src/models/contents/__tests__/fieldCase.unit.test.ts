/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { describe, expect, it } from 'vitest';

import {
  contentsToCamelCase,
  contentsToSnakeCase,
  type JsonValue,
} from '../fieldCase';
import contractFixtures from '../__fixtures__/v1-contracts.json';
import solrCodecFixture from '../__fixtures__/solr-codec.json';

describe('Contents field case adapter', () => {
  it('recursively converts the language-neutral Solr codec public shape', () => {
    const python = {
      uid: '01ARZ3NDEKTSV4RRFFQ69G5FAV',
      source_uid: '01BX5ZZKBKACTAV9WEVGEMMVRZ',
      completed_bytes: 12,
      is_public: false,
      description: null,
      grants: [
        {
          principal_uid: '01BX5ZZKBKACTAV9WEVGEMMVRZ',
          access_level: 'view',
        },
      ],
    };
    const camel = contentsToCamelCase(python);
    expect(camel).toEqual({
      uid: '01ARZ3NDEKTSV4RRFFQ69G5FAV',
      sourceUid: '01BX5ZZKBKACTAV9WEVGEMMVRZ',
      completedBytes: 12,
      isPublic: false,
      description: null,
      grants: [
        {
          principalUid: '01BX5ZZKBKACTAV9WEVGEMMVRZ',
          accessLevel: 'view',
        },
      ],
    });
    expect(contentsToSnakeCase(camel)).toEqual(python);
  });

  it('rejects key collisions instead of silently overwriting fields', () => {
    expect(() =>
      contentsToCamelCase({ source_uid: 'one', sourceUid: 'two' })
    ).toThrow('Contents field collision');
  });

  it('round-trips every shared v1 source and attachment fixture', () => {
    const fixtures = contractFixtures as unknown as {
      sources: Array<Record<string, JsonValue>>;
      attachment_manifest: Record<string, JsonValue>;
    };
    expect(fixtures.sources).toHaveLength(8);
    for (const fixture of [...fixtures.sources, fixtures.attachment_manifest]) {
      expect(contentsToSnakeCase(contentsToCamelCase(fixture))).toEqual(fixture);
    }
  });

  it('round-trips the shared suffix, null and nested-document fixture', () => {
    const python = solrCodecFixture.python as JsonValue;
    expect(contentsToSnakeCase(contentsToCamelCase(python))).toEqual(python);
    expect(solrCodecFixture.solr.id).toBe('internal-root');
    expect(python).not.toHaveProperty('id');
  });
});
