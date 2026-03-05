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
  const full = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
  return full || user.handle || fallback;
}
