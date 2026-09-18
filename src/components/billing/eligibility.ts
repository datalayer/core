/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Whether work may be started under a billing entity: the rule the launch
 * picker enables an entry by.
 *
 * IAM answers `is_eligible` from what its reservation door would accept, for
 * every kind of account. For an entity AWS does not pay for, that door reads
 * the entity's own wallet and asks no plan — so credits in the wallet make it
 * eligible, personal, organization or team, on a paid plan or none. That is
 * said here as well as in IAM, so an IAM that still asked organizations for a
 * paid plan does not grey out an organization with credits to spend. An
 * entity AWS pays for has no wallet: IAM alone decides it, from the
 * subscription.
 */
export function isBillingEntityEligible({
  accountType,
  iamEligible,
  isAwsBilled,
  hasPositiveWallet,
  listedEligible,
}: {
  accountType: string;
  /** `is_eligible` from IAM's account details, when it answered one. */
  iamEligible?: boolean;
  isAwsBilled: boolean;
  hasPositiveWallet: boolean;
  /** Whether IAM's eligible-accounts listing named the entity. */
  listedEligible: boolean;
}): boolean {
  if (typeof iamEligible === 'boolean') {
    return iamEligible || (!isAwsBilled && hasPositiveWallet);
  }
  return accountType === 'team' ? hasPositiveWallet : listedEligible;
}
