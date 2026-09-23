/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Where the reader is, where they were, and where they left each shell.
 *
 * One store for navigation, in core, so every surface reads and writes the
 * same thing. It answers five questions that used to be four stores in the
 * landing and a handful of ad-hoc effects:
 *
 * - **the shell** — the platform Home, Agentify, or Admin;
 * - **the page each shell was left on**, so switching shells returns the
 *   reader to their work rather than to a landing page;
 *   {@link useNavigate} records it on every navigation;
 * - **the tab** last chosen in each tabbed view;
 * - **the route asked for** before signing in, to resume afterwards;
 * - **the address before the documentation**, for its way back.
 *
 * **Where each is kept.** The shell rides in a cookie, so it is sent with
 * every request and a server render can read it. The shells' last pages and
 * the tabs are in `localStorage`, which a cookie should not carry. The
 * requested route and the documentation's origin are memory only, on
 * purpose: a reload must forget the route asked for before signing in.
 *
 * Every read and write goes through the storage in a `try`: a browser that
 * refuses its storage forgets, and never throws into a render.
 *
 * @module state/substates/NavigationState
 */

import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';
import { registerSessionState } from '../sessionEnd';

/** The signed-in shell: the platform, the business cases, or the admin. */
export type NavigationView = 'home' | 'agentify' | 'admin';

/** The shells, and where each one opens when it has not been visited. */
export const NAVIGATION_VIEW_HOMES: Record<NavigationView, string> = {
  home: '/',
  agentify: '/agentify',
  admin: '/admin',
};

/** Well-known view identifiers for {@link NavigationState.tabsByView}. */
export const LIBRARY_VIEW = 'library';
export const AGENTS_VIEW = 'agents';
export const SETTINGS_VIEW = 'settings';
export const DATALAYER_VIEW = 'datalayer';
export const CONTENTS_VIEW = 'contents';
export const TUTOR_VIEW = 'tutor';

/** Where this store is kept, and what the landing kept it under before. */
const STORAGE_KEY = 'datalayer-navigation';
const SHELL_COOKIE = 'datalayer-signed-in-view';
const FORMER_TABS_KEY = 'datalayer_view_tabs';

/** Days a remembered shell lives in the cookie. */
const COOKIE_MAX_AGE_DAYS = 365;

export type NavigationState = {
  /** The shell the reader last chose. */
  view: NavigationView;
  /** State which shell is being shown. */
  setView: (view: NavigationView) => void;
  /** Swap the platform and the business cases. */
  toggleView: () => void;
  /** The page each shell was last on. */
  lastRouteByView: Partial<Record<NavigationView, string>>;
  /**
   * Remember a page as the current shell's, or as another's when told.
   *
   * Called by {@link useNavigate} for every navigation, which is what makes
   * this the one place the answer comes from.
   */
  rememberRoute: (route: string, view?: NavigationView) => void;
  /** Where a shell was left, or where it opens when it never was. */
  routeForView: (view: NavigationView) => string;
  /** Last selected tab, by view identifier. */
  tabsByView: Record<string, string>;
  /** Keep the tab a view was left on. */
  setViewTab: (view: string, tab: string) => void;
  /** The tab a view was left on, if any. */
  getViewTab: (view: string) => string | undefined;
  /**
   * The route a signed-out reader asked for, to resume after signing in.
   *
   * Never persisted: a reload must land on the default route, and the OAuth
   * round trip carries its target in `post_auth_redirect` instead.
   */
  requestedRoute?: string;
  setRequestedRoute: (route: string) => void;
  clearRequestedRoute: () => void;
  /** The address the reader was on before the documentation. */
  docsOrigin?: string;
  setDocsOrigin: (origin: string) => void;
};

/** What is written down between visits. */
type Persisted = {
  view?: NavigationView;
  lastRouteByView?: Partial<Record<NavigationView, string>>;
  tabsByView?: Record<string, string>;
};

const isView = (value: unknown): value is NavigationView =>
  value === 'home' || value === 'agentify' || value === 'admin';

function readCookie(name: string): string | undefined {
  if (typeof document === 'undefined') {
    return undefined;
  }
  const match = document.cookie
    .split('; ')
    .find(row => row.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : undefined;
}

function writeCookie(name: string, value: string): void {
  if (typeof document === 'undefined') {
    return;
  }
  const maxAge = COOKIE_MAX_AGE_DAYS * 24 * 60 * 60;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

function readLocal(name: string): string | null {
  try {
    return globalThis.localStorage?.getItem(name) ?? null;
  } catch {
    return null;
  }
}

/**
 * What the last visit left, from the two places it belongs in.
 *
 * The shell is taken from the cookie it has always used, so a reader who
 * chose Agentify before this store existed still finds it. The tabs kept
 * under the landing's former key are picked up once.
 */
function restore(): Persisted {
  let persisted: Persisted = {};
  const stored = readLocal(STORAGE_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored) as
        (Persisted & { state?: Persisted }) | null;
      // The landing kept this under the same key through zustand's
      // `persist`, which wraps what it writes in `{ state, version }`.
      persisted = parsed?.state ?? parsed ?? {};
    } catch {
      persisted = {};
    }
  } else {
    const former = readLocal(FORMER_TABS_KEY);
    if (former) {
      try {
        const { state } = JSON.parse(former) as {
          state?: { tabsByView?: Record<string, string> };
        };
        persisted = { tabsByView: state?.tabsByView ?? {} };
      } catch {
        persisted = {};
      }
    }
  }
  const shell = readCookie(SHELL_COOKIE);
  if (isView(shell)) {
    persisted.view = shell;
  }
  return persisted;
}

