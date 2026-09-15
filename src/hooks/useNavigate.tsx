/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Navigation for any host: React Router when the app runs under one, the
 * history API otherwise.
 *
 * One function, `navigate(to, …)`, with the click event as an optional second
 * argument. Pass it and a click behaves the way a browser link does: a plain
 * click navigates in place and stops the anchor's own navigation; a modifier
 * click (⌘, Ctrl, Shift, Alt) or a middle click opens the target in a new tab
 * — through the browser when the click was on a link to that target, through
 * `window.open` otherwise, so a button gets it too. `newTab` in the options
 * opens a new tab outright.
 *
 * @module hooks/useNavigate
 */

import { useCallback, useMemo } from 'react';
import { useLayoutStore } from '../state';
import { createNativeNavigate } from '../navigation/adapters/native';
// Import React Router hooks from our wrapper
import { useNavigateRR } from '../navigation/adapters/react-router';

export interface NavigateOptions {
  /** Replace the current history entry instead of pushing one. */
  replace?: boolean;
  /** History state to carry to the destination. */
  state?: unknown;
  /** Open the destination in a new tab and leave this one where it is. */
  newTab?: boolean;
  /** Scroll to the top on arrival; on by default. */
  scroll?: boolean;
  /**
   * Close the layout's side portals on the way; on by default. Only the
   * history API host has them.
   */
  resetPortals?: boolean;
}

/**
 * The part of a click (or a key press, from a menu) the hook looks at. A
 * structural type, so React's synthetic events and DOM events both fit.
 */
export interface NavigateEvent {
  preventDefault: () => void;
  metaKey?: boolean;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  button?: number;
  currentTarget?: unknown;
  target?: unknown;
}

export type NavigateTarget = string | number;

/**
 * The call shapes accepted, old and new:
 * - `navigate(to, options?)`
 * - `navigate(to, event, options?)`
 * - `navigate(to, event, resetPortals, options?)` (legacy)
 * - `navigate(to, resetPortals, options?)` (legacy)
 */
export type Navigate = (
  to: NavigateTarget,
  optionsOrEvent?: NavigateOptions | NavigateEvent | boolean,
  third?: boolean | NavigateOptions,
  fourth?: NavigateOptions,
) => void;

/** Whether `event` is a click meant to open a new tab or window. */
export function isNewTabClick(event: NavigateEvent): boolean {
  return (
    !!event.metaKey ||
    !!event.ctrlKey ||
    !!event.shiftKey ||
    !!event.altKey ||
    event.button === 1
  );
}

/** The absolute URL `to` names from the current page. */
const resolveUrl = (to: string): string =>
  new URL(to, window.location.href).href;

/** Open `to` in a new tab, without handing it this window. */
export function openInNewTab(to: string): void {
  window.open(resolveUrl(to), '_blank', 'noopener,noreferrer');
}

/**
 * Whether `event` happened on a link whose `href` already is `to`: then the
 * browser opens the new tab itself, and nothing needs doing.
 */
function isLinkTo(event: NavigateEvent, to: string): boolean {
  const origin = (event.currentTarget ?? event.target) as
    { closest?: (selector: string) => Element | null } | null | undefined;
  const anchor =
    origin && typeof origin.closest === 'function'
      ? origin.closest('a[href]')
      : null;
  if (!anchor) {
    return false;
  }
  try {
    return resolveUrl(anchor.getAttribute('href') ?? '') === resolveUrl(to);
  } catch {
    return false;
  }
}

const isEvent = (value: unknown): value is NavigateEvent =>
  !!value && typeof (value as NavigateEvent).preventDefault === 'function';

function parseCall(
  optionsOrEvent: NavigateOptions | NavigateEvent | boolean | undefined,
  third: boolean | NavigateOptions | undefined,
  fourth: NavigateOptions | undefined,
): { event?: NavigateEvent; options: NavigateOptions } {
  if (isEvent(optionsOrEvent)) {
    const options =
      typeof third === 'boolean'
        ? { resetPortals: third, ...(fourth ?? {}) }
        : { ...(third ?? {}), ...(fourth ?? {}) };
    return { event: optionsOrEvent, options };
  }
  if (typeof optionsOrEvent === 'boolean') {
    return {
      options: {
        resetPortals: optionsOrEvent,
        ...(typeof third === 'object' ? third : {}),
        ...(fourth ?? {}),
      },
    };
  }
  return { options: { ...(optionsOrEvent ?? {}) } };
}

export const useNavigate = (): Navigate => {
  const layoutStore = useLayoutStore();

  // Detect environment
  const isNextJs =
    typeof window !== 'undefined' && !!(window as any).__NEXT_DATA__;
  const isClient = typeof window !== 'undefined';

  // React Router's navigate when the app runs under a Router, else nothing.
  let rrNavigate: ReturnType<typeof useNavigateRR> | null = null;
  if (!isNextJs && useNavigateRR && isClient) {
    try {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      rrNavigate = useNavigateRR();
    } catch {
      // Not in a Router context
    }
  }

  const nativeNavigate = useMemo(() => createNativeNavigate(), []);

  return useCallback<Navigate>(
    (to, optionsOrEvent, third, fourth) => {
      if (typeof window === 'undefined') {
        return;
      }
      const { event, options } = parseCall(optionsOrEvent, third, fourth);

      // History navigation (e.g. -1 to go back).
      if (typeof to === 'number') {
        event?.preventDefault();
        if (rrNavigate) {
          rrNavigate(to);
        } else {
          window.history.go(to);
        }
        return;
      }

      // A new tab was asked for with the click. A link to that very place
      // gets it from the browser; a button, or a link elsewhere, from us.
      if (event && isNewTabClick(event)) {
        if (!isLinkTo(event, to)) {
          event.preventDefault();
          openInNewTab(to);
        }
        return;
      }
      if (options.newTab) {
        event?.preventDefault();
        openInNewTab(to);
        return;
      }

      event?.preventDefault();
      if (options.scroll !== false) {
        window.scrollTo(0, 0);
        document.body.scrollTop = 0;
      }

      if (rrNavigate) {
        rrNavigate(to, { replace: options.replace, state: options.state });
        return;
      }

      if (options.resetPortals !== false) {
        layoutStore.resetLeftPortal();
        layoutStore.resetRightPortal();
      }
      nativeNavigate(to, {
        replace: options.replace,
        state: options.state,
        scroll: options.scroll,
      });
    },
    [rrNavigate, nativeNavigate, layoutStore],
  );
};

export default useNavigate;
