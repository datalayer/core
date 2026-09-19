/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Lightweight JWT payload utilities.
 *
 * Decodes a JWT without verification (client-side display only).
 * Never use for security-critical checks.
 */

import { asDisplayName } from './Name';

// ── Types ─────────────────────────────────────────────────────────

export interface DatalayerJwtUser {
  id: string;
  uid: string;
  handle: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl: string;
  roles: string[];
}

/** Full Datalayer JWT payload shape. */
export interface DatalayerJwtPayload {
  jti: string;
  iss: string;
  iat: number;
  exp: number;
  sub: string;
  user: DatalayerJwtUser;
  /** Legacy top-level roles array (some tokens). */
  roles?: string[];
}

// ── Utilities ─────────────────────────────────────────────────────

/**
 * Decode the payload of a JWT without verifying the signature.
 * Returns `null` on any error (malformed token, invalid base64, etc.).
 */
export function parseJwtPayload<T = DatalayerJwtPayload>(
  token: string,
): T | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    // Base64Url → Base64 → JSON
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(
      base64.length + ((4 - (base64.length % 4)) % 4),
      '=',
    );
    const json = atob(padded);
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

/**
 * When a JWT expires, in milliseconds since the epoch.
 *
 * `null` when there is no token, when it cannot be decoded, or when it
 * carries no `exp` — three different unknowns that all mean the same thing to
 * a caller: nothing here says this token has expired.
 */
export function getJwtExpiryMs(token: string | null | undefined): number | null {
  if (!token) return null;
  const payload = parseJwtPayload<DatalayerJwtPayload>(token);
  const exp = payload?.exp;
  return typeof exp === 'number' && Number.isFinite(exp) ? exp * 1000 : null;
}

/**
 * Whether a JWT has already expired.
 *
 * Answers `false` for anything it cannot read — a missing token, an opaque
 * one, a payload with no `exp`. This is the only safe direction: a caller
 * uses it to refuse a request before making it, and refusing on a token we
 * failed to parse would break every non-JWT credential the API accepts.
 *
 * Unverified, and deliberately so. The signature is the server's business;
 * what a client can usefully do with `exp` is avoid sending a request whose
 * only possible answer is 401, and tell the person why in the meantime.
 *
 * `leewaySeconds` counts a token as expired slightly early. A request takes
 * time to arrive, so a token with a second left on it is one the server may
 * well reject by the time it reads it — and a typed expiry error is a better
 * answer for the reader than an opaque 401.
 */
export function isJwtExpired(
  token: string | null | undefined,
  leewaySeconds = 0,
): boolean {
  const expiryMs = getJwtExpiryMs(token);
  if (expiryMs === null) return false;
  return expiryMs - leewaySeconds * 1000 <= Date.now();
}

/**
 * Extract the Datalayer user object from a JWT, returning `null` if the
 * token is missing or cannot be decoded.
 */
export function getDatalayerJwtUser(
  token: string | null | undefined,
): DatalayerJwtUser | null {
  if (!token) return null;
  const payload = parseJwtPayload<DatalayerJwtPayload>(token);
  return payload?.user ?? null;
}

/**
 * Format a human-readable display name from a JWT user.
 * Prefers "FirstName LastName", falls back to handle.
 */
export function getDatalayerDisplayName(
  user: DatalayerJwtUser | null | undefined,
  fallback = '',
): string {
  if (!user) return fallback;
  const full = asDisplayName(user.firstName ?? '', user.lastName ?? '').trim();
  return full || user.handle || fallback;
}
