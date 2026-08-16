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
  className,
}: PrincipalAvatarProps): JSX.Element {
  const SelectedIcon = getPrincipalAvatarIcon(avatarIcon);
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
        }}
        aria-label={alt || `${kind} avatar`}
      >
        <SelectedIcon size={size} colored />
      </Box>
    );
  }

  if (kind === 'personal') {
    return (
      <UserAvatar
        avatarUrl={avatarUrl}
        avatarIcon={avatarIcon}
        size={size}
        square={square}
        iconSize={getFallbackIconSize(size)}
        className={className}
      />
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
      }}
      aria-label={alt || (kind === 'team' ? 'Team' : 'Organization')}
    >
      <Icon size={iconSize} />
    </Box>
  );
}

export default PrincipalAvatar;
