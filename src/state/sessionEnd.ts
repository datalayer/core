/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * What a session leaves in the browser, forgotten when the session ends.
 *
 * Signing out used to reset the query cache and nothing else. The current
 * space, the selected principal and the billing entity are persisted — in
 * cookies the next page load restores, and in local storage — and they
 * survived it: the next person to sign in on the browser opened on the
 * previous one's space, under the previous one's principal.
 *
 * Two kinds of state, forgotten two ways:
 *
 * - what is persisted is removed **by name**, whether or not the module that
 *   wrote it was loaded in this page — a store nobody imported still left its
 *   key behind;
 * - what is only in memory is reset by the store that holds it, which
 *   registers how. Nothing here imports a store, so no import cycle can form.
 *
 * And a guard for the session that never ended — the tab closed without
 * signing out: the browser remembers whose state it holds, and the next person
 * to sign in forgets it first.
 *
 * @module state/sessionEnd
 */

/** Cookies a session writes. */
export const SESSION_COOKIES: readonly string[] = [
  'datalayer-space-context',
  'datalayer-principal-context',
  'datalayer-billing-entity-uid',
  'otel_sql_history',
];

/** `localStorage` keys a session writes. */
export const SESSION_LOCAL_STORAGE_KEYS: readonly string[] = [
  'datalayer-principal',
  'datalayer-billing-entity',
  'datalayer-simple-auth',
];

/** Whose state the browser holds: the uid of the person it belongs to. */
export const SESSION_OWNER_KEY = 'datalayer-session-owner';

/** What a module keeps for a session. */
export type SessionStateRegistration = {
  /** Reset what the module holds in memory. */
  forget?: () => void;
  cookies?: readonly string[];
  localStorageKeys?: readonly string[];
  sessionStorageKeys?: readonly string[];
};

const registrations = new Set<SessionStateRegistration>();

/**
 * Say what a module keeps for a session, so the end of the session forgets it.
 *
 * @returns A function that withdraws the registration.
 */
export const registerSessionState = (
  registration: SessionStateRegistration,
): (() => void) => {
  registrations.add(registration);
  return () => {
    registrations.delete(registration);
  };
};

const storageOf = (
  kind: 'localStorage' | 'sessionStorage',
): Storage | undefined => {
  try {
    return typeof window === 'undefined' ? undefined : window[kind];
  } catch {
    // A browser that refuses its storage has nothing in it to forget.
    return undefined;
  }
};

const removeFrom = (storage: Storage | undefined, key: string): void => {
  try {
    storage?.removeItem(key);
  } catch {
    // Nothing to forget.
  }
};

const deleteCookie = (name: string): void => {
  if (typeof document === 'undefined') {
    return;
  }
  document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`;
};

const readCookie = (name: string): string | undefined => {
  if (typeof document === 'undefined') {
    return undefined;
  }
  const prefix = `${name}=`;
  const entry = document.cookie
    .split(';')
    .map(part => part.trim())
    .find(part => part.startsWith(prefix));
  return entry ? entry.slice(prefix.length) : undefined;
};

/** Forget everything a session left in this browser. */
export const forgetSessionState = (): void => {
  const cookies = new Set<string>(SESSION_COOKIES);
  const local = new Set<string>([
    ...SESSION_LOCAL_STORAGE_KEYS,
    SESSION_OWNER_KEY,
  ]);
  const session = new Set<string>();
  for (const registration of registrations) {
    try {
      registration.forget?.();
    } catch (error) {
      console.warn('A session state could not be reset.', error);
    }
    registration.cookies?.forEach(name => cookies.add(name));
    registration.localStorageKeys?.forEach(key => local.add(key));
    registration.sessionStorageKeys?.forEach(key => session.add(key));
  }
  cookies.forEach(deleteCookie);
  const localStorage = storageOf('localStorage');
  local.forEach(key => removeFrom(localStorage, key));
  const sessionStorage = storageOf('sessionStorage');
  session.forEach(key => removeFrom(sessionStorage, key));
};

/** The personal principal the principal cookie names, when it names one. */
const personalPrincipalInCookie = (): string | undefined => {
  const raw = readCookie('datalayer-principal-context');
  if (!raw) {
    return undefined;
  }
  try {
    const parsed = JSON.parse(decodeURIComponent(raw));
    return parsed?.selectedPrincipalKind === 'personal'
      ? String(parsed?.selectedPrincipalUid ?? '').trim() || undefined
      : undefined;
  } catch {
    return undefined;
  }
};

/**
 * Claim the browser's session state for the person signing in.
 *
 * When it holds somebody else's — a session that ended without signing out —
 * it is forgotten first. Somebody else's is known by the owner the browser
 * remembers or, before it remembered one, by a personal principal naming
 * another person. The state of an anonymous visitor belongs to nobody and is
 * kept: whoever started as a visitor keeps what they started.
 */
export const claimSessionState = (userUid: string | null | undefined): void => {
  const uid = String(userUid ?? '').trim();
  if (!uid) {
    return;
  }
  const localStorage = storageOf('localStorage');
  let owner: string | null = null;
  try {
    owner = localStorage?.getItem(SESSION_OWNER_KEY) ?? null;
  } catch {
    owner = null;
  }
  const principal = personalPrincipalInCookie();
  if ((owner && owner !== uid) || (!owner && principal && principal !== uid)) {
    forgetSessionState();
  }
  try {
    localStorage?.setItem(SESSION_OWNER_KEY, uid);
  } catch {
    // Nothing to remember it in.
  }
};
