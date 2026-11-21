/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * An API key's value, revealed on demand (the user, 21 November 2026): the
 * edit page fetches it only when the reveal eye or the copy icon is pressed,
 * never on load, and forgets it when the page is left. A failed update says
 * so instead of failing silently.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ThemeProvider } from '@primer/react';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

const VALUE = 'the-revealed-value';

const mocks = vi.hoisted(() => ({
  fetchValue: vi.fn(),
  resetValue: vi.fn(),
  update: vi.fn(),
  toast: vi.fn(),
  // One object across renders, as react-query hands back: a new one on each
  // render would set the page's state on each render, without end.
  key: {
    id: 'key-1',
    name: 'drill',
    description: 'a drill key',
    variant: 'secret',
    expirationDate: new Date('2027-01-01T00:00:00Z'),
  },
}));

vi.mock('../../../hooks', () => ({
  useNavigate: () => vi.fn(),
  useToast: () => ({ enqueueToast: mocks.toast }),
  useCache: () => ({
    useToken: () => ({ data: mocks.key }),
    useUpdateToken: () => ({ mutate: mocks.update }),
    useDeleteToken: () => ({ mutate: vi.fn() }),
    useTokenValue: () => ({
      mutateAsync: mocks.fetchValue,
      reset: mocks.resetValue,
    }),
  }),
}));

vi.mock('../../../state', () => ({
  useRunStore: () => ({
    layout: () => ({ showBackdrop: vi.fn(), hideBackdrop: vi.fn() }),
  }),
}));

vi.mock('../../../components/avatars', () => ({
  BoringAvatar: () => null,
}));

import { APIKeyEdit } from '../APIKeyEdit';

let container: HTMLDivElement;
let root: Root;

async function flush(): Promise<void> {
  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, 0));
  });
}

async function render(): Promise<void> {
  await act(async () => {
    root.render(
      <ThemeProvider>
        <MemoryRouter initialEntries={['/settings/api-keys/key-1']}>
          <Routes>
            <Route
              path="/settings/api-keys/:tokenId"
              element={<APIKeyEdit />}
            />
          </Routes>
        </MemoryRouter>
      </ThemeProvider>,
    );
  });
  await flush();
}

/** A button's name: its own label, or Primer's tooltip naming it. */
function nameOf(element: Element): string | null {
  const own = element.getAttribute('aria-label');
  if (own) {
    return own;
  }
  const id = element.getAttribute('aria-labelledby');
  return id ? (document.getElementById(id)?.textContent ?? null) : null;
}

function findButton(label: string): HTMLButtonElement | null {
  return (
    Array.from(container.querySelectorAll('button')).find(
      element => nameOf(element) === label,
    ) ?? null
  );
}

function button(label: string): HTMLButtonElement {
  const found = findButton(label);
  expect(found, label).not.toBeNull();
  return found!;
}

async function click(element: Element): Promise<void> {
  await act(async () => {
    element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  await flush();
}

/** The value field: the one read-only input of the page. */
function valueInput(): HTMLInputElement {
  return container.querySelector('input[readonly]') as HTMLInputElement;
}

describe('APIKeyEdit value', () => {
  beforeEach(() => {
    mocks.fetchValue.mockReset().mockResolvedValue(VALUE);
    mocks.resetValue.mockReset();
    mocks.update.mockReset();
    mocks.toast.mockReset();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('fetches nothing on load and shows the value masked', async () => {
    await render();
    expect(mocks.fetchValue).not.toHaveBeenCalled();
    const input = valueInput();
    expect(input.type).toBe('password');
    expect(input.value).toBe('');
    expect(container.innerHTML).not.toContain(VALUE);
  });

  it('reveals the value when the eye is pressed, and hides it again', async () => {
    await render();
    await click(button('Reveal API key'));
    expect(mocks.fetchValue).toHaveBeenCalledWith('key-1');
    expect(valueInput().type).toBe('text');
    expect(valueInput().value).toBe(VALUE);
    await click(button('Hide API key'));
    expect(valueInput().type).toBe('password');
    expect(valueInput().value).toBe('');
  });

  it('copies the value fetched on demand, with a tick and a toast', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    await render();
    await click(button('Copy API key'));
    expect(mocks.fetchValue).toHaveBeenCalledTimes(1);
    expect(writeText).toHaveBeenCalledWith(VALUE);
    expect(findButton('API key copied')).not.toBeNull();
    expect(mocks.toast).toHaveBeenCalledWith(
      'API key copied to the clipboard.',
      { variant: 'success' },
    );
    // Copied, not revealed.
    expect(valueInput().type).toBe('password');
  });

  it('says why when the value is refused', async () => {
    mocks.fetchValue.mockRejectedValue(
      new Error('Refused: an API key caller.'),
    );
    await render();
    await click(button('Reveal API key'));
    expect(mocks.toast).toHaveBeenCalledWith('Refused: an API key caller.', {
      variant: 'error',
    });
    expect(valueInput().type).toBe('password');
  });

  it('forgets the value when the page is left', async () => {
    await render();
    await click(button('Reveal API key'));
    expect(valueInput().value).toBe(VALUE);
    act(() => root.unmount());
    expect(mocks.resetValue).toHaveBeenCalled();
    root = createRoot(container);
    await render();
    expect(valueInput().value).toBe('');
  });

  it('has no native title on the value icons', async () => {
    await render();
    expect(button('Reveal API key').hasAttribute('title')).toBe(false);
    expect(button('Copy API key').hasAttribute('title')).toBe(false);
  });

  it('says so when the update fails', async () => {
    mocks.update.mockImplementation((_key, options) => {
      options.onError(new Error('Failed to update API key'));
      options.onSettled?.();
    });
    await render();
    await click(
      Array.from(container.querySelectorAll('button')).find(
        b => b.textContent === 'Update API key',
      )!,
    );
    expect(mocks.toast).toHaveBeenCalledWith('Failed to update API key', {
      variant: 'error',
    });
  });
});
