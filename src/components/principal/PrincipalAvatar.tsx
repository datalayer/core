/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { Box, useColorPalette } from '@datalayer/primer-addons';
import { OrganizationIcon, PeopleIcon } from '@primer/octicons-react';
import { AlienIcon } from '@datalayer/icons-react';
import { DLAvatar } from '../avatars';

export type PrincipalAvatarKind = 'user' | 'team' | 'organization';

export type PrincipalAvatarProps = {
  kind: PrincipalAvatarKind;
  avatarUrl?: string;
  alt?: string;
  size?: number;
  square?: boolean;
};

function hasRealAvatar(url?: string): boolean {
  if (!url) {
    return false;
  }
  if (url.startsWith('https://www.gravatar.com/avatar')) {
    return false;
  }
  return true;
}

function getFallbackIconSize(size: number): number {
  return Math.max(12, Math.round(size * 0.62));
}

export function PrincipalAvatar({
  kind,
  avatarUrl,
  alt,
  size = 20,
  square = false,
}: PrincipalAvatarProps): JSX.Element {
  const palette = useColorPalette();
  if (kind === 'user' && hasRealAvatar(avatarUrl)) {
    return (
      <DLAvatar
        src={avatarUrl}
        alt={alt || 'User'}
        size={size}
        square={square}
      />
    );
  }

  const iconSize = getFallbackIconSize(size);
  const borderRadius = square ? 2 : '50%';

  if (kind === 'user') {
    return (
      <Box
        sx={{
          width: size,
          height: size,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          bg: 'accent.subtle',
          borderRadius,
          overflow: 'hidden',
          '--datalayer-icon-fg': palette.primary,
        }}
        aria-label={alt || 'User'}
      >
        <AlienIcon size={iconSize} />
      </Box>
    );
  }

  const Icon = kind === 'team' ? PeopleIcon : OrganizationIcon;

  return (
    <Box
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
      }}
      aria-label={alt || (kind === 'team' ? 'Team' : 'Organization')}
    >
      <Icon size={iconSize} />
    </Box>
  );
}

export default PrincipalAvatar;
