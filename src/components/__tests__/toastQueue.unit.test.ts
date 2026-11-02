/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { describe, expect, it } from 'vitest';
import { defaultAutoClose, toastQueue } from '../toast/toastQueue';

describe('the toasts shown outside JupyterLab', () => {
  it('are queued in order, the first shown, and dismissed one at a time or all', () => {
    toastQueue.dismiss();
    const seen: number[] = [];
    const stop = toastQueue.subscribe(() =>
      seen.push(toastQueue.snapshot().length),
    );
    const first = toastQueue.push({
      variant: 'info',
      message: 'Saved',
      autoClose: 5000,
    });
    const second = toastQueue.push({
      variant: 'error',
      message: 'Could not run',
      autoClose: false,
    });
    expect(toastQueue.snapshot().map(toast => toast.id)).toEqual([
      first,
      second,
    ]);
    toastQueue.update(second, { message: 'Could not run: no credits' });
    expect(toastQueue.snapshot()[1].message).toBe('Could not run: no credits');
    toastQueue.dismiss(first);
    expect(toastQueue.snapshot().map(toast => toast.id)).toEqual([second]);
    toastQueue.dismiss();
    expect(toastQueue.snapshot()).toEqual([]);
    expect(seen).toEqual([1, 2, 2, 1, 0]);
    stop();
  });

  it('go on their own when they inform, and stay when they warn', () => {
    expect(defaultAutoClose('info')).toBe(5000);
    expect(defaultAutoClose('success')).toBe(5000);
    expect(defaultAutoClose('warning')).toBe(false);
    expect(defaultAutoClose('error')).toBe(false);
  });
});
