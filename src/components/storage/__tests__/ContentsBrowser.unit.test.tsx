/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import type { Contents } from '@jupyterlab/services';
import { ThemeProvider } from '@primer/react';
import { ContentsBrowser, IContentsBrowserProps } from '../ContentsBrowser';
import { CONTENTS_BROWSER_MOCK_MANAGER } from '../ContentsBrowserMock';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

// jsdom has no ResizeObserver; Primer's Table observes cell overflow.
class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
(globalThis as any).ResizeObserver ??= ResizeObserverStub;

let container: HTMLDivElement;
let root: Root;

async function flush(): Promise<void> {
  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, 0));
  });
}

async function render(props: IContentsBrowserProps = {}): Promise<void> {
  await act(async () => {
    root.render(
      <ThemeProvider>
        <ContentsBrowser mock {...props} />
      </ThemeProvider>,
    );
  });
  await flush();
}

async function click(element: Element | null): Promise<void> {
  expect(element).not.toBeNull();
  await act(async () => {
    element!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  await flush();
}

function rowNames(): string[] {
  return Array.from(container.querySelectorAll('tbody tr')).map(
    row => row.firstElementChild?.textContent?.trim() ?? '',
  );
}

function rowNamed(name: string): Element | null {
  return (
    Array.from(container.querySelectorAll('tbody tr')).find(
      row => row.firstElementChild?.textContent?.trim() === name,
    ) ?? null
  );
}

function pathBar(): Element | null {
  return container.querySelector('[role="navigation"]');
}

function pathSegments(): Element[] {
  return Array.from(pathBar()?.querySelectorAll('button') ?? []);
}

function toggle(label: string): Element | null {
  return container.querySelector(`button[aria-label="${label}"]`);
}

describe('ContentsBrowser views', () => {
  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it('renders the tree by default and switches to the table', async () => {
    const onViewChange = vi.fn();
    await render({ onViewChange });
    expect(container.querySelector('[role="tree"]')).not.toBeNull();
    expect(container.querySelector('table')).toBeNull();

    await click(toggle('Table view'));
    expect(container.querySelector('[role="tree"]')).toBeNull();
    expect(rowNames()).toEqual(['data', 'environment', 'workspace']);
    expect(onViewChange).toHaveBeenCalledWith('table');

    await click(toggle('Tree view'));
    expect(container.querySelector('[role="tree"]')).not.toBeNull();
    expect(container.querySelector('table')).toBeNull();
    expect(onViewChange).toHaveBeenLastCalledWith('tree');
  });

  it('honours the view prop', async () => {
    await render({ view: 'table' });
    expect(container.querySelector('[role="tree"]')).toBeNull();
    expect(rowNames()).toEqual(['data', 'environment', 'workspace']);
  });

  it('navigates into folders and back up with ..', async () => {
    await render({ view: 'table' });
    // No parent row at the root.
    expect(rowNames()).not.toContain('..');

    await click(rowNamed('workspace'));
    expect(rowNames()).toEqual([
      '..',
      'results',
      'analysis.ipynb',
      'prepare_data.py',
    ]);

    await click(rowNamed('results'));
    expect(rowNames()).toEqual(['..', 'summary.parquet']);

    await click(rowNamed('..'));
    expect(rowNames()).toEqual([
      '..',
      'results',
      'analysis.ipynb',
      'prepare_data.py',
    ]);

    await click(rowNamed('..'));
    expect(rowNames()).toEqual(['data', 'environment', 'workspace']);
  });

  it('shows a spinner while a folder is loading', async () => {
    const pending: { path: string; resolve: (model: unknown) => void }[] = [];
    const contents = {
      serverSettings: { appUrl: 'mock://deferred/' },
      get: (path: string) =>
        new Promise(resolve => {
          pending.push({ path, resolve });
        }),
    } as unknown as Contents.IManager;
    const settle = async () => {
      for (const request of pending.splice(0)) {
        request.resolve(await CONTENTS_BROWSER_MOCK_MANAGER.get(request.path));
      }
      await flush();
    };
    const spinner = () =>
      container.querySelector('[aria-label="Loading folder…"]');

    await render({ view: 'table', contents });
    await settle();
    expect(spinner()).toBeNull();
    expect(rowNames()).toEqual(['data', 'environment', 'workspace']);

    await click(rowNamed('workspace'));
    // The folder is still loading: the rows are replaced by a spinner and the
    // breadcrumb already points at the destination.
    expect(spinner()).not.toBeNull();
    expect(container.querySelector('table')).toBeNull();
    expect(pathSegments().map(a => a.textContent?.trim())).toEqual([
      '/',
      'workspace',
    ]);

    await settle();
    expect(spinner()).toBeNull();
    expect(rowNames()).toEqual([
      '..',
      'results',
      'analysis.ipynb',
      'prepare_data.py',
    ]);

    // Activating the current segment reloads the folder.
    await click(pathSegments()[1]);
    expect(spinner()).not.toBeNull();
    expect(pending.map(request => request.path)).toEqual(['workspace']);
    await settle();
    expect(spinner()).toBeNull();
    expect(rowNames()).toEqual([
      '..',
      'results',
      'analysis.ipynb',
      'prepare_data.py',
    ]);
  });

  it('jumps to an ancestor from the breadcrumb', async () => {
    await render({ view: 'table' });
    await click(rowNamed('data'));
    await click(rowNamed('earth-observation'));
    expect(rowNames()).toEqual(['..', 'manifest.json', 'observations.parquet']);

    const crumbs = pathSegments();
    expect(crumbs.map(a => a.textContent?.trim())).toEqual([
      '/',
      'data',
      'earth-observation',
    ]);
    // A single leading slash: the root link doubles as the path root.
    expect(pathBar()?.textContent).toBe('/data/earth-observation');
    expect(crumbs[2].getAttribute('aria-current')).toBe('location');
    await click(crumbs[1]);
    expect(rowNames()).toEqual(['..', 'earth-observation', 'model-artifacts']);
  });
});
