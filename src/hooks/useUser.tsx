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

/**
 * Whether these views are running inside JupyterLab.
 *
 * Read from the configuration JupyterLab writes into its own page, so nothing
 * has to be imported from it: this module is used by the web application as
 * well, which has no such configuration.
 */
const isInsideJupyterLab = (): boolean => {
  if (typeof document === 'undefined') {
    return false;
  }
  const config = document.getElementById('jupyter-config-data');
  if (!config) {
    return false;
  }
  try {
    return JSON.parse(config.textContent || '{}').appName === 'JupyterLab';
  } catch {
    return false;
  }
};

export const useUser = (role?: IRole): IUser => {
  const { user } = useIAMStore();
  if (role) {
    if (!user?.roles.includes(role.handle)) {
      if (isOnPublicPath()) {
        return user as unknown as IUser;
      }
      if (isInsideJupyterLab()) {
        // Same reason as below: the router of these views answers this.
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
    /*
     * Inside JupyterLab, nobody leaves the page.
     *
     * `/login` is a page of the web application, at the root of the origin —
     * and the origin of a JupyterLab is the Jupyter Server, which serves
     * something else entirely there. Signing out of a view thus threw the user
     * out of JupyterLab and onto a page of the server, which is not even a
     * sign-in form.
     *
     * The views of Datalayer carry their own sign-in route under the base of
     * JupyterLab, and their router shows it as soon as there is no user — so
     * the way to reach it is to let that render, not to navigate away from it.
     */
    if (isInsideJupyterLab()) {
      return user as unknown as IUser;
    }
    console.warn('No user found... Forcing navigation to /login');
    window.location.href = LOGIN_HREF;
  }
  return user as IUser;
};

export default useUser;
