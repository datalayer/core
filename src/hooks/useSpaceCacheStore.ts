/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { create } from 'zustand';
import { registerSessionState } from '../state/sessionEnd';

/**
 * A resolved space, kept in memory.
 *
 * The companion of {@link usePrincipalCacheStore}, for the same reason: a
 * table of a hundred notebooks sitting in three spaces should resolve the
 * three names once, and the next view that shows one of those spaces should
 * paint it before any request has returned. Partial snapshots merge — a blank
 * never overwrites a value already known — so what is known of a space
 * accumulates across the views that saw it.
 */
export type CachedSpace = {
  /** The space uid: what the spacer API names a space by. */
  uid: string;
  /**
   * The space's internal Solr id. An item is a nested child of its space and
   * names it only by this (`_root_`), so a row that knows nothing else can
   * still be matched to its space.
   */
  rootId?: string;
  handle?: string;
  displayName?: string;
  description?: string;
  variant?: string;
  isPublic?: boolean;
  /** The account the space is addressed under: its organization, else its owner. */
  accountHandle?: string;
  /** Timestamp (ms) of the last time this entry changed. */
  updatedAt?: number;
};

const MERGEABLE_KEYS: Array<keyof CachedSpace> = [
  'rootId',
  'handle',
  'displayName',
  'description',
  'variant',
  'isPublic',
  'accountHandle',
];

function hasMeaningfulValue(value: unknown): boolean {
  if (value === undefined || value === null) {
    return false;
  }
  if (typeof value === 'string') {
    return value.trim().length > 0;
  }
  return true;
}

type SpaceCacheState = {
  /** Cached spaces keyed by uid. */
  spaces: Record<string, CachedSpace>;
  /** Space uids keyed by the Solr id items carry as `_root_`. */
  uidByRootId: Record<string, string>;
  /** Read a cached space by uid, if present. */
  getSpace: (uid: string) => CachedSpace | undefined;
  /** Read a cached space by the Solr id an item names it by, if present. */
  getSpaceByRootId: (rootId: string) => CachedSpace | undefined;
  /**
   * Merge a (possibly partial) space snapshot into the cache. Existing
   * meaningful values are kept when the incoming snapshot omits them.
   */
  upsertSpace: (entry: CachedSpace) => void;
  /** Remove a single cached space (e.g. after it was renamed or deleted). */
  clearSpace: (uid: string) => void;
  /** Clear the entire cache. */
  reset: () => void;
};

export const useSpaceCacheStore = create<SpaceCacheState>((set, get) => ({
  spaces: {},
  uidByRootId: {},
  getSpace: uid => {
    const key = String(uid || '').trim();
    return key ? get().spaces[key] : undefined;
  },
  getSpaceByRootId: rootId => {
    const key = String(rootId || '').trim();
    const uid = key ? get().uidByRootId[key] : undefined;
    return uid ? get().spaces[uid] : undefined;
  },
  upsertSpace: entry => {
    const uid = String(entry.uid || '').trim();
    if (!uid) {
      return;
    }
    const existing = get().spaces[uid];
    const merged: CachedSpace = { ...existing, uid };
    for (const field of MERGEABLE_KEYS) {
      const incoming = entry[field];
      if (hasMeaningfulValue(incoming)) {
        (merged as Record<string, unknown>)[field] = incoming;
      }
    }
    // Nothing new: skip the update, so every mounted SpaceDisplay does not
    // re-render for a snapshot it already has.
    if (
      existing &&
      MERGEABLE_KEYS.every(field => merged[field] === existing[field])
    ) {
      return;
    }
    merged.updatedAt = Date.now();
    const rootId = String(merged.rootId || '').trim();
    set(state => ({
      spaces: { ...state.spaces, [uid]: merged },
      uidByRootId:
        rootId && state.uidByRootId[rootId] !== uid
          ? { ...state.uidByRootId, [rootId]: uid }
          : state.uidByRootId,
    }));
  },
  clearSpace: uid => {
    const key = String(uid || '').trim();
    set(state => {
      const existing = state.spaces[key];
      if (!existing) {
        return state;
      }
      const spaces = { ...state.spaces };
      delete spaces[key];
      const uidByRootId = { ...state.uidByRootId };
      if (existing.rootId && uidByRootId[existing.rootId] === key) {
        delete uidByRootId[existing.rootId];
      }
      return { spaces, uidByRootId };
    });
  },
  reset: () => set({ spaces: {}, uidByRootId: {} }),
}));

export default useSpaceCacheStore;

// What one session resolved is not the next one's to paint.
registerSessionState({ forget: () => useSpaceCacheStore.getState().reset() });
