/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { describe, expect, it } from 'vitest';
import { isBillingEntityEligible } from '../eligibility';

const base = {
  accountType: 'organization',
  isAwsBilled: false,
  hasPositiveWallet: false,
  listedEligible: false,
};

describe('isBillingEntityEligible', () => {
  it('takes an organization with credits and no paid plan, whatever IAM said', () => {
    // What prod1 answered on 2026-09-18 for organizations with credits and
    // runs left: no plan name, is_eligible false.
    expect(
      isBillingEntityEligible({
        ...base,
        iamEligible: false,
        hasPositiveWallet: true,
      }),
    ).toBe(true);
  });

  it('takes a team with credits delegated to it', () => {
    expect(
      isBillingEntityEligible({
        ...base,
        accountType: 'team',
        iamEligible: false,
        hasPositiveWallet: true,
      }),
    ).toBe(true);
  });

  it('takes a team of an AWS organization, which has no wallet, when IAM does', () => {
    expect(
      isBillingEntityEligible({
        ...base,
        accountType: 'team',
        iamEligible: true,
        isAwsBilled: true,
      }),
    ).toBe(true);
  });

  it('never lets a wallet reopen an entity AWS stopped paying for', () => {
    expect(
      isBillingEntityEligible({
        ...base,
        iamEligible: false,
        isAwsBilled: true,
        hasPositiveWallet: true,
      }),
    ).toBe(false);
  });

  it('refuses an entity with neither a plan nor credits', () => {
    expect(isBillingEntityEligible({ ...base, iamEligible: false })).toBe(
      false,
    );
  });

  it('keeps a paid plan eligible with an empty wallet', () => {
    expect(isBillingEntityEligible({ ...base, iamEligible: true })).toBe(true);
  });

  it('falls back on the listing, and on the wallet for a team, when IAM gave no answer', () => {
    expect(isBillingEntityEligible({ ...base, listedEligible: true })).toBe(
      true,
    );
    expect(
      isBillingEntityEligible({
        ...base,
        accountType: 'team',
        listedEligible: true,
      }),
    ).toBe(false);
    expect(
      isBillingEntityEligible({
        ...base,
        accountType: 'team',
        hasPositiveWallet: true,
      }),
    ).toBe(true);
  });
});
