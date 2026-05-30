/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { Avatar } from '@primer/react';

export type PrincipalAvatarProps = {
  login?: string;
  avatarUrl?: string;
  size?: number;
};

export function PrincipalAvatar(props: PrincipalAvatarProps) {
  const { login, avatarUrl, size = 20 } = props;
  return (
    <Avatar src={avatarUrl || ''} size={size} alt={login || 'principal'} />
  );
}

export default PrincipalAvatar;
