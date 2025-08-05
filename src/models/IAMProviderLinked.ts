/*
 * Copyright (c) 2021-2024 Datalayer, Inc.
 *
 * Datalayer License
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
