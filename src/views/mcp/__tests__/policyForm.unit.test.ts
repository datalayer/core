/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * The reading of a policy field that differs from the plain one.
 *
 * These are the conversions the two policy pages share, and they are shared
 * precisely so the readings cannot drift: "an empty allowlist is not an
 * allowlist" worded two ways is one of them being wrong.
 */

import { describe, expect, it } from 'vitest';
import {
  EMPTY_POLICY_DRAFT,
  draftOf,
  listFrom,
  numberFrom,
  policyChanged,
  rulesFrom,
  textOf,
} from '../PolicyForm';

describe('a policy field, read back', () => {
  it('turns an empty textarea into no rule, never an empty list', () => {
    // An empty array is a rule *set* to nothing. For an allowlist that
    // refuses everything, which is not what a blank field means.
    expect(listFrom('')).toBeUndefined();
    expect(listFrom('   \n  \n')).toBeUndefined();
  });

  it('reads one entry a line, trimmed', () => {
    expect(listFrom(' execute_cell \n\n delete_file ')).toEqual([
      'execute_cell',
      'delete_file',
    ]);
  });

  it('turns a blank number into no limit', () => {
    expect(numberFrom('')).toBeUndefined();
    expect(numberFrom('  ')).toBeUndefined();
  });

  it('keeps a number that was typed', () => {
    expect(numberFrom('30')).toBe(30);
  });

  it('does not turn nonsense into a limit', () => {
    expect(numberFrom('soon')).toBeUndefined();
  });

  it('shows no number for a rule nobody set', () => {
    expect(textOf(undefined)).toBe('');
  });

  it('shows a zero that somehow got stored rather than hiding it', () => {
    // It should never be there — IAM refuses it — but hiding it would mean
    // an owner could not see, or fix, the one value whose stored meaning is
    // the opposite of its reading.
    expect(textOf(0)).toBe('0');
  });
});

describe('a draft, turned back into rules', () => {
  it('refuses a cap of zero, and says what to do instead', () => {
    const refusal = rulesFrom({ ...EMPTY_POLICY_DRAFT, maxCallsPerMinute: '0' });
    expect(typeof refusal).toBe('string');
    expect(refusal).toContain('revoke');
  });

  it('refuses a negative cap for the same reason', () => {
    expect(typeof rulesFrom({ ...EMPTY_POLICY_DRAFT, maxCreditsPerDay: '-5' })).toBe(
      'string',
    );
  });

  it('refuses a limit that is not a number', () => {
    expect(
      typeof rulesFrom({ ...EMPTY_POLICY_DRAFT, maxConcurrentSandboxes: 'many' }),
    ).toBe('string');
  });

  it('names the field it is refusing', () => {
    expect(rulesFrom({ ...EMPTY_POLICY_DRAFT, maxCreditsPerDay: '0' })).toContain(
      'Credits per day',
    );
  });

  it('lets an empty draft through as a layer that narrows nothing', () => {
    const rules = rulesFrom(EMPTY_POLICY_DRAFT);
    expect(typeof rules).not.toBe('string');
    expect(rules).toEqual({
      toolDenylist: undefined,
      toolAllowlist: undefined,
      allowedClients: undefined,
      maxCallsPerMinute: undefined,
      maxCreditsPerDay: undefined,
      maxConcurrentSandboxes: undefined,
    });
  });
});

describe('a stored layer, shown in the form', () => {
  it('round-trips through the form without changing', () => {
    const stored = {
      toolDenylist: ['execute_cell'],
      maxCallsPerMinute: 30,
    };
    const draft = draftOf(stored);
    expect(policyChanged(draft, draft)).toBe(false);
    expect(rulesFrom(draft)).toMatchObject(stored);
  });

  it('shows a layer nobody has written as an empty form', () => {
    expect(draftOf(null)).toEqual(EMPTY_POLICY_DRAFT);
  });

  it('notices a change in any field', () => {
    for (const key of Object.keys(EMPTY_POLICY_DRAFT) as (keyof typeof EMPTY_POLICY_DRAFT)[]) {
      expect(
        policyChanged({ ...EMPTY_POLICY_DRAFT, [key]: 'x' }, EMPTY_POLICY_DRAFT),
      ).toBe(true);
    }
  });
});
