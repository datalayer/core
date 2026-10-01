/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * The navigation store: where each shell was left, and what a session's end
 * forgets.
 *
 * Switching from Agentify back to Home should return the reader to the page
 * they left, which is only possible if every navigation was written down —
 * `useNavigate` does that through `rememberRoute`. And what was written down
 * belongs to the person who was signed in: the next person on the browser
 * must not open on their pages, while the shell itself — the browser's
 * choice of surface — may stay.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { forgetSessionState } from '../sessionEnd';
import {
  NAVIGATION_VIEW_HOMES,
  isRememberableRoute,
  isShellNeutralRoute,
  navigationStore,
  viewForRoute,
} from '../substates/NavigationState';

describe('where each shell was left', () => {
  beforeEach(() => {
    navigationStore.setState({
      view: 'home',
      lastRouteByView: {},
      tabsByView: {},
      requestedRoute: undefined,
      docsOrigin: undefined,
    });
  });

  it('opens a shell never visited on its home page', () => {
    const { routeForView } = navigationStore.getState();
    expect(routeForView('studio')).toBe('/studio');
    expect(routeForView('agentify')).toBe(NAVIGATION_VIEW_HOMES.agentify);
    expect(routeForView('admin')).toBe('/admin');
    // The Power shell's own address, not the root: the root is the Studio's.
    expect(routeForView('home')).toBe('/power');
  });

  it('files the Studio, and the root it opens on, under its own shell', () => {
    expect(viewForRoute('/')).toBe('studio');
    expect(viewForRoute('/?tab=recent')).toBe('studio');
    expect(viewForRoute('/studio')).toBe('studio');
    expect(viewForRoute('/studio/apps/new?from=template')).toBe('studio');
    expect(viewForRoute('/studios')).toBe('home');
    expect(viewForRoute('/settings/profile')).toBe('studio');
    expect(viewForRoute('/settingsx')).toBe('home');
    // The settings and the documentation belong to no shell: read from the
    // one the reader is in, they keep it.
    expect(isShellNeutralRoute('/settings/profile')).toBe(true);
    expect(isShellNeutralRoute('/docs/cli?x=1')).toBe(true);
    expect(isShellNeutralRoute('/docsx')).toBe(false);
    expect(viewForRoute('/settings/profile', 'home')).toBe('home');
    expect(viewForRoute('/docs/cli', 'agentify')).toBe('agentify');
    expect(viewForRoute('/docs', 'studio')).toBe('studio');
    // A shell's own page is its shell's, whatever the reader was in.
    expect(viewForRoute('/power', 'studio')).toBe('home');
    expect(viewForRoute('/studio/apps', 'home')).toBe('studio');
    // So neither is a page a shell returns to, nor one that moves the shell.
    expect(isRememberableRoute('/settings/profile')).toBe(false);
    expect(isRememberableRoute('/docs/cli')).toBe(false);
    // The agentspecs catalogue is read from the Studio, with its sidebar.
    expect(viewForRoute('/agentspecs')).toBe('studio');
    expect(viewForRoute('/agentspecs/skills')).toBe('studio');
    expect(viewForRoute('/agentspecsx')).toBe('home');
    expect(viewForRoute('/power')).toBe('home');
    expect(isRememberableRoute('/')).toBe(true);
    expect(isRememberableRoute('/power')).toBe(true);
    // Opening the root is being in the Studio, and coming back returns there.
    navigationStore.getState().rememberRoute('/');
    expect(navigationStore.getState().view).toBe('studio');
    expect(navigationStore.getState().routeForView('studio')).toBe('/');
  });

  it('returns to the page a shell was left on', () => {
    const state = navigationStore.getState();
    state.rememberRoute('/items');
    state.setView('agentify');
    state.rememberRoute('/agentify/tutor/lessons');
    expect(navigationStore.getState().routeForView('home')).toBe('/items');
    expect(navigationStore.getState().routeForView('agentify')).toBe(
      '/agentify/tutor/lessons',
    );
  });

  it('records a page against a shell it is told about', () => {
    navigationStore.getState().rememberRoute('/admin/users', 'admin');
    expect(navigationStore.getState().routeForView('admin')).toBe(
      '/admin/users',
    );
    expect(navigationStore.getState().view).toBe('home');
  });

  it('files a page under the shell its route names, and moves the view there', () => {
    // The toggle said Agentify; the reader went Home through a sidebar link.
    navigationStore.getState().setView('agentify');
    navigationStore.getState().rememberRoute('/items');
    const state = navigationStore.getState();
    expect(state.view).toBe('home');
    expect(state.lastRouteByView.home).toBe('/items');
    expect(state.lastRouteByView.agentify).toBeUndefined();
    // So the toggle can take them to Agentify: it is not "already there".
    expect(viewForRoute('/agentify/tutor?tab=home')).toBe('agentify');
    expect(viewForRoute('/admin/users')).toBe('admin');
    expect(viewForRoute('/agentifyx')).toBe('home');
  });

  it('never sends a shell to a page that is not its own', () => {
    // What an earlier version could leave behind.
    navigationStore.setState({
      lastRouteByView: { agentify: '/items', home: '/agentify/tutor' },
    });
    const { routeForView } = navigationStore.getState();
    expect(routeForView('agentify')).toBe('/agentify');
    expect(routeForView('home')).toBe('/power');
  });

  it('never sends Power to the root, which is the Studio', () => {
    // The Power shell's page, before it had `/power`.
    navigationStore.setState({ lastRouteByView: { home: '/' } });
    expect(navigationStore.getState().routeForView('home')).toBe('/power');
    navigationStore.setState({ lastRouteByView: { home: '/?tab=recent' } });
    expect(navigationStore.getState().routeForView('home')).toBe('/power');
  });

  it('does not remember the doors: sign-in, OAuth callbacks, the documentation', () => {
    expect(isRememberableRoute('/signin')).toBe(false);
    expect(isRememberableRoute('/oauth2/github/callback')).toBe(false);
    expect(isRememberableRoute('/docs/agentify')).toBe(false);
    expect(isRememberableRoute('/join/acme')).toBe(false);
    expect(isRememberableRoute('https://elsewhere.example/')).toBe(false);
    expect(isRememberableRoute('/agentify/tutor?tab=home')).toBe(true);
    navigationStore.getState().rememberRoute('/signin');
    expect(navigationStore.getState().lastRouteByView.home).toBeUndefined();
  });
});

