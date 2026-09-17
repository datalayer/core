/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * What the directory-provisioning view tells an administrator.
 *
 * The sentences are the feature. A table of SCIM tokens looks nearly
 * identical whether people are being deprovisioned or not — a revoked-out
 * organization and a live one differ by one label, and one whose directory
 * was never switched on differs by an empty cell. So the state is computed
 * and said, and what it says is held here.
 *
 * The failure worth preventing is a reassuring message in a state where
 * **nobody is being removed**. Somebody reads this page precisely to answer
 * "is the person who left still a member", and a green line in the two
 * states where the answer is yes would be worse than having no page.
 */

import { describe, expect, it } from 'vitest';

import { SCIM_STATUS_MESSAGES } from '../ScimProvisioning';
import { scimStatus } from '../../../api/iam/scimTokens';
import type { ScimToken } from '../../../api/iam/scimTokens';

const token = (over: Partial<ScimToken> = {}): ScimToken => ({
  uid: 't-1',
  orgUid: 'org-1',
  name: 'Okta',
  revoked: false,
  ...over,
});

/** The states in which the answer to "is anybody being removed" is no. */
const NOT_PROVISIONING = ['none', 'revoked', 'never-used'] as const;

describe('the status line', () => {
  it('has a message for every state scimStatus can answer', () => {
    // Not a copy of the list: a state added to `scimStatus` and missed here
    // renders `undefined` and crashes the page, which reads as the console
    // being broken rather than as the state being new.
    const states = [
      scimStatus([]).state,
      scimStatus([token({ revoked: true })]).state,
      scimStatus([token()]).state,
      scimStatus([token({ lastUsedAt: '2026-09-17T10:00:00Z' })]).state,
    ];
    for (const state of states) {
      expect(SCIM_STATUS_MESSAGES[state]).toBeTruthy();
      expect(SCIM_STATUS_MESSAGES[state].heading).not.toHaveLength(0);
      expect(SCIM_STATUS_MESSAGES[state].body).not.toHaveLength(0);
    }
  });

  it('never looks reassuring in a state where nobody is being removed', () => {
    // The one that matters. `success` is green, and green here means "the
    // person who left is gone" — which is false in all three.
    for (const state of NOT_PROVISIONING) {
      expect(SCIM_STATUS_MESSAGES[state].variant).not.toBe('success');
    }
  });

  it('warns rather than informs when a directory was configured and stopped', () => {
    // Distinct from `none`. Nothing configured is a choice; configured and
    // then revoked is a regression somebody should act on, and the two must
    // not be shown the same way.
    expect(SCIM_STATUS_MESSAGES.revoked.variant).toBe('warning');
    expect(SCIM_STATUS_MESSAGES.none.variant).toBe('default');
  });

  it('warns that a never-used token has removed nobody', () => {
    // The quietest failure there is: live, valid, and never called.
    expect(SCIM_STATUS_MESSAGES['never-used'].variant).toBe('warning');
    expect(SCIM_STATUS_MESSAGES['never-used'].body).toMatch(/deprovision/i);
  });

  it('says what deprovisioning actually does when it is working', () => {
    // It is not only a membership. The same path revokes the agent grants
    // that membership gave, and somebody turning this on should know that
    // is what they are turning on.
    expect(SCIM_STATUS_MESSAGES.active.variant).toBe('success');
    expect(SCIM_STATUS_MESSAGES.active.body).toMatch(/agent grant/i);
  });

  it('tells somebody what to do in each state that needs doing', () => {
    // A warning with no next step is an alarm, not a console.
    expect(SCIM_STATUS_MESSAGES.revoked.body).toMatch(/rotate|issue a new/i);
    expect(SCIM_STATUS_MESSAGES.none.body).toMatch(/issue a token/i);
  });
});
