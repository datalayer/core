/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { Box } from '@datalayer/primer-addons';
import { OrganizationIcon, PeopleIcon } from '@primer/octicons-react';
import { UserAvatar } from '../avatars';

export type PrincipalAvatarKind = 'user' | 'team' | 'organization';

export type PrincipalAvatarProps = {
  kind: PrincipalAvatarKind;
  avatarUrl?: string;
  alt?: string;
  size?: number;
  square?: boolean;
};

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
  if (kind === 'user') {
    return (
      <UserAvatar
        avatarUrl={avatarUrl}
        size={size}
        square={square}
        iconSize={getFallbackIconSize(size)}
      />
    );
  }

  const iconSize = getFallbackIconSize(size);
  const borderRadius = square ? 2 : '50%';

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
