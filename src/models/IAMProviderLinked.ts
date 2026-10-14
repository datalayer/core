/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { JSONObject } from '@lumino/coreutils';
import { IIAMProviderName } from './IAMProvidersSpecs';

/**
 * The account a provider returned, as IAM keeps it in `linked_account_s`.
 * GitHub, Google and LinkedIn keep a JSON object; Bluesky and X keep a plain
 * handle, which is no object to read, so it reads as `{}`.
 */
function linkedAccountOf(raw: unknown): JSONObject {
  if (typeof raw !== 'string' || raw.trim() === '') {
    return {};
  }
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as JSONObject)
      : {};
  } catch {
    return {};
  }
}

/**
 * One `iam_providers` child of the user IAM returns (whoami, login): its
 * Solr fields `iam_provider_name_s`, `linked_account_s`,
 * `linked_account_url_s`, `linked_account_id_s`.
 */
export function asIAMProviderLinked(iamProvider: any): IIAMProviderLinked {
  return {
    iamProviderName: String(iamProvider.iam_provider_name_s ?? '')
      .trim()
      .toLowerCase() as IIAMProviderName,
    linkedAccount: linkedAccountOf(iamProvider.linked_account_s),
    linkedAccountUrl: iamProvider.linked_account_url_s ?? '',
    linkedAccountId: iamProvider.linked_account_id_s ?? '',
  };
}

/** Whether the user has linked this provider in IAM. */
export function hasLinkedIAMProvider(
  user: { iamProviders?: Array<IIAMProviderLinked> } | null | undefined,
  name: IIAMProviderName,
): boolean {
  return (user?.iamProviders ?? []).some(p => p.iamProviderName === name);
}

export type IIAMProviderLinked = {
  iamProviderName: IIAMProviderName;
  linkedAccount: JSONObject;
  linkedAccountUrl: string;
  linkedAccountId: string;
};
