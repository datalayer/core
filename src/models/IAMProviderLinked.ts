/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { JSONObject } from '@lumino/coreutils';
import { IIAMProviderName } from './IAMProvidersSpecs';

export function asIAMProviderLinked(iamProvider: any): IIAMProviderLinked {
  const info = (iamProvider.linkedAccount as string).replaceAll("'", '"');
  return {
    iamProviderName: iamProvider.iam_ProviderName,
    linkedAccount: JSON.parse(info === "" ? "{}" : info),
    linkedAccountUrl: iamProvider.linkedAccountUrl,
    linkedAccountId: iamProvider.linkedAccountId,
  }
}

export type IIAMProviderLinked = {
  iamProviderName: IIAMProviderName;
  linkedAccount: JSONObject;
  linkedAccountUrl: string;
  linkedAccountId: string;
}
