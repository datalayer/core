/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ToastPanel } from '../toast/ToastPanel';
import { toastQueue } from '../toast/toastQueue';

describe('a toast with a technical detail', () => {
  afterEach(() => {
    act(() => toastQueue.dismiss());
    cleanup();
  });

  it('draws the detail apart from the message, in monospace', () => {
    render(<ToastPanel />);
    act(() => {
      toastQueue.push({
        variant: 'error',
        message: 'The apps could not be listed.',
        detail: '503 Service Unavailable',
        autoClose: false,
      });
    });
    expect(screen.getByText('The apps could not be listed.')).toBeTruthy();
    const detail = document.querySelector('[data-toast-detail]');
    expect(detail?.tagName).toBe('PRE');
    expect(detail?.textContent).toBe('503 Service Unavailable');
  });

  it('draws no detail block for a toast without one', () => {
    render(<ToastPanel />);
    act(() => {
      toastQueue.push({ variant: 'info', message: 'Saved.', autoClose: false });
    });
    expect(screen.getByText('Saved.')).toBeTruthy();
    expect(document.querySelector('[data-toast-detail]')).toBeNull();
  });

  it('shows a detail given later, on the same toast', () => {
    render(<ToastPanel />);
    let id = '';
    act(() => {
      id = toastQueue.push({
        variant: 'error',
        message: 'It failed.',
        autoClose: false,
      });
    });
    expect(document.querySelector('[data-toast-detail]')).toBeNull();
    act(() => toastQueue.update(id, { detail: 'TypeError: x is undefined' }));
    expect(document.querySelector('[data-toast-detail]')?.textContent).toBe(
      'TypeError: x is undefined',
    );
  });
});
