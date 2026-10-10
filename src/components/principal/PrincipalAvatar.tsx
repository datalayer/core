/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import type { JSX } from 'react';
import { EntityAvatar } from '@datalayer/primer-addons';
import { OrganizationIcon, PeopleIcon } from '@primer/octicons-react';
import { UserAvatar } from '../avatars';
import {
  getPrincipalAvatarIcon,
  type PrincipalType,
} from './PrincipalAppearance';

export type PrincipalAvatarKind = PrincipalType;

export type PrincipalAvatarProps = {
  kind: PrincipalAvatarKind;
  avatarUrl?: string;
  avatarIcon?: string;
  /**
   * A literal emoji this platform draws for a face of its own — an agent —
   * rather than a person's chosen picture or icon. Checked before
   * `avatarUrl`/`avatarIcon`, and only for `kind: 'personal'`: an agent is a
   * personal-shaped seat in every roster it appears in today.
   */
  avatarEmoji?: string;
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
  avatarEmoji,
  alt,
  size = 20,
  square = false,
  ring = false,
  className,
}: PrincipalAvatarProps): JSX.Element {
  const SelectedIcon = getPrincipalAvatarIcon(avatarIcon);
  const shape = square ? 'rounded' : 'circle';
  /*
   * A person is drawn by `UserAvatar`, whatever they wear.
   *
   * It is the single source of truth for a user's avatar — a photograph, a
   * chosen icon, or the default one — and it sets a chosen icon on the tinted
   * disc that makes it read as an avatar rather than as a loose glyph.
   * Answering the icon here first drew that same icon WITHOUT the disc, so a
   * person who had chosen one was a bare drawing among circles.
   */
  // A service principal — an application's — is drawn as a person is: its
  // chosen avatar, or its emoji, on the same disc (LOOP I-07).
  if (kind === 'personal' || kind === 'service') {
    return (
      <UserAvatar
        avatarUrl={avatarUrl}
        avatarIcon={avatarIcon}
        avatarEmoji={avatarEmoji}
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
      // The disc of `UserAvatar`, for the same reason: the shape is what says
      // "avatar", and an icon drawn on nothing shows none of it.
      <EntityAvatar
        className={className}
        size={size}
        shape={shape}
        ring={ring}
        alt={alt || `${kind} avatar`}
      >
        {/* The plain icon, coloured by the theme — see UserAvatar. */}
        <SelectedIcon size={getFallbackIconSize(size)} themed colormode />
      </EntityAvatar>
    );
  }

  const Icon = kind === 'team' ? PeopleIcon : OrganizationIcon;

  return (
    <EntityAvatar
      className={className}
      size={size}
      shape={shape}
      ring={ring}
      ground="canvas"
      alt={alt || (kind === 'team' ? 'Team' : 'Organization')}
    >
      <Icon size={getFallbackIconSize(size)} />
    </EntityAvatar>
  );
}

export default PrincipalAvatar;
