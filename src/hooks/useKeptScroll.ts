/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * A sidebar keeps its scroll across pages: an entry pressed far down the list
 * leaves the list where it was, so the next one is still under the pointer.
 *
 * `useKeptScroll(key)` returns a ref for a small element placed inside the
 * sidebar; the nearest ancestor that scrolls is the one kept. Its position is
 * remembered under `key` while it scrolls, and given back when a sidebar with
 * the same key is mounted again (a layout rendered anew by the next route).
 * The panel must not be one `useNavigate` brings to the top: it is not marked
 * `data-scroll-root`.
 *
 * @module hooks/useKeptScroll
 */

import { useLayoutEffect, useRef } from 'react';

const kept = new Map<string, number>();

const scrollsY = (element: HTMLElement): boolean => {
  const overflow = window.getComputedStyle(element).overflowY;
  return overflow === 'auto' || overflow === 'scroll';
};

/** The nearest ancestor of `marker` that scrolls vertically, if any. */
export function scrollingAncestor(
  marker: HTMLElement | null,
): HTMLElement | null {
  let element = marker?.parentElement ?? null;
  while (element && !scrollsY(element)) {
    element = element.parentElement;
  }
  return element;
}

/** Where the sidebar kept under `key` was last scrolled to, if it was. */
export const keptScrollOf = (key: string): number | undefined => kept.get(key);

export function useKeptScroll<T extends HTMLElement = HTMLElement>(
  key: string,
) {
  const ref = useRef<T | null>(null);
  useLayoutEffect(() => {
    const panel = scrollingAncestor(ref.current);
    if (!panel) {
      return;
    }
    const saved = kept.get(key);
    if (saved !== undefined) {
      panel.scrollTop = saved;
    }
    const remember = () => kept.set(key, panel.scrollTop);
    panel.addEventListener('scroll', remember, { passive: true });
    return () => {
      remember();
      panel.removeEventListener('scroll', remember);
    };
  }, [key]);
  return ref;
}

export default useKeptScroll;
