/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { describe, expect, it } from 'vitest';
import type { CatalogSource } from '../../../api/contents';
import {
  canExecuteContentSource,
  canShareContentSource,
  canUpdateContentSource,
  contentSourceEffectiveRole,
  contentSourceKindLabel,
} from '../permissions';

const source = (overrides: Partial<CatalogSource> = {}): CatalogSource => ({
  source: {
    contractVersion: 'v1',
    uid: '01ARZ3NDEKTSV4RRFFQ69G5FAV',
    kind: 'dataset',
    name: 'Example',
    principalKind: 'user',
    principalUid: '01BX5ZZKBKACTAV9WEVGEMMVRZ',
    configuration: { kind: 'dataset' },
    status: 'ready',
    createdAt: '2026-08-24T12:00:00Z',
    updatedAt: '2026-08-24T12:00:00Z',
  },
  permissions: {
    view: true,
    update: false,
    execute: true,
    effectiveAccessLevel: 'execute',
    isOwner: false,
  },
  ...overrides,
});

describe('Contents permission helpers', () => {
  it('uses the effective server permission instead of inferring from ownership', () => {
    const shared = source();
    expect(contentSourceEffectiveRole(shared)).toBe('Execute');
    expect(canExecuteContentSource(shared)).toBe(true);
    expect(canUpdateContentSource(shared)).toBe(false);
    expect(canShareContentSource(shared)).toBe(false);
  });

  it('permits owners to share normal sources but never the User Folder', () => {
    const owned = source({
      permissions: {
        view: true,
        update: true,
        execute: true,
        effectiveAccessLevel: 'execute',
        isOwner: true,
      },
    });
    expect(contentSourceEffectiveRole(owned)).toBe('Owner');
    expect(canShareContentSource(owned)).toBe(true);
    expect(
      canShareContentSource({
        ...owned,
        source: {
          ...owned.source,
          kind: 'files',
          configuration: { kind: 'files', rootUri: 'user-folder:///' },
        },
      }),
    ).toBe(false);
  });

  it('provides stable user-facing kind labels', () => {
    expect(contentSourceKindLabel('cloud-storage')).toBe('Cloud Storage');
    expect(contentSourceKindLabel('data-server')).toBe('Dataserver');
  });
});
