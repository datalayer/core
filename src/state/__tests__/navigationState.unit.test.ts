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

import { beforeEach, describe, expect, it } from 'vitest';
import { forgetSessionState } from '../sessionEnd';
import {
  NAVIGATION_VIEW_HOMES,
  isRememberableRoute,
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
    expect(routeForView('agentify')).toBe(NAVIGATION_VIEW_HOMES.agentify);
    expect(routeForView('admin')).toBe('/admin');
  });

  it('returns to the page a shell was left on', () => {
    const state = navigationStore.getState();
    state.rememberRoute('/settings/preferences');
    state.setView('agentify');
    state.rememberRoute('/agentify/tutor/lessons');
    expect(navigationStore.getState().routeForView('home')).toBe(
      '/settings/preferences',
    );
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
    expect(routeForView('home')).toBe('/');
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
