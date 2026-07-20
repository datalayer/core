/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { IUser, IRole } from '../models';
import { useIAMStore } from '../state';
import { isPublicPath } from '../routes/publicPaths';

const LOGIN_HREF = '/login';

/**
 * Whether the browser is currently on a public route where anonymous users are
 * allowed, so `useUser` must NOT force a navigation to the login page.
 */
const isOnPublicPath = (): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }
  return isPublicPath(window.location?.pathname || '');
};

export const useUser = (role?: IRole): IUser => {
  const { user } = useIAMStore();
  if (role) {
    if (!user?.roles.includes(role.handle)) {
      if (isOnPublicPath()) {
        return user as unknown as IUser;
      }
      console.warn(
        `User should have role ${role.handle} - Forcing navigation to login page...`,
      );
      window.location.href = LOGIN_HREF;
      throw new Error(`User should have role ${role.handle}`);
    }
  }
  if (!user) {
    if (isOnPublicPath()) {
      return user as unknown as IUser;
    }
    console.warn('No user found... Forcing navigation to /login');
    window.location.href = LOGIN_HREF;
  }
  return user as IUser;
};

export default useUser;