describe('the end of a session', () => {
  it('forgets the pages, the tabs and the route asked for, but not the shell', () => {
    const state = navigationStore.getState();
    state.setView('agentify');
    state.rememberRoute('/agentify/tutor');
    state.setViewTab('tutor', 'lessons');
    state.setRequestedRoute('/library');
    state.setDocsOrigin('/agentify');

    forgetSessionState();

    const after = navigationStore.getState();
    expect(after.view).toBe('agentify');
    expect(after.lastRouteByView).toEqual({});
    expect(after.tabsByView).toEqual({});
    expect(after.requestedRoute).toBeUndefined();
    expect(after.docsOrigin).toBeUndefined();
    expect(after.routeForView('agentify')).toBe('/agentify');
  });
});

/**
 * What the store opens on is decided once, when the module is first read —
 * so each case here reads it afresh, over the storage a browser would hold.
 */
describe('what the last visit left', () => {
  const SHELL_COOKIE = 'datalayer-signed-in-view';
  const STORAGE_KEY = 'datalayer-navigation';

  const forgetBrowser = () => {
    document.cookie = `${SHELL_COOKIE}=; path=/; max-age=0`;
    localStorage.clear();
  };

  const open = async () => {
    vi.resetModules();
    const module = await import('../substates/NavigationState');
    return module.navigationStore.getState();
  };

  beforeEach(forgetBrowser);
  afterEach(forgetBrowser);

  it('opens on the Studio for a reader who never chose a shell', async () => {
    const state = await open();
    expect(state.view).toBe('studio');
    expect(state.routeForView(state.view)).toBe('/studio');
    expect(state.lastRouteByView).toEqual({});
  });

  it('honours the shell a cookie from before the Studio names', async () => {
    document.cookie = `${SHELL_COOKIE}=home; path=/`;
    const state = await open();
    expect(state.view).toBe('home');
    expect(state.routeForView(state.view)).toBe('/power');
  });

  it('keeps the other shells a cookie names, and ignores one it does not know', async () => {
    document.cookie = `${SHELL_COOKIE}=agentify; path=/`;
    expect((await open()).view).toBe('agentify');
    document.cookie = `${SHELL_COOKIE}=power; path=/`;
    expect((await open()).view).toBe('studio');
  });

  it('drops the root an earlier version wrote down as the Power shell page', async () => {
    document.cookie = `${SHELL_COOKIE}=home; path=/`;
    // As zustand's `persist` wrote it, when the landing kept this store.
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        state: {
          lastRouteByView: {
            home: '/',
            agentify: '/agentify/tutor',
            admin: '/items',
            elsewhere: '/settings',
          },
          tabsByView: { library: 'featured' },
        },
        version: 0,
      }),
    );
    const state = await open();
    expect(state.view).toBe('home');
    // The root, a page filed under the wrong shell and a shell that does not
    // exist are gone from the store itself, so no later write puts them back.
    expect(state.lastRouteByView).toEqual({ agentify: '/agentify/tutor' });
    expect(state.routeForView('home')).toBe('/power');
    expect(state.routeForView('admin')).toBe('/admin');
    expect(state.tabsByView).toEqual({ library: 'featured' });

    state.setViewTab('library', 'recent');
    const written = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
    expect(written.lastRouteByView).toEqual({ agentify: '/agentify/tutor' });
  });

  it('reads storage it cannot make sense of as nothing remembered', async () => {
    document.cookie = `${SHELL_COOKIE}=home; path=/`;
    for (const stored of ['5', 'null', '"text"', '{"state":7}', 'not json']) {
      localStorage.setItem(STORAGE_KEY, stored);
      const state = await open();
      expect(state.view).toBe('home');
      expect(state.lastRouteByView).toEqual({});
    }
    forgetBrowser();
    localStorage.setItem(STORAGE_KEY, '{"lastRouteByView":"/studio"}');
    expect((await open()).view).toBe('studio');
  });
});

describe('a shell-neutral page keeps the shell the reader is in', () => {
  it('does not move the shell, nor become the page a shell returns to', () => {
    const store = navigationStore;
    store.getState().rememberRoute('/power');
    expect(store.getState().view).toBe('home');
    store.getState().rememberRoute('/settings/profile');
    store.getState().rememberRoute('/docs/cli');
    expect(store.getState().view).toBe('home');
    expect(store.getState().routeForView('home')).toBe('/power');
    expect(store.getState().routeForView('studio')).not.toMatch(
      /^\/(settings|docs)/,
    );
  });
});
