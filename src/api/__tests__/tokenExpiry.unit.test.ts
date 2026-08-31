/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Telling an expired token apart from every other reason for a 401.
 *
 * The check runs on the response rather than before the request, because
 * which endpoints need credentials is not knowable at the door — plenty here
 * accept anonymous callers, and refusing up front would reject requests that
 * were going to succeed. So the server decides, and this only explains why.
 *
 * Worth holding down precisely: too eager and every 401 becomes "sign in
 * again", including the ones signing in will not fix; too lax and the caller
 * is back to interpreting a bare 401.
 *
 * @module api/__tests__/tokenExpiry.unit
 */

import { describe, expect, it } from 'vitest';
import { TokenExpiredError } from '../DatalayerApi';
import { getJwtExpiryMs, isJwtExpired } from '../../utils/Jwt';

/** A JWT with the given payload. Unsigned: nothing here reads the signature. */
function jwt(payload: Record<string, unknown>): string {
  const b64 = (value: object) =>
    btoa(JSON.stringify(value))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  return `${b64({ alg: 'none', typ: 'JWT' })}.${b64(payload)}.signature`;
}

const nowSeconds = () => Math.floor(Date.now() / 1000);

describe('reading a token expiry', () => {
  it('reads exp as milliseconds', () => {
    const exp = nowSeconds() + 3600;
    expect(getJwtExpiryMs(jwt({ exp }))).toBe(exp * 1000);
  });

  it.each([
    ['no token', undefined],
    ['an empty string', ''],
    ['an opaque credential', 'not-a-jwt-at-all'],
    ['a token with no exp', jwt({ sub: 'someone' })],
  ])('has no answer for %s', (_label, token) => {
    expect(getJwtExpiryMs(token as string | undefined)).toBeNull();
  });
});

describe('deciding a token has expired', () => {
  it('says so for a token that expired an hour ago', () => {
    expect(isJwtExpired(jwt({ exp: nowSeconds() - 3600 }))).toBe(true);
  });

  it('leaves a token with an hour left alone', () => {
    expect(isJwtExpired(jwt({ exp: nowSeconds() + 3600 }))).toBe(false);
  });

  it('can be asked to count a token as expired early', () => {
    // Unused by the 401 path — reading `exp` after the response has come back
    // needs no allowance, since time only moves forward — but a caller that
    // wants to warn before the fact has it.
    expect(isJwtExpired(jwt({ exp: nowSeconds() + 1 }), 2)).toBe(true);
    expect(isJwtExpired(jwt({ exp: nowSeconds() + 1 }), 0)).toBe(false);
  });

  it.each([
    ['an opaque credential', 'dla_live_abc123'],
    ['a malformed token', 'a.b'],
    ['a token with no exp', jwt({ sub: 'someone' })],
    ['no token', undefined],
  ])('never refuses %s', (_label, token) => {
    // The only safe direction. Answering true for anything unreadable would
    // refuse every non-JWT credential the API accepts.
    expect(isJwtExpired(token as string | undefined)).toBe(false);
  });
});

describe('the error a caller catches', () => {
  it('is recognisable by instance and by name', () => {
    const expiredAt = Date.now() - 1000;
    const error = new TokenExpiredError('https://example.test/api', expiredAt);
    // Both, because a bundler that downlevels the class can break
    // `instanceof` across a package boundary and the name still holds.
    expect(error).toBeInstanceOf(TokenExpiredError);
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('TokenExpiredError');
    expect(error.expiredAt).toBe(expiredAt);
    expect(error.url).toBe('https://example.test/api');
  });

  it('says when it expired and where it was going', () => {
    const error = new TokenExpiredError('https://example.test/api', 0);
    expect(error.message).toContain('1970-01-01');
    expect(error.message).toContain('https://example.test/api');
  });
});
