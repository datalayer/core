/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { JSONObject } from '@lumino/coreutils';
import { IContact } from './Contact';
import { IIAMProviderName } from './IAMProvidersSpecs';

export function asContactIAMProvider(iamProvider: any): IContactIAMProvider {
  return {
    iamProviderName: iamProvider.iamProviderName,
    linkedAccount: iamProvider.linkedAccount ?? '',
    linkedAccountUrl: iamProvider.linkedAccountUrl,
    linkedAccountId: iamProvider.linkedAccountId ?? '',
    isConnected: iamProvider.isConnected ?? false,
  };
}

export const getSocialUrl = (
  iamProviderName: IIAMProviderName,
  contact?: IContact,
) => {
  if (contact) {
    const iamProvider = contact?.iamProviders.find(
      i => i.iamProviderName === iamProviderName,
    );
    return iamProvider?.linkedAccountUrl;
  }
  return undefined;
};

export type IContactIAMProvider = {
  iamProviderName: IIAMProviderName;
  linkedAccount: JSONObject;
  linkedAccountUrl: string;
  linkedAccountId: string;
  isConnected: boolean;
};
