/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import type { IIAMProviderName } from '../models/IAMProvidersSpecs';

/** What `requestDatalayer` resolves: on failure, `success: false` and IAM's sentence. */
type UnlinkResponse = { success?: boolean; message?: string };

type Request = (request: {
  url: string;
  method: 'DELETE';
  notifyOnError: false;
}) => Promise<UnlinkResponse>;

/**
 * Unlink a provider from the signed-in account
 * (`DELETE /api/iam/v1/me/providers/{provider}`).
 *
 * IAM answers 409 when the provider is the account's only way to sign in and
 * 404 when it is not linked; either way its sentence is thrown as the error's
 * message for the page to show, and nothing is toasted. On success `refresh`
 * reads the user again before this resolves.
 */
export async function unlinkIAMProvider(
  request: Request,
  iamUrl: string,
  provider: IIAMProviderName,
  refresh: () => Promise<void>,
): Promise<void> {
  const response = await request({
    url: `${iamUrl}/api/iam/v1/me/providers/${encodeURIComponent(provider)}`,
    method: 'DELETE',
    notifyOnError: false,
  });
  if (!response?.success) {
    throw new Error(
      response?.message || `The ${provider} account could not be unlinked.`,
    );
  }
  await refresh();
}
