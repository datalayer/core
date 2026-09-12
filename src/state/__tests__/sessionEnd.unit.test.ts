/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Nothing one person's session left in the browser survives into the next.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  SESSION_OWNER_KEY,
  claimSessionState,
  forgetSessionState,
  registerSessionState,
} from '../sessionEnd';

const cookie = (name: string): string | undefined =>
  document.cookie
    .split(';')
    .map(part => part.trim())
    .find(part => part.startsWith(`${name}=`));

const setPrincipalCookie = (uid: string) => {
  document.cookie = `datalayer-principal-context=${encodeURIComponent(
    JSON.stringify({ selectedPrincipalKind: 'personal', selectedPrincipalUid: uid }),
  )}; path=/`;
};

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  for (const name of ['datalayer-space-context', 'datalayer-principal-context']) {
    document.cookie = `${name}=; path=/; max-age=0`;
  }
});

describe('the end of a session', () => {
  it('forgets what was persisted, by name, whoever wrote it', () => {
    document.cookie = 'datalayer-space-context=%7B%22id%22%3A%22s1%22%7D; path=/';
    setPrincipalCookie('user-1');
    localStorage.setItem('datalayer-principal', '{}');
    localStorage.setItem('datalayer-billing-entity', '{}');
    localStorage.setItem('datalayer-simple-auth', '{"token":"t"}');

    forgetSessionState();

    expect(cookie('datalayer-space-context')).toBeUndefined();
    expect(cookie('datalayer-principal-context')).toBeUndefined();
    expect(localStorage.getItem('datalayer-principal')).toBeNull();
    expect(localStorage.getItem('datalayer-billing-entity')).toBeNull();
    expect(localStorage.getItem('datalayer-simple-auth')).toBeNull();
  });

  it('resets what stores hold in memory, and what an application registered', () => {
    const forget = vi.fn();
    const unregister = registerSessionState({
      forget,
      localStorageKeys: ['app-last-view'],
      sessionStorageKeys: ['app-captures'],
    });
    localStorage.setItem('app-last-view', '/somewhere');
    sessionStorage.setItem('app-captures', '[]');

    forgetSessionState();

    expect(forget).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('app-last-view')).toBeNull();
    expect(sessionStorage.getItem('app-captures')).toBeNull();
    unregister();
  });

  it('keeps forgetting when one store fails to reset', () => {
    const after = vi.fn();
    const unregisterBroken = registerSessionState({
      forget: () => {
        throw new Error('broken');
      },
    });
    const unregisterAfter = registerSessionState({ forget: after });
    localStorage.setItem('datalayer-principal', '{}');
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    forgetSessionState();

    expect(after).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('datalayer-principal')).toBeNull();
    unregisterBroken();
    unregisterAfter();
  });
});

describe('signing in', () => {
  it('forgets what another person left without signing out', () => {
    const forget = vi.fn();
    const unregister = registerSessionState({ forget });
    localStorage.setItem(SESSION_OWNER_KEY, 'user-1');

    claimSessionState('user-2');

    expect(forget).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem(SESSION_OWNER_KEY)).toBe('user-2');
    unregister();
  });

  it('keeps the state of the same person', () => {
    const forget = vi.fn();
    const unregister = registerSessionState({ forget });
    localStorage.setItem(SESSION_OWNER_KEY, 'user-1');

    claimSessionState('user-1');

    expect(forget).not.toHaveBeenCalled();
    unregister();
  });

  it('forgets a principal naming somebody else, before the browser remembered an owner', () => {
    const forget = vi.fn();
    const unregister = registerSessionState({ forget });
    setPrincipalCookie('user-1');

    claimSessionState('user-2');

    expect(forget).toHaveBeenCalledTimes(1);
    unregister();
  });

  it('keeps what an anonymous visitor started', () => {
    const forget = vi.fn();
    const unregister = registerSessionState({ forget });

    claimSessionState('user-2');

    expect(forget).not.toHaveBeenCalled();
    expect(localStorage.getItem(SESSION_OWNER_KEY)).toBe('user-2');
    unregister();
  });
});
