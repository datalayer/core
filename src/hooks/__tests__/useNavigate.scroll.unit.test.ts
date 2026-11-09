/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Where a navigation lands (the user, 6 November 2026): the top of the page
 * and of every `data-scroll-root` panel by default, an element by its id
 * when one is named, nowhere when `false`.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { scrollOnArrival } from '../useNavigate';

describe('scrollOnArrival', () => {
  let panel: HTMLDivElement;
  let scrolled: number;

  beforeEach(() => {
    vi.useFakeTimers();
    scrolled = 0;
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {
      scrolled += 1;
    });
    panel = document.createElement('div');
    panel.setAttribute('data-scroll-root', '');
    document.body.appendChild(panel);
    panel.scrollTop = 240;
  });

  afterEach(() => {
    panel.remove();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('scrolls the page and every marked panel to the top by default, now and on the next frames', () => {
    scrollOnArrival(undefined);
    expect(scrolled).toBe(1);
    expect(panel.scrollTop).toBe(0);
    panel.scrollTop = 120;
    vi.runAllTimers();
    expect(panel.scrollTop).toBe(0);
    expect(scrolled).toBe(3);
  });

  it('scrolls a pane marked by its class too: Primer’s PageLayout.Content passes no data attribute', () => {
    const pane = document.createElement('div');
    pane.className = 'dla-scroll-root';
    document.body.appendChild(pane);
    pane.scrollTop = 300;
    scrollOnArrival(undefined);
    expect(pane.scrollTop).toBe(0);
    pane.remove();
  });

  it('leaves the scroll alone when told false', () => {
    scrollOnArrival(false);
    vi.runAllTimers();
    expect(scrolled).toBe(0);
    expect(panel.scrollTop).toBe(240);
  });

  it('scrolls an element into view by its id, waiting for the page to have it', () => {
    const into = vi.fn();
    scrollOnArrival('#proofs');
    vi.advanceTimersByTime(100);
    const target = document.createElement('section');
    target.id = 'proofs';
    target.scrollIntoView = into;
    document.body.appendChild(target);
    vi.runAllTimers();
    expect(into).toHaveBeenCalledWith({ block: 'start' });
    expect(scrolled).toBe(0);
    target.remove();
  });

  it('gives up on an id the page never shows', () => {
    scrollOnArrival('nowhere');
    vi.runAllTimers();
    expect(scrolled).toBe(0);
  });
});
