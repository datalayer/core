/*
 * Copyright (c) 2021-2024 Datalayer, Inc.
 *
 * Datalayer License
 */

import { IUser, IRole } from '../models';
import { useIAMStore } from '../state';

const LOGIN_HREF = "/login";

export const useUser = (role?: IRole): IUser => {
  const { user } = useIAMStore();
  if (role) {
    if (!user?.roles.includes(role.handle)) {
      console.log(`User should have role ${role.handle} - Forcing navigation to login page...`);
      window.location.href = LOGIN_HREF;
      throw new Error(`User should have role ${role.handle}`);
    }
  }
  if (!user) {
    console.log('No user found... Forcing navigation to /login');
    window.location.href = LOGIN_HREF;
  }
  return user as IUser;
}

export default useUser;
