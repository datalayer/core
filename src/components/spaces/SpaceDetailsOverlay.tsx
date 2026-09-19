/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * A space's details: the card, and the overlay that opens it from a click on
 * the space's name.
 *
 * Built the way {@link PrincipalDetailsOverlay} is — the name is the anchor,
 * the card is shared — so a table's Owner and Space columns open the same kind
 * of thing and read the same way.
 *
 * @module components/spaces/SpaceDetailsOverlay
 */

import type { JSX } from 'react';
import {
  ActionMenu,
  Box,
  Button,
  Label,
  Text,
  ThemeProvider,
} from '@primer/react';
import { SpaceIcon } from '@primer/octicons-react';
import { useNavigate } from '../../hooks';
import { buildSpaceDetailsPath } from './spaceDisplayModel';

export type SpaceDetailsOverlayProps = {
  uid?: string;
  displayName: string;
  handle?: string;
  accountHandle?: string;
  description?: string;
  variant?: string;
  isPublic?: boolean;
  /**
   * Show a route some other way than through the router of this subtree.
   *
   * The same escape hatch as the principal card's: an editor embedded under a
   * `MemoryRouter` of its own hands the route to the view that has the
   * application's routes. Left out, the route is followed with `useNavigate`.
   */
  onNavigate?: (path: string) => void;
};

function normalize(value?: string): string {
  return (value || '').trim();
}

/**
 * The card of a space, on its own — its mark, identity, and the way to it.
 */
export function SpaceDetailsCard({
  uid,
  displayName,
  handle,
  accountHandle,
  description,
  variant,
  isPublic,
  onNavigate,
}: SpaceDetailsOverlayProps): JSX.Element {
  const navigate = useNavigate();
  const targetPath = buildSpaceDetailsPath({ accountHandle, handle });
  const go = (): void => {
    if (!targetPath) {
      return;
    }
    if (onNavigate) {
      onNavigate(targetPath);
    } else {
      navigate(targetPath);
    }
  };

  const normalizedHandle = normalize(handle);
  const normalizedAccount = normalize(accountHandle).replace(/^@+/, '');
  const normalizedUid = normalize(uid);
  const normalizedDisplayName =
    normalize(displayName) || normalizedHandle || normalizedUid || 'Space';
  // The address the space is reached at, as it reads in the location bar.
  const address =
    normalizedAccount && normalizedHandle
      ? `@${normalizedAccount}/${normalizedHandle}`
      : normalizedHandle;

  return (
    <Box sx={{ display: 'grid', gap: 3, p: 4, minWidth: 360 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box
          aria-hidden="true"
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 40,
            height: 40,
            flexShrink: 0,
            borderRadius: 2,
            bg: 'accent.subtle',
            color: 'accent.fg',
          }}
        >
          <SpaceIcon size={20} />
        </Box>
        <Box sx={{ display: 'grid', gap: 0.5, minWidth: 0 }}>
          <Text sx={{ fontWeight: 'semibold' }}>{normalizedDisplayName}</Text>
          {address ? (
            <Text sx={{ fontSize: 0, color: 'fg.muted' }}>{address}</Text>
          ) : null}
        </Box>
      </Box>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: '110px 1fr',
          gap: 1,
          alignItems: 'baseline',
        }}
      >
        <Text sx={{ fontSize: 0, color: 'fg.muted' }}>Kind</Text>
        <Text sx={{ fontSize: 1 }}>space</Text>
        {normalizedHandle ? (
          <>
            <Text sx={{ fontSize: 0, color: 'fg.muted' }}>Handle</Text>
            <Text sx={{ fontSize: 1 }}>{normalizedHandle}</Text>
          </>
        ) : null}
        {normalizedAccount ? (
          <>
            <Text sx={{ fontSize: 0, color: 'fg.muted' }}>Account</Text>
            <Text sx={{ fontSize: 1 }}>@{normalizedAccount}</Text>
          </>
        ) : null}
        {normalize(variant) ? (
          <>
            <Text sx={{ fontSize: 0, color: 'fg.muted' }}>Variant</Text>
            <Text sx={{ fontSize: 1 }}>{normalize(variant)}</Text>
          </>
        ) : null}
        {typeof isPublic === 'boolean' ? (
          <>
            <Text sx={{ fontSize: 0, color: 'fg.muted' }}>Visibility</Text>
            <Label
              size="small"
              variant={isPublic ? 'success' : 'secondary'}
              sx={{ justifySelf: 'start', width: 'fit-content' }}
            >
              {isPublic ? 'Public' : 'Private'}
            </Label>
          </>
        ) : null}
        <Text sx={{ fontSize: 0, color: 'fg.muted' }}>Description</Text>
        <Text sx={{ fontSize: 1 }}>{normalize(description) || 'N/A'}</Text>
        {normalizedUid ? (
          <>
            <Text sx={{ fontSize: 0, color: 'fg.muted' }}>UID</Text>
            <Text sx={{ fontSize: 1 }}>{normalizedUid}</Text>
          </>
        ) : null}
      </Box>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
        <Button size="small" onClick={go} disabled={!targetPath}>
          View Space
        </Button>
      </Box>
    </Box>
  );
}

/**
 * A space's details, shown from a click on its name.
 *
 * The name is the anchor; clicking it opens the shared {@link SpaceDetailsCard}.
 */
export function SpaceDetailsOverlay(
  props: SpaceDetailsOverlayProps,
): JSX.Element {
  const normalizedDisplayName =
    normalize(props.displayName) ||
    normalize(props.handle) ||
    normalize(props.uid) ||
    'Space';
  return (
    <ThemeProvider>
      <ActionMenu>
        <ActionMenu.Anchor>
          <Box
            as="button"
            type="button"
            title={normalizedDisplayName}
            sx={{
              fontWeight: 'semibold',
              color: 'accent.fg',
              textDecoration: 'underline',
              background: 'transparent',
              border: 0,
              padding: 0,
              margin: 0,
              cursor: 'pointer',
              maxWidth: '100%',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              textAlign: 'left',
              ':hover': {
                textDecoration: 'underline',
              },
            }}
          >
            {normalizedDisplayName}
          </Box>
        </ActionMenu.Anchor>
        <ActionMenu.Overlay width="large">
          <SpaceDetailsCard {...props} />
        </ActionMenu.Overlay>
      </ActionMenu>
    </ThemeProvider>
  );
}

export default SpaceDetailsOverlay;
