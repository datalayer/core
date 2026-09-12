/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * What a space display needs to know, said without rendering anything.
 *
 * Apart from the components so the rules — how a row names its space, how a
 * space is found among the ones already loaded, where its page is — can be
 * tested without a DOM, a router or a query client.
 *
 * @module components/spaces/spaceDisplayModel
 */

import type { CachedSpace } from '../../hooks/useSpaceCacheStore';

/**
 * How a row names the space it belongs to — whatever it happens to know.
 *
 * Tables reach their rows by different roads, and each road knows something
 * different: a table scoped to one space knows that space's uid; a row from
 * the cross-space listing knows only its item, which carries its space's Solr
 * id as `_root_`; a dataset knows its `spaceUid`. Any one of them is enough.
 */
export type SpaceDescriptor = {
  /** The space uid. */
  uid?: string | null;
  /** The space's Solr id, which an item carries as `_root_`. */
  rootId?: string | null;
  /** The uid of an item in the space, found among the loaded spaces' children. */
  itemUid?: string | null;
  /**
   * The space handle. Handles repeat across accounts — everybody has a
   * `library` — so it is matched together with `accountHandle`, and only
   * when no uid was given.
   */
  handle?: string | null;
  /** The account the space is addressed under. */
  accountHandle?: string | null;
  /** A name the row already has, shown until the space is resolved. */
  displayName?: string | null;
};

/** Loaded spaces, looked up every way a row can name one. */
export type SpaceIndex = {
  byUid: ReadonlyMap<string, unknown>;
  byRootId: ReadonlyMap<string, unknown>;
  byItemUid: ReadonlyMap<string, unknown>;
  byAccountAndHandle: ReadonlyMap<string, unknown>;
};

/** A space as a display shows it: the cached fields, a name, and its page. */
export type ResolvedSpace = Omit<CachedSpace, 'uid' | 'updatedAt'> & {
  uid?: string;
  /** The space's name, or a placeholder derived from its handle or uid. */
  displayName: string;
  /** Where the space's page is, when both handles are known. */
  path: string | null;
  /** Whether the name is the space's own rather than a placeholder. */
  resolved: boolean;
};

const DEFAULT_PLACEHOLDER_MAX_LENGTH = 12;

const text = (value: unknown): string =>
  typeof value === 'string'
    ? value.trim()
    : value === null || value === undefined
      ? ''
      : String(value).trim();

const bareHandle = (value: unknown): string => text(value).replace(/^@+/, '');

const firstText = (...values: unknown[]): string => {
  for (const value of values) {
    const candidate = text(value);
    if (candidate) {
      return candidate;
    }
  }
  return '';
};

const truncate = (value: string, maxLength: number): string =>
  maxLength > 0 && value.length > maxLength
    ? `${value.slice(0, maxLength)}…`
    : value;

/** The uid of a space as the spacer API returns it, raw or converted. */
export const spaceUidOf = (space: any): string =>
  firstText(space?.uid, space?.uid_s, space?.id);

/**
 * The account a space is addressed under: its organization, else its owner.
 *
 * The same order the web application's `resolveSpaceAccountHandle` reads, so
 * a link built here and a link built there go to the same page.
 */
export const spaceAccountHandleOf = (space: any): string =>
  bareHandle(
    firstText(
      space?.accountHandle,
      space?.organization?.handle,
      space?.organization?.handle_s,
      space?.organization_handle,
      space?.organization_handle_s,
      space?.account_handle,
      space?.account_handle_s,
      space?.owner?.handle,
      space?.owner?.handle_s,
      space?.owner_handle,
      space?.owner_handle_s,
    ),
  );

/** A space as the cache keeps it, out of a spacer payload, raw or converted. */
export const toCachedSpace = (space: unknown): CachedSpace | undefined => {
  const raw = space as any;
  const uid = spaceUidOf(raw);
  if (!uid) {
    return undefined;
  }
  const isPublic = raw?.public_b ?? raw?.public;
  return {
    uid,
    rootId: text(raw?.id) || undefined,
    handle: firstText(raw?.handle_s, raw?.handle) || undefined,
    displayName: firstText(raw?.name_t, raw?.name) || undefined,
    description: firstText(raw?.description_t, raw?.description) || undefined,
    variant: firstText(raw?.variant_s, raw?.variant) || undefined,
    isPublic: typeof isPublic === 'boolean' ? isPublic : undefined,
    accountHandle: spaceAccountHandleOf(raw) || undefined,
  };
};

const EMPTY_SPACES: readonly unknown[] = Object.freeze([]);
const INDEXES = new WeakMap<readonly unknown[], SpaceIndex>();

/**
 * Index loaded spaces by uid, Solr id, the uids of their items, and
 * account/handle.
 *
 * Memoised on the array: a query answers with the same array until it
 * refetches, so a table of a hundred rows builds the index once, not a hundred
 * times.
 */
