/*
 * Copyright (c) 2021-2024 Datalayer, Inc.
 *
 * Datalayer License
 */

import { IUser } from './User';

export type IIAMProviderName =
| 'bluesky'
| 'discord'
| 'github'
| 'linkedin'
| 'okta'
| 'x'
;

export type IIAMProviderSpec = {
  name: IIAMProviderName;
  oauth2CallbackServerRoute: string;
  oauth2CallbackUIRoute: string;
  accessTokenCookieName: (user: IUser) => string;
  refreshTokenCookieName: string;
  userInfoURL: string;
  tokenRefreshURL: string;
  postShareURL: string;
  registerUploadURL: string;
}

export class IAMProvidersSpecs {
  private constructor() {}

  static getProvider(providerIAMProvidersType): IIAMProviderSpec {
    switch (providerIAMProvidersType) {
      case 'bluesky': {
        return this.Bluesky;
      }
      case 'github': {
        return this.GitHub;
      }
      case 'linkedin': {
        return this.LinkedIn;
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

  static readonly Bluesky: IIAMProviderSpec = {
    name: 'bluesky',
    oauth2CallbackServerRoute: 'jupyter_iam/oauth2/callback',
    oauth2CallbackUIRoute: '/iam/oauth2/bluesky/callback',
    accessTokenCookieName: (user: IUser) => `__datalayer__bluesky_access_token_${user.id}`,
    refreshTokenCookieName: '__datalayer__bluesky_refresh_token',
    userInfoURL: '',
    tokenRefreshURL: '',
    postShareURL: '',
    registerUploadURL: '',
  }
  static readonly GitHub: IIAMProviderSpec = {
    name: 'github',
    oauth2CallbackServerRoute: 'jupyter_iam/oauth2/callback',
    oauth2CallbackUIRoute: '/iam/oauth2/github/callback',
    accessTokenCookieName: (user: IUser) => `__datalayer__github_access_token_${user.id}`,
    refreshTokenCookieName: '__datalayer__github_refresh_token',
    userInfoURL: 'https://api.github.com/user',
    tokenRefreshURL: 'https://github.com/login/oauth/access_token',
    postShareURL: '',
    registerUploadURL: '',
  }
  static readonly LinkedIn: IIAMProviderSpec = {
    name: 'linkedin',
    oauth2CallbackServerRoute: 'jupyter_iam/oauth2/callback',
    oauth2CallbackUIRoute: '/iam/oauth2/linkedin/callback',
    accessTokenCookieName: (user: IUser) => `__datalayer__linkedin_access_token_${user.id}`,
    refreshTokenCookieName: '__datalayer__linkedin_refresh_token',
    userInfoURL: 'https://api.linkedin.com/v2/userinfo',
    tokenRefreshURL: '',
    postShareURL: 'https://api.linkedin.com/v2/ugcPosts',
    registerUploadURL: 'https://api.linkedin.com/v2/assets?action=registerUpload',
  }
  static readonly Okta: IIAMProviderSpec = {
    name: 'okta',
    oauth2CallbackServerRoute: 'jupyter_iam/oauth2/callback',
    oauth2CallbackUIRoute: '/iam/oauth2/linkedin/callback',
    accessTokenCookieName: (user: IUser) => `__datalayer__okta_access_token_${user.id}`,
    refreshTokenCookieName: '__datalayer__okta_refresh_token',
    userInfoURL: 'https://trial-4368308.okta.com/oauth2/default/v1/userinfo',
    tokenRefreshURL: '',
    postShareURL: '',
    registerUploadURL: '',
  }
}

export default IAMProvidersSpecs;
