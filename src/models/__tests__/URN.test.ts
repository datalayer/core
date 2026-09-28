/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { describe, it, expect } from 'vitest';
import { accountOriginOf, parseURN, signsInWith } from '../URN';

describe('URN', () => {
  it('keeps the colons of an id', () => {
    const urn = parseURN('urn:dla:iam:ext::github:a:b');
    expect(urn?.uid).toBe('a:b');
    expect(urn?.toString()).toBe('urn:dla:iam:ext::github:a:b');
  });

  it('parses nothing that is not a URN', () => {
    expect(parseURN('datalayer')).toBeUndefined();
    expect(parseURN('')).toBeUndefined();
    expect(parseURN(undefined)).toBeUndefined();
  });
});

describe('accountOriginOf', () => {
  it('reads a password account', () => {
    expect(accountOriginOf('datalayer')).toEqual({ kind: 'datalayer' });
  });

  it('reads a provider sign-in', () => {
    const origin = accountOriginOf('urn:dla:iam:ext::github:12345');
    expect(origin.kind).toBe('iam-provider');
    if (origin.kind === 'iam-provider') {
      expect(origin.provider).toBe('github');
      expect(origin.accountId).toBe('12345');
    }
  });

  it('keeps other URNs as URNs', () => {
    const origin = accountOriginOf('urn:dla:iam:aws::marketplace:abc');
    expect(origin.kind).toBe('urn');
  });

  it('says unknown for nothing', () => {
    expect(accountOriginOf(undefined)).toEqual({ kind: 'unknown', value: '' });
  });
});

describe('signsInWith', () => {
  it('matches the provider the account signs in with, only', () => {
    const origin = 'urn:dla:iam:ext::google:987';
    expect(signsInWith(origin, 'google')).toBe(true);
    expect(signsInWith(origin, 'github')).toBe(false);
    expect(signsInWith('datalayer', 'google')).toBe(false);
  });
});
