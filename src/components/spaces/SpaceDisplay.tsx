/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * SpaceDisplay – common display for the space a thing lives in: the space's
 * name, clickable, opening a {@link SpaceDetailsOverlay} whose button goes to
 * the space's page.
 *
 * The companion of {@link Principal}, for a table's Space column, and built
 * for a table's arithmetic: a hundred rows in three spaces cost no request per
 * row. A space is found, in order:
 *
 * 1. among the spaces the account has already loaded (`useUserSpaces`, the
 *    query the item tables already run, children included — which is how a
 *    row that knows only its item still finds its space);
 * 2. in the in-memory {@link useSpaceCacheStore}, which paints a space that
 *    any earlier view resolved;
 * 3. over the network by uid (`useSpace`) — only once the loaded list has
 *    answered without it, and every row naming that uid shares the request.
 *
 * @module components/spaces/SpaceDisplay
 */

import * as React from 'react';
import { Text } from '@primer/react';
import { SpaceIcon } from '@primer/octicons-react';
import { Box } from '@datalayer/primer-addons';
import { useCache } from '../../hooks';
import { useSpaceCacheStore } from '../../hooks/useSpaceCacheStore';
import { useIAMStore } from '../../state';
import { SpaceDetailsOverlay } from './SpaceDetailsOverlay';
import {
  findSpace,
  indexSpaces,
  resolveSpace,
  toCachedSpace,
  type SpaceDescriptor,
} from './spaceDisplayModel';

export type SpaceDisplayProps = {
  /** Whatever the row knows of its space; see {@link SpaceDescriptor}. */
  space: SpaceDescriptor;
  /** Whether the space mark precedes the name. */
  showIcon?: boolean;
  iconSize?: number;
  gap?: number;
  /** Maximum length of the handle or uid shown before the name resolves. */
  placeholderMaxLength?: number;
  /** What is shown when the row names no space at all. */
  emptyText?: string;
  /** See {@link SpaceDetailsOverlayProps.onNavigate}. */
  onNavigate?: (path: string) => void;
  sx?: any;
};

export const SpaceDisplay: React.FC<SpaceDisplayProps> = ({
  space,
  showIcon = true,
  iconSize = 16,
  gap = 1,
  placeholderMaxLength,
  emptyText = '—',
  onNavigate,
  sx,
}) => {
  const { uid, rootId, itemUid, handle, accountHandle, displayName } = space;
  const { useUserSpaces, useSpace } = useCache();
  const { user } = useIAMStore();

  // 1. The spaces already loaded, indexed once per answer of the query.
  const spacesQuery = useUserSpaces();
  const index = React.useMemo(
    () => indexSpaces(spacesQuery.data as unknown[] | undefined),
    [spacesQuery.data],
  );
  const listed = React.useMemo(
    () =>
      toCachedSpace(
        findSpace(index, { uid, rootId, itemUid, handle, accountHandle }),
      ),
    [index, uid, rootId, itemUid, handle, accountHandle],
  );

  // 2. A snapshot some earlier view resolved.
  const givenUid = String(uid || '').trim();
  const givenRootId = String(rootId || '').trim();
  const cached = useSpaceCacheStore(state => {
    const key =
      givenUid ||
      listed?.uid ||
      (givenRootId ? state.uidByRootId[givenRootId] : '');
    return key ? state.spaces[key] : undefined;
  });
  const upsertSpace = useSpaceCacheStore(state => state.upsertSpace);

  // 3. The network, last, and not while the list that may know it is loading.
  const fetchUid =
    user &&
    givenUid &&
    !spacesQuery.isLoading &&
    !listed &&
    !cached?.displayName
      ? givenUid
      : '';
  const fetchedQuery = useSpace(fetchUid);
  const fetched = React.useMemo(
    () => toCachedSpace(fetchedQuery.data),
    [fetchedQuery.data],
  );

  const found = listed ?? fetched;
  const resolved = resolveSpace({
    descriptor: space,
    found,
    cached,
    placeholderMaxLength,
  });

  // Remember what was actually resolved — never a placeholder — so the next
  // view paints it at once.
  React.useEffect(() => {
    if (found?.uid) {
      upsertSpace(found);
    }
  }, [found, upsertSpace]);

  const canName = Boolean(
    resolved.uid || resolved.handle || String(displayName || '').trim(),
  );
  if (!canName) {
    const waiting =
      Boolean(user) &&
      spacesQuery.isLoading &&
      Boolean(givenRootId || String(itemUid || '').trim());
    return (
      <Text sx={{ color: 'fg.muted', ...sx }}>{waiting ? '…' : emptyText}</Text>
    );
  }

  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap,
        minWidth: 0,
        maxWidth: '100%',
        ...sx,
      }}
    >
      {showIcon ? (
        <Box
          as="span"
          aria-hidden="true"
          sx={{ display: 'inline-flex', color: 'fg.muted', flexShrink: 0 }}
        >
          <SpaceIcon size={iconSize} />
        </Box>
      ) : null}
      <SpaceDetailsOverlay
        uid={resolved.uid}
        displayName={resolved.displayName}
        handle={resolved.handle}
        accountHandle={resolved.accountHandle}
        description={resolved.description}
        variant={resolved.variant}
        isPublic={resolved.isPublic}
        onNavigate={onNavigate}
      />
    </Box>
  );
};

export default SpaceDisplay;
