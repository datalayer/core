/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { getDatalayerJwtUser, parseJwtPayload } from '../utils/Jwt';

export interface ResolvedOtelAuth {
  token: string;
  userUid: string;
}

function normalizeBaseUrl(baseUrl: string): URL {
  const normalized =
    baseUrl.startsWith('ws://') || baseUrl.startsWith('wss://')
      ? baseUrl.replace(/^ws/, 'http')
      : baseUrl;

  const isAbsoluteUrl = /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(normalized);
  if (isAbsoluteUrl) {
    return new URL(normalized);
  }

  if (
    typeof window !== 'undefined' &&
    typeof window.location !== 'undefined' &&
    typeof window.location.origin === 'string'
  ) {
    return new URL(normalized || '/', window.location.origin);
  }

  throw new Error(
    'OTEL baseUrl must be an absolute URL when window.location is unavailable.',
  );
}

export function resolveOtelUserUid(
  token?: string,
  userUid?: string,
): string | null {
  if (typeof userUid === 'string' && userUid.trim().length > 0) {
    return userUid.trim();
  }
  if (!token) {
    return null;
  }

  const user = getDatalayerJwtUser(token);
  if (user?.uid) {
    return user.uid;
  }

  const payload = parseJwtPayload<Record<string, unknown>>(token);
  const sub = payload?.sub;
  if (typeof sub === 'string' && sub.trim().length > 0) {
    return sub.trim();
  }

  return null;
}

export function resolveOtelAuth(
  token?: string,
  userUid?: string,
): ResolvedOtelAuth {
  if (!token || token.trim().length === 0) {
    throw new Error('OTEL requires an authenticated token.');
  }

  const trimmedToken = token.trim();

  const resolvedUserUid = resolveOtelUserUid(trimmedToken, userUid);
  if (!resolvedUserUid) {
    throw new Error(
      'OTEL requires datalayer.user_uid. Provide a JWT with user.uid/sub or pass userUid explicitly.',
    );
  }

  return {
    token: trimmedToken,
    userUid: resolvedUserUid,
  };
}

export function buildOtelWebSocketUrl(options: {
  baseUrl: string;
  token: string;
  userUid?: string;
}): string {
  const auth = resolveOtelAuth(options.token, options.userUid);
  const url = normalizeBaseUrl(options.baseUrl);
  const wsProtocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  const pathname = url.pathname.replace(/\/$/, '');
  const hasApiPrefix =
    pathname.endsWith('/api/otel/v1') || pathname.includes('/api/otel/v1/');

  url.protocol = wsProtocol;
  url.pathname = hasApiPrefix ? `${pathname}/ws` : '/api/otel/v1/ws';
  url.search = '';
  url.searchParams.set('token', auth.token);
  url.searchParams.set('user_uid', auth.userUid);

  return url.toString();
}
