/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { describe, expect, it } from 'vitest';
import {
  asIAMProviderLinked,
  hasLinkedIAMProvider,
} from '../IAMProviderLinked';
import { asUser } from '../User';

// The shape IAM's whoami returns for each `iam_providers` child.
const linkedin = {
  id: 'p1',
  user_uid: 'u1',
  iam_provider_name_s: 'linkedin',
  linked_account_s: '{"sub": "abc", "name": "Ann O\'Brien"}',
  linked_account_url_s: 'https://www.linkedin.com/in/abc',
  linked_account_id_s: 'abc',
};
const bluesky = {
  id: 'p2',
  user_uid: 'u1',
  iam_provider_name_s: 'bluesky',
  linked_account_s: 'someone.bsky.social',
  linked_account_url_s: 'https://bsky.app/profile/someone.bsky.social',
  linked_account_id_s: 'did:plc:xyz',
};

describe('asIAMProviderLinked', () => {
  it("reads IAM's iam_provider_name_s and linked_account_* fields", () => {
    const p = asIAMProviderLinked(linkedin);
    expect(p.iamProviderName).toBe('linkedin');
    expect(p.linkedAccountId).toBe('abc');
    expect(p.linkedAccountUrl).toBe('https://www.linkedin.com/in/abc');
    expect(p.linkedAccount).toEqual({ sub: 'abc', name: "Ann O'Brien" });
  });

  it('keeps a provider whose account is a plain handle, not JSON', () => {
    const p = asIAMProviderLinked(bluesky);
    expect(p.iamProviderName).toBe('bluesky');
    expect(p.linkedAccount).toEqual({});
  });
});

describe('User.iamProviders', () => {
  it('lists every linked provider, a non-JSON account included', () => {
    const user = asUser({ id: 'u1', iam_providers: [bluesky, linkedin] });
    expect(user.iamProviders.map(p => p.iamProviderName)).toEqual([
      'bluesky',
      'linkedin',
    ]);
    expect(hasLinkedIAMProvider(user, 'linkedin')).toBe(true);
    expect(hasLinkedIAMProvider(user, 'github')).toBe(false);
  });

  it('accepts a single linked provider sent as an object', () => {
    const user = asUser({ id: 'u1', iam_providers: linkedin });
    expect(hasLinkedIAMProvider(user, 'linkedin')).toBe(true);
  });

  it('has no provider when IAM sends none', () => {
    const user = asUser({ id: 'u1' });
    expect(user.iamProviders).toEqual([]);
    expect(hasLinkedIAMProvider(user, 'linkedin')).toBe(false);
    expect(hasLinkedIAMProvider(undefined, 'linkedin')).toBe(false);
  });
});
