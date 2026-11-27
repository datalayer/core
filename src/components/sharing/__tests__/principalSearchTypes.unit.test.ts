/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * The share dialog's search asks IAM in IAM's words (27 November 2026): its
 * `personal` is IAM's `user`. Sent as `personal`, IAM dropped it and answered
 * no user at all for any search, only teams and organizations.
 */

import { describe, expect, it } from 'vitest';
import { iamPrincipalTypesOf } from '../ShareAccessComponent';

describe('the principal types the share search sends', () => {
  it('asks IAM for users, teams and organizations, never for "personal"', () => {
    expect(iamPrincipalTypesOf(['personal', 'team', 'organization'])).toEqual([
      'user',
      'team',
      'organization',
    ]);
  });

  it('does not send an agent, which IAM does not search', () => {
    expect(iamPrincipalTypesOf(['personal', 'agent'])).toEqual(['user']);
  });

  it('sends what the dialog offers and nothing else', () => {
    expect(iamPrincipalTypesOf(['team'])).toEqual(['team']);
  });
});
