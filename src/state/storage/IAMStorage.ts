/*
 * Copyright (c) 2021-2024 Datalayer, Inc.
 *
 * Datalayer License
 */

import jwt_decode from 'jwt-decode';
import { getCookie } from '../../utils';
import { IUser, ANONYMOUS_USER, ANONYMOUS_USER_TOKEN } from '../../models';

export const JWT_DATALAYER_ISSUER = 'https://id.datalayer.run';

export const DATALAYER_IAM_USER_KEY = '@datalayer/iam:user';

export const DATALAYER_IAM_TOKEN_KEY = '@datalayer/iam:token';

export const JWT_REFRESH_TOKEN_COOKIE_NAME = 'refresh_token';

export type IJWTToken = {
  exp: number;
  iat: number;
  iss: string;
  jti: number;
  roles: Array<string>;
  sub: IUser;
}

/**
 * Return the user from the local storage.
 */
export const getStoredUser = (): IUser | undefined => {
  const user = window.localStorage.getItem(DATALAYER_IAM_USER_KEY);
  if (user) {
    try {
      const u = JSON.parse(user);
      u.joinDate = new Date(u.joinDate);
      return u as IUser;
    } catch (e) {
      return ANONYMOUS_USER;
    }
  }
  return ANONYMOUS_USER;
}

/**
 * Set the user in the local storage.
 */
export const storeUser = (user?: IUser): void => {
  if (user) {
    window.localStorage.setItem(DATALAYER_IAM_USER_KEY, JSON.stringify(user));
  } else {
    window.localStorage.removeItem(DATALAYER_IAM_USER_KEY);
  }
}

/**
 * Return the IAM token from the local storage.
 */
export const getStoredToken = (): string | undefined => {
  const token = window.localStorage.getItem(DATALAYER_IAM_TOKEN_KEY);
  if (token) {
    return token;
  }
  return ANONYMOUS_USER_TOKEN;
}

/**
 * Set the IAM token in the local storage.
 */
export const storeToken = (token?: string) => {
  if (token) {
    if (token !== ANONYMOUS_USER_TOKEN) {
      try {
        const jwt = jwt_decode<IJWTToken>(token);
        console.debug('JWT Token', jwt);
      } catch (error) {
        console.error("Error while decoding JWT Token.", error);
        throw error;
      }
    }
    localStorage.setItem(DATALAYER_IAM_TOKEN_KEY, token);
  } else {
    window.localStorage.removeItem(DATALAYER_IAM_TOKEN_KEY);
  }
}

/**
 * Load a JWT refresh token stored in a cookie.
 */
export function loadRefreshTokenFromCookie(): string | undefined {
  return getCookie(JWT_REFRESH_TOKEN_COOKIE_NAME);
}
