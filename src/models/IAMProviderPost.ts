/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { IIAMProviderName } from './IAMProvidersSpecs';

export class LinkedInPost {
  iamProvider: IIAMProviderName = 'linkedin';
  urn: string;
  id: string;
  /*
  How does LinkedIn URN urn:li:share:7264291213959204866 translate to URL https://www.linkedin.com/feed/update/urn:li:activity:7264291214332456960 ?
  @see Documentation: A successful response will return 201 Created, and the newly created post will be identified by the X-RestLi-Id response header.
  */
  constructor(urn: string) {
    this.urn = urn;
    const splits = urn.split(':');
    this.id = splits[3];
  }
  getURL(): string {
    //    return `https://www.linkedin.com/feed/update/urn:li:activity:${this.id}`
    return `https://www.linkedin.com/feed/update/${this.urn}`;
  }
}
