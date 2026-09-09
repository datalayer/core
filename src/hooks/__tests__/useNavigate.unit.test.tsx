/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * A link made with `useNavigate` behaves like a browser link.
 *
 * A plain click navigates in place. A modifier click asks for a new tab:
 * on a link to the destination the browser provides it, so the hook must
 * step aside; on a button there is no link, so the hook opens the tab
 * itself. That second case is the one that used to be swallowed.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { MemoryRouter, useLocation } from 'react-router-dom';

vi.mock('../../state', () => ({
  useLayoutStore: () => ({
    resetLeftPortal: () => {},
    resetRightPortal: () => {},
  }),
}));

import { useNavigate } from '../useNavigate';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;
let openSpy: ReturnType<typeof vi.spyOn>;

function Probe() {
  const navigate = useNavigate();
  const location = useLocation();
  return (
    <>
      <a href="/docs" id="link" onClick={e => navigate('/docs', e)}>
        docs
      </a>
      <button id="button" onClick={e => navigate('/docs', e)}>
        docs
      </button>
      <button id="new-tab" onClick={() => navigate('/docs', { newTab: true })}>
        new tab
      </button>
      <button
        id="legacy"
        onClick={e => navigate('/legacy', e, false, { replace: true })}
      >
        legacy
      </button>
      <span id="where">{location.pathname}</span>
    </>
  );
}

const where = () => container.querySelector('#where')?.textContent;

// What the hook left of the click by the time it reached the document: the
// listener runs after React's, records it, then stops jsdom from following
// the link (it cannot navigate, and says so loudly).
let leftToBrowser: boolean | undefined;
const recorder = (event: Event) => {
  leftToBrowser = !event.defaultPrevented;
  event.preventDefault();
};

function click(selector: string, init: MouseEventInit = {}): void {
  leftToBrowser = undefined;
  act(() => {
    container.querySelector(selector)!.dispatchEvent(
      new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        button: 0,
        ...init,
      }),
    );
  });
}

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  document.addEventListener('click', recorder);
  root = createRoot(container);
  openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
  // jsdom implements neither.
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  act(() => {
    root.render(
      <MemoryRouter initialEntries={['/']}>
        <Probe />
      </MemoryRouter>,
    );
  });
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  document.removeEventListener('click', recorder);
  vi.restoreAllMocks();
});

describe('useNavigate with the click event', () => {
  it('navigates in place on a plain click and stops the link', () => {
    click('#link');
    expect(where()).toBe('/docs');
    expect(leftToBrowser).toBe(false);
    expect(openSpy).not.toHaveBeenCalled();
  });

  it('lets the browser open a new tab from a link on a modifier click', () => {
    click('#link', { ctrlKey: true });
    expect(where()).toBe('/');
    expect(leftToBrowser).toBe(true);
    expect(openSpy).not.toHaveBeenCalled();
  });

  it('opens a new tab itself from a button on a modifier click', () => {
    click('#button', { metaKey: true });
    expect(where()).toBe('/');
    expect(leftToBrowser).toBe(false);
    expect(openSpy).toHaveBeenCalledWith(
      new URL('/docs', window.location.href).href,
      '_blank',
      'noopener,noreferrer',
    );
  });

  it('opens a new tab when asked for one in the options', () => {
    click('#new-tab');
    expect(where()).toBe('/');
    expect(openSpy).toHaveBeenCalledTimes(1);
  });

  it('still takes the legacy (event, resetPortals, options) shape', () => {
    click('#legacy');
    expect(where()).toBe('/legacy');
  });
});
