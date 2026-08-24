/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * A principal's details, shown from a hover on their avatar.
 *
 * The same {@link PrincipalDetailsCard} the click overlay uses, anchored on
 * an avatar and opened by pointing at it — for the faces of a shared
 * document, where there is no name to click, only a stack of avatars.
 *
 * The card stays open while the pointer is on the avatar OR on the card, so
 * the "View Profile" button inside it can be reached: leaving the avatar
 * starts a short countdown that entering the card cancels.
 *
 * The anchor forwards the class an `AvatarStack` clones onto its children
 * (`pc-AvatarItem`, which sizes and overlaps the faces) so a hover card can
 * wrap a face without breaking the stack.
 *
 * @module components/principal/PrincipalHoverCard
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { AnchoredOverlay, Box, ThemeProvider } from '@primer/react';
import {
  PrincipalDetailsCard,
  type PrincipalDetailsOverlayProps,
} from './PrincipalDetailsOverlay';

export type PrincipalHoverCardProps = PrincipalDetailsOverlayProps & {
  /** The avatar the card hangs off — the anchor. */
  children: ReactNode;
  /**
   * Cloned in by `AvatarStack` onto each child; forwarded to the anchor so
   * the face keeps its size, overlap and mask inside the stack.
   */
  className?: string;
};

/** How long the card lingers after the pointer leaves, to let it be entered. */
const HIDE_DELAY_MS = 200;

export function PrincipalHoverCard({
  children,
  className,
  ...principal
}: PrincipalHoverCardProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const hideTimeout = useRef<number | undefined>();

  const cancelHide = useCallback(() => {
    if (hideTimeout.current !== undefined) {
      window.clearTimeout(hideTimeout.current);
      hideTimeout.current = undefined;
    }
  }, []);

  const show = useCallback(() => {
    cancelHide();
    setOpen(true);
  }, [cancelHide]);

  const hide = useCallback(() => {
    cancelHide();
    hideTimeout.current = window.setTimeout(() => {
      setOpen(false);
      hideTimeout.current = undefined;
    }, HIDE_DELAY_MS);
  }, [cancelHide]);

  useEffect(() => cancelHide, [cancelHide]);

  return (
    <AnchoredOverlay
      open={open}
      onOpen={show}
      onClose={() => setOpen(false)}
      side="outside-bottom"
      align="center"
      displayCloseButton={false}
      focusTrapSettings={{ disabled: true }}
      focusZoneSettings={{ disabled: true }}
      overlayProps={{
        role: 'dialog',
        onMouseEnter: show,
        onMouseLeave: hide,
        preventFocusOnOpen: true,
      }}
      renderAnchor={anchorProps => (
        <Box
          {...anchorProps}
          className={[className, anchorProps.className]
            .filter(Boolean)
            .join(' ')}
          onMouseEnter={show}
          onMouseLeave={hide}
          onFocus={show}
          onBlur={hide}
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          {children}
        </Box>
      )}
    >
      <ThemeProvider>
        <PrincipalDetailsCard {...principal} />
      </ThemeProvider>
    </AnchoredOverlay>
  );
}

export default PrincipalHoverCard;
