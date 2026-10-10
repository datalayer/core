/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * UserAvatar – Single source of truth for rendering a user's avatar.
 *
 * Drawn by primer-addons' `EntityAvatar`, so its ground, shape and ring are
 * the theme's — a person's emoji, chosen icon or photograph, or a themed,
 * colormoded {@link AlienIcon} placeholder, so every consumer (profile,
 * sidebar, principal overlay, …) shares the same look, in every theme.
 */
import type { JSX } from 'react';
import { AlienIcon } from '@datalayer/icons-react';
import { EntityAvatar, useColorPalette } from '@datalayer/primer-addons';
import { getAvatarURL } from '../../utils';
import { getPrincipalAvatarIcon } from '../principal/PrincipalAppearance';
import { FluentEmoji } from '../emoji/FluentEmoji';

/**
 * Returns `true` when the given URL points to a real user avatar (i.e. not a
 * Gravatar default placeholder).
 */
export function hasRealAvatar(url?: string): boolean {
  if (!url) {
    return false;
  }
  if (url.startsWith('https://www.gravatar.com/avatar')) {
    return false;
  }
  return true;
}

export type UserAvatarProps = {
  avatarUrl?: string;
  avatarIcon?: string;
  /**
   * A literal emoji, checked before `avatarIcon`/`avatarUrl` — an agent's
   * face is its emoji, not a photograph or a chosen icon standing in for
   * one. Drawn in Fluent Emoji, the same on every platform (LOOP T-20); the
   * system's, as text, only for one Datalayer ships no drawing of.
   */
  avatarEmoji?: string;
  /** Avatar edge length in pixels. Defaults to 100. */
  size?: number;
  /** Render with rounded square corners instead of a circle. Defaults to true. */
  square?: boolean;
  /** Fallback icon size. Defaults to ~48% of `size`. */
  iconSize?: number;
  /** Optional background color override for the default (non-photo) avatar. */
  fallbackBackground?: string;
  /** Optional icon foreground color override for the default avatar. */
  fallbackForeground?: string;
  /**
   * Whether a ring is drawn around the avatar.
   *
   * Off by default: an avatar sits on its own in most places, and a ring
   * there is one more line for nothing. On, it gives the avatar an edge of
   * its own against a background of the same colour — a profile page, a card.
   */
  ring?: boolean;
  className?: string;
};

export const UserAvatar = ({
  avatarUrl,
  avatarIcon,
  avatarEmoji,
  size = 100,
  square = true,
  iconSize,
  fallbackBackground,
  fallbackForeground,
  ring = false,
  className,
}: UserAvatarProps): JSX.Element => {
  const palette = useColorPalette();
  // A rounded square takes the theme's corner, a circle is a circle; the
  // ring is drawn just outside the edge, so the avatar keeps its size.
  const shape = square ? 'rounded' : 'circle';
  if (avatarEmoji) {
    return (
      <EntityAvatar
        alt={avatarEmoji}
        className={className}
        size={size}
        shape={shape}
        ring={ring}
        bg={fallbackBackground || 'canvas.default'}
      >
        {/* Named by the disc it sits on, so the drawing is decoration. */}
        <FluentEmoji
          emoji={avatarEmoji}
          size={iconSize ?? Math.round(size * 0.6)}
          label=""
        />
      </EntityAvatar>
    );
  }
  /*
   * A chosen icon and the default one are the same drawing in two shapes:
   * the plain icon, coloured by the theme, on the accent's wash.
   */
  const iconGround = {
    ...(fallbackBackground ? { bg: fallbackBackground } : undefined),
    style: {
      '--datalayer-icon-fg': fallbackForeground || palette.primary,
    } as Record<string, string>,
  };
  const SelectedIcon = getPrincipalAvatarIcon(avatarIcon);
  if (SelectedIcon) {
    return (
      <EntityAvatar
        className={className}
        size={size}
        shape={shape}
        ring={ring}
        {...iconGround}
      >
        <SelectedIcon
          size={iconSize ?? Math.round(size * 0.62)}
          themed
          colormode
        />
      </EntityAvatar>
    );
  }
  if (hasRealAvatar(avatarUrl)) {
    return (
      <EntityAvatar
        className={className}
        src={getAvatarURL(avatarUrl)}
        size={size}
        shape={shape}
        ring={ring}
      />
    );
  }
  return (
    <EntityAvatar
      className={className}
      size={size}
      shape={shape}
      ring={ring}
      {...iconGround}
    >
      <AlienIcon size={iconSize ?? Math.round(size * 0.48)} themed colormode />
    </EntityAvatar>
  );
};

export default UserAvatar;
