/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * UserAvatar – Single source of truth for rendering a user's avatar.
 *
 * When a real (non-Gravatar) avatar URL is available it renders a
 * {@link DLAvatar}. Otherwise it falls back to a themed, colormoded
 * {@link AlienIcon} placeholder so every consumer (profile, sidebar,
 * principal overlay, …) shares the same default look.
 */
import { AlienIcon } from '@datalayer/icons-react';
import { Box, useColorPalette } from '@datalayer/primer-addons';
import { DLAvatar } from './DLAvatar';
import { getPrincipalAvatarIcon } from '../principal/PrincipalAppearance';

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
  className?: string;
};

export const UserAvatar = ({
  avatarUrl,
  avatarIcon,
  size = 100,
  square = true,
  iconSize,
  fallbackBackground,
  fallbackForeground,
  className,
}: UserAvatarProps): JSX.Element => {
  const palette = useColorPalette();
  const SelectedIcon = getPrincipalAvatarIcon(avatarIcon);
  if (SelectedIcon) {
    return (
      <Box
        className={className}
        sx={{
          width: size,
          height: size,
          borderRadius: square ? 2 : '50%',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bg: fallbackBackground || 'accent.subtle',
          '--datalayer-icon-fg': fallbackForeground || palette.primary,
        }}
      >
        {/*
          The plain icon, coloured by the theme — the same treatment as the
          default avatar below, so a chosen avatar and the default one are
          the same drawing in two shapes rather than two different looks.
        */}
        <SelectedIcon
          size={iconSize ?? Math.round(size * 0.62)}
          themed
          colormode
        />
      </Box>
    );
  }
  if (hasRealAvatar(avatarUrl)) {
    return <DLAvatar className={className} square={square} src={avatarUrl} size={size} />;
  }
  const resolvedIconSize = iconSize ?? Math.round(size * 0.48);
  return (
    <Box
      className={className}
      sx={{
        width: size,
        height: size,
        borderRadius: square ? 2 : '50%',
        bg: fallbackBackground || 'accent.subtle',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        '--datalayer-icon-fg': fallbackForeground || palette.primary,
      }}
    >
      <AlienIcon size={resolvedIconSize} themed colormode />
    </Box>
  );
};

export default UserAvatar;