function persist(state: NavigationState): void {
  const written: Persisted = {
    view: state.view,
    lastRouteByView: state.lastRouteByView,
    tabsByView: state.tabsByView,
  };
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(written));
  } catch {
    /* the shells' pages are not remembered */
  }
  writeCookie(SHELL_COOKIE, state.view);
}

/**
 * Whether a page is worth remembering as a shell's.
 *
 * Not the sign-in pages, the OAuth callbacks or the documentation: coming
 * back to a shell should land on the work, not on the door the reader came
 * through or on a page that belongs to no shell.
 */
export function isRememberableRoute(route: string): boolean {
  if (!route.startsWith('/')) {
    return false;
  }
  const path = route.split('?')[0];
  return ![
    '/signin',
    '/signup',
    '/login',
    '/logout',
    '/oauth2',
    '/oauth',
    '/docs',
    '/join',
  ].some(prefix => path === prefix || path.startsWith(`${prefix}/`));
}

/**
 * The shell a route belongs to, read off its first segment.
 *
 * The store used to trust whatever `view` said when a route was recorded,
 * and `view` was only ever written by the header toggle. A reader who
 * reached Home through a sidebar link while the toggle still said Agentify
 * had their Home pages filed under Agentify — and the toggle, seeing
 * "Agentify" already chosen, did nothing when they clicked it.
 */
export function viewForRoute(route: string): NavigationView {
  const path = route.split('?')[0];
  if (path === '/agentify' || path.startsWith('/agentify/')) {
    return 'agentify';
  }
  if (path === '/admin' || path.startsWith('/admin/')) {
    return 'admin';
  }
  return 'home';
}

const initial = restore();

export const navigationStore = createStore<NavigationState>((set, get) => ({
  view: initial.view ?? 'home',
  lastRouteByView: initial.lastRouteByView ?? {},
  tabsByView: initial.tabsByView ?? {},
  requestedRoute: undefined,
  docsOrigin: undefined,
  setView: view => {
    set({ view });
    persist(get());
  },
  toggleView: () => {
    set(state => ({ view: state.view === 'home' ? 'agentify' : 'home' }));
    persist(get());
  },
  rememberRoute: (route, view) => {
    if (!isRememberableRoute(route)) {
      return;
    }
    // The route says which shell it belongs to; the caller may only insist
    // when it knows better. And being on a shell's page *is* being in that
    // shell, so the view follows.
    const shell = view ?? viewForRoute(route);
    // Told which shell, the caller is filing a page away, not going there.
    const follow = view === undefined;
    const current = get();
    if (
      current.lastRouteByView[shell] === route &&
      (!follow || current.view === shell)
    ) {
      return;
    }
    set(state => ({
      view: follow ? shell : state.view,
      lastRouteByView: { ...state.lastRouteByView, [shell]: route },
    }));
    persist(get());
  },
  routeForView: view => {
    // Only a page of that shell: an earlier version filed pages under the
    // shell the toggle named rather than the one the route belonged to, so a
    // reader can still have `/items` written down as Agentify's page. Going
    // "to Agentify" must never land on a Home page.
    const remembered = get().lastRouteByView[view];
    return remembered && viewForRoute(remembered) === view
      ? remembered
      : NAVIGATION_VIEW_HOMES[view];
  },
  setViewTab: (view, tab) => {
    if (get().tabsByView[view] === tab) {
      return;
    }
    set(state => ({ tabsByView: { ...state.tabsByView, [view]: tab } }));
    persist(get());
  },
  getViewTab: view => get().tabsByView[view],
  setRequestedRoute: route => set({ requestedRoute: route }),
  clearRequestedRoute: () => set({ requestedRoute: undefined }),
  setDocsOrigin: origin => set({ docsOrigin: origin }),
}));

// The pages each shell was left on, the tabs, the route asked for and the
// way back from the documentation belong to the person who was signed in:
// forgotten when the session ends. The shell itself stays — it is the
// browser's choice of surface, read by the anonymous landing too.
registerSessionState({
  forget: () => {
    navigationStore.setState({
      lastRouteByView: {},
      tabsByView: {},
      requestedRoute: undefined,
      docsOrigin: undefined,
    });
    persist(navigationStore.getState());
  },
  localStorageKeys: [FORMER_TABS_KEY],
});

/**
 * The hook, shaped like a `zustand` store created with `create`: callable
 * with or without a selector, and carrying `getState`, `setState` and
 * `subscribe` for the callers — a router guard, a test — that read it outside
 * a render.
 */
export interface UseNavigationStore {
  (): NavigationState;
  <T>(selector: (state: NavigationState) => T): T;
  getState: () => NavigationState;
  setState: typeof navigationStore.setState;
  subscribe: typeof navigationStore.subscribe;
}

function useNavigationState<T>(
  selector?: (state: NavigationState) => T,
): T | NavigationState {
  return useStore(
    navigationStore,
    selector ?? ((state: NavigationState) => state as unknown as T),
  );
}

export const useNavigationStore = Object.assign(useNavigationState, {
  getState: navigationStore.getState,
  setState: navigationStore.setState,
  subscribe: navigationStore.subscribe,
}) as UseNavigationStore;

export default useNavigationStore;
