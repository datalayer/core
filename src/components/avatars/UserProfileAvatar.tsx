/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { Avatar, Link } from '@primer/react';
import { Box } from '@datalayer/primer-addons';
import { IUser } from '../../models';
import { AvatarSkeleton } from '../../components/display';
import { getAvatarURL } from '../../utils';

type IUserProfileModelAvatarProps = {
  user?: IUser;
  size?: number;
  onClick?: React.MouseEventHandler<any>;
};

const Profile = (props: IUserProfileModelAvatarProps) => {
  const { user, size, onClick } = props;
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

export const UserProfileModelAvatar = (props: IUserProfileModelAvatarProps) => {
  const { onClick, user, size } = props;
  return user ? (
    onClick ? (
      <Link href="javascript: return false;" onClick={onClick}>
        <Profile {...props} />
      </Link>
    ) : (
      <Profile {...props} />
    )
  ) : (
    <AvatarSkeleton size={size} />
  );
};

UserProfileModelAvatar.defaultProps = {
  size: 100,
};

export default UserProfileModelAvatar;
