/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { describe, expect, it } from 'vitest';
import {
  buildSpaceDetailsPath,
  findSpace,
  indexSpaces,
  resolveSpace,
  spaceAccountHandleOf,
  toCachedSpace,
} from '../spaceDisplayModel';

// Two spaces as `/spaces/users/me` answers: raw Solr fields, the owner spacer
// hydrates, and the items nested under each.
const library = {
  id: 'solr-library',
  uid: 'space-library',
  handle_s: 'library',
  name_t: 'Library',
  description_t: 'My shelf',
  variant_s: 'default',
  public_b: false,
  owner: { handle: 'eric' },
  items: [{ uid: 'nb-1' }, { uid: 'nb-2' }],
};
const research = {
  id: 'solr-research',
  uid: 'space-research',
  handle_s: 'research',
  name_t: 'Research',
  public_b: true,
  organization: { handle: 'datalayer' },
  owner: { handle: 'eric' },
  items: [{ uid: 'doc-1' }],
};
const spaces = [library, research];

describe('indexSpaces', () => {
  it('is built once per answer of the query, not once per row', () => {
    expect(indexSpaces(spaces)).toBe(indexSpaces(spaces));
    expect(indexSpaces([...spaces])).not.toBe(indexSpaces(spaces));
  });

  it('tolerates a query that has not answered', () => {
    expect(indexSpaces(undefined).byUid.size).toBe(0);
  });
});

describe('findSpace', () => {
  const index = indexSpaces(spaces);

  it('finds a space by its uid', () => {
    expect(findSpace(index, { uid: 'space-research' })).toBe(research);
  });

  it('finds a cross-space row by the Solr id its item is nested under', () => {
    expect(findSpace(index, { rootId: 'solr-library' })).toBe(library);
  });

  it('finds a row that kept nothing but its own uid, among the children', () => {
    expect(findSpace(index, { itemUid: 'doc-1' })).toBe(research);
  });

  it('matches a handle only together with its account', () => {
    expect(findSpace(index, { handle: 'library' })).toBeUndefined();
    expect(
      findSpace(index, { handle: 'research', accountHandle: '@datalayer' }),
    ).toBe(research);
  });

  it('does not take a space that shares a handle for a uid it does not know', () => {
    expect(
      findSpace(index, {
        uid: 'space-elsewhere',
        handle: 'library',
        accountHandle: 'eric',
      }),
    ).toBeUndefined();
  });
});

describe('spaceAccountHandleOf', () => {
  it('addresses an organization space under the organization', () => {
    expect(spaceAccountHandleOf(research)).toBe('datalayer');
  });

  it('addresses a personal space under its owner', () => {
    expect(spaceAccountHandleOf(library)).toBe('eric');
  });
});

describe('buildSpaceDetailsPath', () => {
  it('is /<account>/<space>', () => {
    expect(
      buildSpaceDetailsPath({
        accountHandle: '@datalayer',
        handle: 'research',
      }),
    ).toBe('/datalayer/research');
  });

  it('is nothing without both handles', () => {
    expect(buildSpaceDetailsPath({ handle: 'research' })).toBeNull();
    expect(buildSpaceDetailsPath({ accountHandle: 'eric' })).toBeNull();
  });
});

describe('resolveSpace', () => {
  it('shows a found space under its own name, with where it is', () => {
    expect(
      resolveSpace({
        descriptor: { rootId: 'solr-research' },
        found: toCachedSpace(research),
      }),
    ).toMatchObject({
      uid: 'space-research',
      displayName: 'Research',
      path: '/datalayer/research',
      isPublic: true,
      resolved: true,
    });
  });

  it('paints the snapshot an earlier view resolved', () => {
    const resolved = resolveSpace({
      descriptor: { uid: 'space-library' },
      cached: {
        uid: 'space-library',
        displayName: 'Library',
        handle: 'library',
        accountHandle: 'eric',
      },
    });
    expect(resolved.displayName).toBe('Library');
    expect(resolved.path).toBe('/eric/library');
  });

  it("shows the row's name only until the space has its own", () => {
    const descriptor = { uid: 'space-library', displayName: 'From the row' };
    expect(resolveSpace({ descriptor }).displayName).toBe('From the row');
    expect(
      resolveSpace({ descriptor, found: toCachedSpace(library) }).displayName,
    ).toBe('Library');
  });

  it('stands a truncated uid in before anything else is known', () => {
    const resolved = resolveSpace({
      descriptor: { uid: 'space-with-a-long-uid' },
      placeholderMaxLength: 8,
    });
    expect(resolved.displayName).toBe('space-wi…');
    expect(resolved.resolved).toBe(false);
    expect(resolved.path).toBeNull();
  });
});
