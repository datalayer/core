/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { IUser } from './User';

export type IIAMProviderName =
  'bluesky' | 'discord' | 'github' | 'google' | 'linkedin' | 'okta' | 'x';

/** Providers whose access token is intentionally available to browser code. */
export type IBrowserTokenProviderName = Exclude<
  IIAMProviderName,
  'bluesky' | 'linkedin'
>;

export type IIAMProviderSpec = {
  name: IIAMProviderName;
  oauth2CallbackServerRoute: string;
  oauth2CallbackUIRoute: string;
};

/** Provider metadata used only when its access token may be read by the UI. */
export type IBrowserTokenProviderSpec = IIAMProviderSpec & {
  name: IBrowserTokenProviderName;
  accessTokenCookieName: (user: IUser) => string;
  refreshTokenCookieName: string;
  userInfoURL: string;
  tokenRefreshURL: string;
  postShareURL: string;
  registerUploadURL: string;
};

export class IAMProvidersSpecs {
  private constructor() {}

  static getProvider(
    providerIAMProvidersType: IBrowserTokenProviderName,
  ): IBrowserTokenProviderSpec {
    switch (providerIAMProvidersType) {
      case 'github': {
        return this.GitHub;
      }
      case 'google': {
        return this.Google;
      }
      case 'okta': {
        return this.Okta;
      }
      default: {
        // TODO revisit this...
        return this.GitHub;
      }
    }
  }

  static readonly GitHub: IBrowserTokenProviderSpec = {
    name: 'github',
    oauth2CallbackServerRoute: 'jupyter_iam/oauth2/callback',
    oauth2CallbackUIRoute: '/iam/oauth2/github/callback',
    accessTokenCookieName: (user: IUser) =>
      `__datalayer__github_access_token_${user.id}`,
    refreshTokenCookieName: '__datalayer__github_refresh_token',
    userInfoURL: 'https://api.github.com/user',
    tokenRefreshURL: 'https://github.com/login/oauth/access_token',
    postShareURL: '',
    registerUploadURL: '',
  };
  static readonly Google: IBrowserTokenProviderSpec = {
    name: 'google',
    oauth2CallbackServerRoute: 'jupyter_iam/oauth2/callback',
    oauth2CallbackUIRoute: '/iam/oauth2/google/callback',
    accessTokenCookieName: (user: IUser) =>
      `__datalayer__google_access_token_${user.id}`,
    refreshTokenCookieName: '__datalayer__google_refresh_token',
    userInfoURL: 'https://openidconnect.googleapis.com/v1/userinfo',
    tokenRefreshURL: 'https://oauth2.googleapis.com/token',
    postShareURL: '',
    registerUploadURL: '',
  };
  static readonly LinkedIn: IIAMProviderSpec = {
    name: 'linkedin',
    oauth2CallbackServerRoute: 'jupyter_iam/oauth2/callback',
    oauth2CallbackUIRoute: '/iam/oauth2/linkedin/callback',
  };
  static readonly Okta: IBrowserTokenProviderSpec = {
    name: 'okta',
    oauth2CallbackServerRoute: 'jupyter_iam/oauth2/callback',
    oauth2CallbackUIRoute: '/iam/oauth2/linkedin/callback',
    accessTokenCookieName: (user: IUser) =>
      `__datalayer__okta_access_token_${user.id}`,
    refreshTokenCookieName: '__datalayer__okta_refresh_token',
    userInfoURL: 'https://trial-4368308.okta.com/oauth2/default/v1/userinfo',
    tokenRefreshURL: '',
    postShareURL: '',
    registerUploadURL: '',
  };
}

export default IAMProvidersSpecs;