export const indexSpaces = (
  spaces: readonly unknown[] | null | undefined,
): SpaceIndex => {
  const list = Array.isArray(spaces) ? spaces : EMPTY_SPACES;
  const known = INDEXES.get(list);
  if (known) {
    return known;
  }
  const byUid = new Map<string, unknown>();
  const byRootId = new Map<string, unknown>();
  const byItemUid = new Map<string, unknown>();
  const byAccountAndHandle = new Map<string, unknown>();
  for (const space of list) {
    const raw = space as any;
    const uid = spaceUidOf(raw);
    if (!uid) {
      continue;
    }
    byUid.set(uid, space);
    const rootId = text(raw?.id);
    if (rootId) {
      byRootId.set(rootId, space);
    }
    const handle = firstText(raw?.handle_s, raw?.handle);
    const account = spaceAccountHandleOf(raw);
    if (handle && account) {
      byAccountAndHandle.set(`${account}/${handle}`, space);
    }
    // The spaces listing carries each space's items as children, which is the
    // only place a row from the cross-space listing can learn its space from
    // when it did not keep `_root_`.
    if (Array.isArray(raw?.items)) {
      for (const item of raw.items) {
        const itemUid = text(item?.uid);
        if (itemUid) {
          byItemUid.set(itemUid, space);
        }
      }
    }
  }
  const index: SpaceIndex = {
    byUid,
    byRootId,
    byItemUid,
    byAccountAndHandle,
  };
  INDEXES.set(list, index);
  return index;
};

/** The loaded space a descriptor names, if any. */
export const findSpace = (
  index: SpaceIndex,
  descriptor: SpaceDescriptor,
): unknown | undefined => {
  const uid = text(descriptor.uid);
  if (uid && index.byUid.has(uid)) {
    return index.byUid.get(uid);
  }
  const rootId = text(descriptor.rootId);
  if (rootId && index.byRootId.has(rootId)) {
    return index.byRootId.get(rootId);
  }
  const itemUid = text(descriptor.itemUid);
  if (itemUid && index.byItemUid.has(itemUid)) {
    return index.byItemUid.get(itemUid);
  }
  // A uid is authoritative: when one was given and is not loaded, a space
  // that merely shares its handle is not the same space.
  const handle = text(descriptor.handle);
  const account = bareHandle(descriptor.accountHandle);
  if (!uid && handle && account) {
    return index.byAccountAndHandle.get(`${account}/${handle}`);
  }
  return undefined;
};

/** Where a space's page is: `/<account>/<space>`, or nothing without both. */
export const buildSpaceDetailsPath = ({
  accountHandle,
  handle,
}: {
  accountHandle?: string | null;
  handle?: string | null;
}): string | null => {
  const account = bareHandle(accountHandle);
  const space = text(handle);
  if (!account || !space) {
    return null;
  }
  return `/${encodeURIComponent(account)}/${encodeURIComponent(space)}`;
};

/**
 * What a display shows for a descriptor, given what is known of its space.
 *
 * The space's own fields win over the snapshot remembered from an earlier
 * view, which win over what the row said; the row's name is shown only until
 * the space's own is known, and a handle or uid stands in before either.
 */
export const resolveSpace = ({
  descriptor,
  found,
  cached,
  placeholderMaxLength = DEFAULT_PLACEHOLDER_MAX_LENGTH,
}: {
  descriptor: SpaceDescriptor;
  found?: CachedSpace;
  cached?: CachedSpace;
  placeholderMaxLength?: number;
}): ResolvedSpace => {
  const uid = firstText(descriptor.uid, found?.uid, cached?.uid) || undefined;
  const handle =
    firstText(found?.handle, cached?.handle, descriptor.handle) || undefined;
  const accountHandle =
    bareHandle(
      firstText(
        found?.accountHandle,
        cached?.accountHandle,
        descriptor.accountHandle,
      ),
    ) || undefined;
  const ownName = firstText(found?.displayName, cached?.displayName);
  const displayName =
    ownName ||
    text(descriptor.displayName) ||
    truncate(firstText(handle, uid), placeholderMaxLength) ||
    'Space';
  const isPublic =
    typeof found?.isPublic === 'boolean' ? found.isPublic : cached?.isPublic;
  return {
    uid,
    rootId:
      firstText(found?.rootId, cached?.rootId, descriptor.rootId) || undefined,
    handle,
    accountHandle,
    displayName,
    description:
      firstText(found?.description, cached?.description) || undefined,
    variant: firstText(found?.variant, cached?.variant) || undefined,
    isPublic,
    path: buildSpaceDetailsPath({ accountHandle, handle }),
    resolved: Boolean(ownName),
  };
};
