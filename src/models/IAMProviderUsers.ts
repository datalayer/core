/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { asDisplayName } from '../utils';
import { IIAMProviderName } from './IAMProvidersSpecs';

/*
See details on https://docs.github.com/en/rest/users/users?apiVersion=2022-11-28#get-the-authenticated-user
*/
export type IGitHubUser = {
  iamProvider: IIAMProviderName;
  login: string;
  avatar_url: string;
  gravatar_id: string;
  url: string;
  name: string;
  company: string;
  blog: string;
  location: string;
  email: string;
  bio: string;
}

export type ILinkedInUser = {
  iamProvider: IIAMProviderName;
  sub: string;
  email_verified: boolean;
  name: string;
  given_name: string;
  family_name: string;
  displayName: string;
  email: string;
  picture: string;
  getUrn(): string;
};

export type IXUser = {
  iamProvider: IIAMProviderName;
  sub: string;
  email_verified: boolean;
  name: string;
  given_name: string;
  family_name: string;
  email: string;
  picture: string;
};

export class LinkedInUser implements ILinkedInUser {
  iamProvider: IIAMProviderName = 'linkedin';
  sub: string;
  email_verified: boolean;
  name: string;
  given_name: string;
  displayName: string;
  family_name: string;
  email: string;
  picture: string;
  constructor(u: any) {
    this.sub = u.sub;
    this.email_verified = u.email_verified;
    this.name = u.sub;
    this.given_name = u.given_name;
    this.family_name = u.family_name;
    this.email = u.email;
    this.picture = u.picture;
    this.displayName = asDisplayName(this.given_name, this.family_name);
  }
  getUrn(): string {
    return `urn:li:person:${this.sub}`
  }
}
