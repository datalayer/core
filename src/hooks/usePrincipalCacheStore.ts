/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { create } from 'zustand';

export type PrincipalCacheKind = 'personal' | 'team' | 'organization';

/**
 * A resolved principal snapshot kept in memory so repeated renders (across
 * views) can paint instantly instead of waiting for a network round trip.
 *
 * Only meaningful fields are stored; partial snapshots are merged over time so
 * the cache accumulates as much information as possible for a given principal.
 */
export type CachedPrincipal = {
  kind: PrincipalCacheKind;
  uid: string;
  displayName?: string;
  name?: string;
  description?: string;
  handle?: string;
  accountHandle?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  origin?: string;
  avatarUrl?: string;
  avatarIcon?: string;
  banner?: string;
  /** Team-specific: parent organization handle. */
  organizationHandle?: string;
  /** Team-specific: parent organization display name. */
  organizationName?: string;
  /** Team-specific: number of members. */
  memberCount?: number;
  /** Whether the principal (team/org) is public. */
  isPublic?: boolean;
  /** Timestamp (ms) of the last time this entry was updated. */
  updatedAt?: number;
};

/** Build the cache key for a principal. */
export function principalCacheKey(
  kind: PrincipalCacheKind,
  uid: string,
): string {
  return `${kind}:${String(uid || '').trim()}`;
}

const MERGEABLE_KEYS: Array<keyof CachedPrincipal> = [
  'displayName',
  'name',
  'description',
  'handle',
  'accountHandle',
  'firstName',
  'lastName',
  'email',
  'origin',
  'avatarUrl',
  'avatarIcon',
  'banner',
  'organizationHandle',
  'organizationName',
  'memberCount',
  'isPublic',
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

type PrincipalCacheState = {
  /** Cached principals keyed by `${kind}:${uid}`. */
  principals: Record<string, CachedPrincipal>;
  /**
   * Read a cached principal snapshot, if present.
   */
  getPrincipal: (
    kind: PrincipalCacheKind,
    uid: string,
  ) => CachedPrincipal | undefined;
  /**
   * Merge a (possibly partial) principal snapshot into the cache. Existing
   * meaningful values are preserved when the incoming snapshot omits them, so
   * information accumulates rather than being overwritten with blanks.
   */
  upsertPrincipal: (entry: CachedPrincipal) => void;
  /** Remove a single cached principal (e.g. to force a fresh resolution). */
  clearPrincipal: (kind: PrincipalCacheKind, uid: string) => void;
  /** Clear the entire cache. */
  reset: () => void;
};

export const usePrincipalCacheStore = create<PrincipalCacheState>(
  (set, get) => ({
    principals: {},
    getPrincipal: (kind, uid) => {
      const normalizedUid = String(uid || '').trim();
      if (!normalizedUid) {
        return undefined;
      }
      return get().principals[principalCacheKey(kind, normalizedUid)];
    },
    upsertPrincipal: entry => {
      const normalizedUid = String(entry.uid || '').trim();
      if (!normalizedUid) {
        return;
      }
      const key = principalCacheKey(entry.kind, normalizedUid);
      const existing = get().principals[key];

      const merged: CachedPrincipal = {
        ...existing,
        kind: entry.kind,
        uid: normalizedUid,
      };
      for (const field of MERGEABLE_KEYS) {
        const incoming = entry[field];
        if (hasMeaningfulValue(incoming)) {
          (merged as Record<string, unknown>)[field] = incoming;
        }
      }
      merged.updatedAt = Date.now();

      // Skip the state update when no meaningful field changed to avoid
      // needless re-renders of every mounted Principal.
      if (existing) {
        let changed = false;
        for (const field of MERGEABLE_KEYS) {
          if (merged[field] !== existing[field]) {
            changed = true;
            break;
          }
        }
        if (!changed) {
          return;
        }
      }

      set(state => ({
        principals: { ...state.principals, [key]: merged },
      }));
    },
    clearPrincipal: (kind, uid) => {
      const key = principalCacheKey(kind, String(uid || '').trim());
      set(state => {
        if (!state.principals[key]) {
          return state;
        }
        const next = { ...state.principals };
        delete next[key];
        return { principals: next };
      });
    },
    reset: () => set({ principals: {} }),
  }),
);

export default usePrincipalCacheStore;
