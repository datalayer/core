/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { Avatar, Link } from '@primer/react';
import { Box } from '@datalayer/primer-addons';
import { IUser } from '../../models';
import { AvatarSkeleton } from '../../components/display';
import { getAvatarURL } from '../../utils';

type IUserProfileAvatarProps = {
  user?: IUser;
  size?: number;
  onClick?: React.MouseEventHandler<any>;
};

const Profile = ({ user, size = 100, onClick }: IUserProfileAvatarProps) => {
  return (
    <Box style={{ width: size }}>
      <Avatar
        //      square
        src={getAvatarURL(user?.avatarUrl)}
        size={size}
        onClick={onClick}
      />
    </Box>
  );
};

export const UserProfileAvatar = ({
  onClick,
  user,
  size = 100,
}: IUserProfileAvatarProps) => {
  return user ? (
    onClick ? (
      <Link href="javascript: return false;" onClick={onClick}>
        <Profile user={user} size={size} onClick={onClick} />
      </Link>
    ) : (
      <Profile user={user} size={size} onClick={onClick} />
    )
  ) : (
    <AvatarSkeleton size={size} />
  );
};

export default UserProfileAvatar;
