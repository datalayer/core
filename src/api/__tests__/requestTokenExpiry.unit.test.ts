/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * What `requestDatalayerAPI` throws when the server says 401.
 *
 * The helpers underneath are tested next door; this holds the contract a
 * caller actually depends on — that exactly one kind of 401 arrives as
 * `TokenExpiredError`, and every other kind still arrives as the
 * `RunResponseError` it always did. Getting that wrong in the lax direction
 * loses the typed error; getting it wrong in the eager direction tells people
 * to sign in again to fix a permission they were never granted.
 *
 * @module api/__tests__/requestTokenExpiry.unit
 */

import { afterEach, describe, expect, it, vi } from 'vitest';

const axiosCall = vi.fn();

vi.mock('axios', () => {
  const instance = Object.assign(
    (...args: unknown[]) => axiosCall(...args),
    { isAxiosError: () => false },
  );
  return { default: instance, ...instance };
});

const { requestDatalayerAPIWithResponse, RunResponseError, TokenExpiredError } =
  await import('../DatalayerApi');

function jwt(payload: Record<string, unknown>): string {
  const b64 = (value: object) =>
    btoa(JSON.stringify(value))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  return `${b64({ alg: 'none', typ: 'JWT' })}.${b64(payload)}.signature`;
}

const nowSeconds = () => Math.floor(Date.now() / 1000);
const expired = jwt({ exp: nowSeconds() - 3600 });
const live = jwt({ exp: nowSeconds() + 3600 });

/** The server's answer, however unhappy. */
function respondWith(status: number) {
  axiosCall.mockResolvedValue({
    status,
    statusText: 'nope',
    data: { message: 'nope' },
    headers: {},
  });
}

const request = (token?: string) =>
  requestDatalayerAPIWithResponse({ url: 'https://example.test/api', token });

afterEach(() => {
  axiosCall.mockReset();
});

describe('a 401 with an expired token', () => {
  it('arrives as TokenExpiredError', async () => {
    respondWith(401);
    await expect(request(expired)).rejects.toBeInstanceOf(TokenExpiredError);
  });

  it('carries when it expired and where it was going', async () => {
    respondWith(401);
    await expect(request(expired)).rejects.toMatchObject({
      name: 'TokenExpiredError',
      url: 'https://example.test/api',
    });
  });
});

describe('every other 401 is unchanged', () => {
  it.each([
    ['a token that is still valid', live],
    ['an opaque credential', 'dla_live_abc123'],
    ['no token at all', undefined],
  ])('stays a RunResponseError for %s', async (_label, token) => {
    respondWith(401);
    // Signing in again fixes none of these, so none of them should be
    // dressed up as an expiry.
    await expect(request(token)).rejects.toBeInstanceOf(RunResponseError);
  });
});

describe('other statuses are never read as an expiry', () => {
  it.each([403, 404, 500])('leaves %i alone even with an expired token', async status => {
    respondWith(status);
    await expect(request(expired)).rejects.toBeInstanceOf(RunResponseError);
  });
});
