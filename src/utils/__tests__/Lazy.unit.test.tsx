/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import React, { Suspense, act, useEffect, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { lazyWithPreload } from '../Lazy';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

async function flush(): Promise<void> {
  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, 0));
  });
}

/** A lazy component that counts its module fetches and its mounts. */
function counting() {
  const counts = { factory: 0, mounts: 0 };
  function Target({ label }: { label: string }) {
    useEffect(() => {
      counts.mounts += 1;
    }, []);
    return <span>{label}</span>;
  }
  const Lazy = lazyWithPreload(async () => {
    counts.factory += 1;
    return { default: Target };
  });
  return { counts, Lazy };
}

describe('lazyWithPreload', () => {
  it('fetches nothing until it renders or is preloaded', async () => {
    const { counts } = counting();
    await flush();
    expect(counts.factory).toBe(0);
  });

  it('fetches once when preloaded, then rendered', async () => {
    const { counts, Lazy } = counting();
    await Lazy.preload();
    await act(async () => {
      root.render(
        <Suspense fallback="loading">
          <Lazy label="a" />
        </Suspense>,
      );
    });
    await flush();
    expect(container.textContent).toBe('a');
    expect(counts.factory).toBe(1);
  });

  it('renders a preloaded component without its fallback', async () => {
    const { Lazy } = counting();
    await Lazy.preload();
    await act(async () => {
      root.render(
        <Suspense fallback="loading">
          <Lazy label="now" />
        </Suspense>,
      );
    });
    expect(container.textContent).toBe('now');
  });

  it('does not remount a mounted component when preloaded afterwards', async () => {
    const { counts, Lazy } = counting();
    let setLabel: (label: string) => void = () => undefined;
    function Host() {
      const [label, set] = useState('first');
      setLabel = set;
      return (
        <Suspense fallback="loading">
          <Lazy label={label} />
        </Suspense>
      );
    }
    await act(async () => {
      root.render(<Host />);
    });
    await flush();
    expect(container.textContent).toBe('first');
    expect(counts.mounts).toBe(1);

    await act(async () => {
      await Lazy.preload();
    });
    await act(async () => {
      setLabel('second');
    });
    expect(container.textContent).toBe('second');
    expect(counts.mounts).toBe(1);
    expect(counts.factory).toBe(1);
  });

  it('tries again after a failed fetch', async () => {
    let attempts = 0;
    const Lazy = lazyWithPreload(async () => {
      attempts += 1;
      if (attempts === 1) {
        throw new Error('offline');
      }
      return { default: () => <span>ok</span> };
    });
    await expect(Lazy.preload()).rejects.toThrow('offline');
    await expect(Lazy.preload()).resolves.toBeUndefined();
    expect(attempts).toBe(2);
  });
});
