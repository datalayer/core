/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Canonical, single source of truth for the public route prefixes that
 * anonymous (logged-out) users are allowed to view.
 *
 * This list is shared across packages so the various auth gates stay in sync:
 * - `useUser` (core) must NOT force a navigation to the login page on these.
 * - The application router uses it to decide whether a route requires auth.
 *
 * Keep the entries as normalized prefixes (lowercase, no trailing slash).
 */
export const PUBLIC_PATH_PREFIXES: readonly string[] = [
  '/about',
  '/agents',
  '/agentspecs',
  '/blog',
  '/careers',
  '/community',
  '/compare',
  '/connect',
  '/contact',
  '/dataliens',
  '/docs',
  '/events',
  '/features',
  '/gallery',
  '/integrations',
  '/join/confirm/user',
  '/library',
  '/outbounds/contacts/unsubscribe',
  '/outbounds/invites/pages',
  '/outbounds/invites/unsubscribe',
  '/outbounds/users/unsubscribe',
  '/partners',
  '/password',
  '/pricing',
  '/privacy',
  '/public',
  '/releases',
  '/reports',
  '/research',
  '/search',
  '/settings/agentspecs',
  '/signup/confirm/user',
  '/support',
  '/team',
  '/terms',
  '/testimonials',
  '/trust',
  '/tutorials',
  '/usecases',
  '/use-cases',
];

/**
 * Normalize a pathname for prefix matching: strip the query string and hash,
 * trim surrounding whitespace, lowercase, and remove any trailing slash.
 * Always returns a leading-slash path (defaults to '/').
 */
export const normalizePathname = (pathname: string): string => {
  const path = (pathname || '').split('?')[0]?.split('#')[0] || '/';
  const normalized = path.trim().toLowerCase().replace(/\/+$/, '');
  return normalized || '/';
};

/**
 * Whether the given pathname is under one of the public path prefixes and is
 * therefore viewable by anonymous users without an authentication redirect.
 */
export const isPublicPath = (pathname: string): boolean => {
  const normalized = normalizePathname(pathname);
  return PUBLIC_PATH_PREFIXES.some(
    prefix => normalized === prefix || normalized.startsWith(`${prefix}/`),
  );
};

export default isPublicPath;
