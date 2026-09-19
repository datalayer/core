/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { useSpaceCacheStore } from '../useSpaceCacheStore';

describe('useSpaceCacheStore', () => {
  beforeEach(() => {
    useSpaceCacheStore.getState().reset();
  });

  it('merges snapshots without letting a blank overwrite what is known', () => {
    useSpaceCacheStore
      .getState()
      .upsertSpace({ uid: 's1', displayName: 'Research', handle: 'research' });
    useSpaceCacheStore
      .getState()
      .upsertSpace({ uid: 's1', displayName: '', accountHandle: 'datalayer' });
    expect(useSpaceCacheStore.getState().getSpace('s1')).toMatchObject({
      displayName: 'Research',
      handle: 'research',
      accountHandle: 'datalayer',
    });
  });

  it('finds a space by the Solr id an item names it by', () => {
    useSpaceCacheStore
      .getState()
      .upsertSpace({ uid: 's1', rootId: 'solr-1', displayName: 'Research' });
    expect(useSpaceCacheStore.getState().getSpaceByRootId('solr-1')?.uid).toBe(
      's1',
    );
  });

  it('publishes no new state for a snapshot it already has', () => {
    useSpaceCacheStore
      .getState()
      .upsertSpace({ uid: 's1', displayName: 'Research' });
    const before = useSpaceCacheStore.getState().spaces;
    useSpaceCacheStore
      .getState()
      .upsertSpace({ uid: 's1', displayName: 'Research' });
    expect(useSpaceCacheStore.getState().spaces).toBe(before);
  });

  it('forgets a space, and the Solr id that pointed at it', () => {
    useSpaceCacheStore
      .getState()
      .upsertSpace({ uid: 's1', rootId: 'solr-1', displayName: 'Research' });
    useSpaceCacheStore.getState().clearSpace('s1');
    expect(useSpaceCacheStore.getState().getSpace('s1')).toBeUndefined();
    expect(
      useSpaceCacheStore.getState().getSpaceByRootId('solr-1'),
    ).toBeUndefined();
  });
});
