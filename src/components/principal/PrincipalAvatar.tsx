/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { Box } from '@datalayer/primer-addons';
import { OrganizationIcon, PeopleIcon } from '@primer/octicons-react';
import { UserAvatar } from '../avatars';
import { getPrincipalAvatarIcon, type PrincipalType } from './PrincipalAppearance';

export type PrincipalAvatarKind = PrincipalType;

export type PrincipalAvatarProps = {
  kind: PrincipalAvatarKind;
  avatarUrl?: string;
  avatarIcon?: string;
  alt?: string;
  size?: number;
  square?: boolean;
  /**
   * Whether a ring is drawn around the avatar.
   *
   * Off by default, and the same option `UserAvatar` carries — a public
   * profile wants the edge, a menu entry does not.
   */
  ring?: boolean;
  className?: string;
};

function getFallbackIconSize(size: number): number {
  return Math.max(12, Math.round(size * 0.62));
}

export function PrincipalAvatar({
  kind,
  avatarUrl,
  avatarIcon,
  alt,
  size = 20,
  square = false,
  ring = false,
  className,
}: PrincipalAvatarProps): JSX.Element {
  const SelectedIcon = getPrincipalAvatarIcon(avatarIcon);
  // Outside the edge rather than a border, so the avatar keeps the size it
  // was asked for — see `UserAvatar`, which draws its ring the same way.
  const ringSx = ring
    ? { boxShadow: '0 0 0 1px var(--borderColor-default, currentColor)' }
    : undefined;
  /*
   * A person is drawn by `UserAvatar`, whatever they wear.
   *
   * It is the single source of truth for a user's avatar — a photograph, a
   * chosen icon, or the default one — and it sets a chosen icon on the tinted
   * disc that makes it read as an avatar rather than as a loose glyph.
   * Answering the icon here first drew that same icon WITHOUT the disc, so a
   * person who had chosen one was a bare drawing among circles.
   */
  if (kind === 'personal') {
    return (
      <UserAvatar
        avatarUrl={avatarUrl}
        avatarIcon={avatarIcon}
        size={size}
        square={square}
        iconSize={getFallbackIconSize(size)}
        ring={ring}
        className={className}
      />
    );
  }

  if (SelectedIcon) {
    return (
      <Box
        className={className}
        sx={{
          width: size,
          height: size,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          borderRadius: square ? 2 : '50%',
          // The disc of `UserAvatar`, for the same reason: the shape is what
          // says "avatar", and an icon drawn on nothing shows none of it.
          bg: 'accent.subtle',
          ...ringSx,
        }}
        aria-label={alt || `${kind} avatar`}
      >
        {/* The plain icon, coloured by the theme — see UserAvatar. */}
        <SelectedIcon size={getFallbackIconSize(size)} themed colormode />
      </Box>
    );
  }

  const iconSize = getFallbackIconSize(size);
  const borderRadius = square ? 2 : '50%';

  const Icon = kind === 'team' ? PeopleIcon : OrganizationIcon;

  return (
    <Box
      className={className}
      sx={{
        width: size,
        height: size,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        bg: 'canvas.subtle',
        borderRadius,
        border: '1px solid',
        borderColor: 'border.default',
        ...ringSx,
      }}
      aria-label={alt || (kind === 'team' ? 'Team' : 'Organization')}
    >
      <Icon size={iconSize} />
    </Box>
  );
}

export default PrincipalAvatar;
