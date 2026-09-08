/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Publishing an artifact, and every page that was already looking at it.
 *
 * `invalidateArtifactVisibility` runs after a publish and after a withdrawal,
 * and it names the right queries — the library listings, the spaces, and each
 * editor's own detail query. What it does *not* do is make them ask again.
 *
 * `invalidateQueries` refetches the **active** queries and leaves the rest
 * marked stale, which is the right default nearly everywhere and wrong in
 * this application: it builds its client with `refetchOnMount: false` (and
 * `DEFAULT_QUERY_OPTIONS` repeats it per query), so a query that mounts
 * holding stale data renders it and asks for nothing.
 *
 * The result is a publish that works exactly once. The editor you published
 * from is mounted, so its button flips; the notebooks table, the library, the
 * search page and the artifact's own page were not, so they keep the answer
 * they had — and when you come back to the editor, *it* is now the one that
 * was not mounted when you withdrew, and its button is wrong too.
 *
 * These tests run against the application's own query options, because the
 * defaults are the entire reason the bug exists.
 */

import { readFileSync } from 'fs';
import { join } from 'path';

import { QueryClient, QueryObserver } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/** What `landings/datalayer/ui` builds its client with. */
const appClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5,
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  });

/**
 * Read an artifact somewhere, leave that page, publish it, and come back —
 * which is the sequence that was broken.
 */
async function buttonAfterPublish(
  invalidate: (client: QueryClient) => void,
): Promise<unknown> {
  const client = appClient();
  let isPublic = false;

  const mount = () => {
    const observer = new QueryObserver(client, {
      queryKey: ['notebooks', 'detail', 'nb-1'],
      queryFn: async () => ({ public: isPublic }),
    });
    return { observer, stop: observer.subscribe(() => {}) };
  };

  // The editor is open, and says "Publish".
  const first = mount();
  await sleep(50);
  first.stop();

  // Published from somewhere else — a table, another tab, the public page.
  isPublic = true;
  invalidate(client);
  await sleep(80);

  // Back to the editor.
  const second = mount();
  await sleep(120);
  const data = second.observer.getCurrentResult().data;
  second.stop();
  return data;
}

describe('after an artifact is published', () => {
  it('a plain invalidation leaves the button saying the opposite', async () => {
    // Not an assertion about what should happen — a record of why the fix
    // exists. If this ever returns `{ public: true }`, the default behaviour
    // changed and `refetchType: 'all'` may no longer be needed.
    const data = await buttonAfterPublish(client => {
      client.invalidateQueries({ queryKey: ['notebooks', 'detail'] });
    });

    expect(data).toEqual({ public: false });
  });

  it('refetching everything tells every page what happened', async () => {
    const data = await buttonAfterPublish(client => {
      client.invalidateQueries({
        queryKey: ['notebooks', 'detail'],
        refetchType: 'all',
      });
    });

    expect(data).toEqual({ public: true });
  });

  it('reaches the listings a visitor comes back to', async () => {
    /*
     * The other half of the same failure: the notebooks table and the library
     * search are different query trees, mounted at different times, and none
     * of them is active at the moment of the mutation.
     */
    const client = appClient();
    let published = ['nb-1'];
    const keys = [
      ['items', 'search', 'library'],
      ['spaces', 'items', 'space-1'],
      ['notebooks', 'detail', 'nb-1'],
      // The table, which lists by space and shares no prefix with the detail
      // the editor reads — the half of this that was still broken.
      ['notebooks', 'space', 'space-1'],
    ];

    for (const queryKey of keys) {
      const observer = new QueryObserver(client, {
        queryKey,
        queryFn: async () => published,
      });
      const stop = observer.subscribe(() => {});
      await sleep(40);
      stop();
    }

    published = ['nb-1', 'nb-2'];
    for (const queryKey of [['items'], ['spaces'], ['notebooks']]) {
      client.invalidateQueries({ queryKey, refetchType: 'all' });
    }
    await sleep(150);

    for (const queryKey of keys) {
      expect(client.getQueryData(queryKey)).toEqual(['nb-1', 'nb-2']);
    }
  });

  it('leaves a notebook’s content where it is', async () => {
    /*
     * `model` is the notebook itself, megabytes of it, and it lives under
     * `detail(id)` — so refetching everything under `details()` would drag
     * every open notebook's content over the wire on every Publish. Whether
     * an artifact is public says nothing about what is in it, so the model
     * queries are held out by a predicate.
     */
    const client = appClient();
    let details = 0;
    let models = 0;
    const watch = (queryKey: unknown[], count: () => void) => {
      const observer = new QueryObserver(client, {
        queryKey,
        queryFn: async () => {
          count();
          return 'x';
        },
      });
      return observer.subscribe(() => {});
    };
    const stopDetail = watch(['notebooks', 'detail', 'nb-1'], () => {
      details += 1;
    });
    const stopModel = watch(['notebooks', 'detail', 'nb-1', 'model'], () => {
      models += 1;
    });
    await sleep(60);
    stopDetail();
    stopModel();
    expect([details, models]).toEqual([1, 1]);

    // The invalidation as `invalidateArtifactVisibility` performs it.
    client.invalidateQueries({
      queryKey: ['notebooks'],
      refetchType: 'all',
      predicate: query => query.queryKey[query.queryKey.length - 1] !== 'model',
    });
    await sleep(150);

    expect(details).toBe(2);
    expect(models).toBe(1);
  });
});

describe('the invalidation as it is actually written', () => {
  /*
   * The tests above are about TanStack's behaviour; this one is about ours.
   * Every one of them would keep passing against an
   * `invalidateArtifactVisibility` that had quietly lost its `refetchType`,
   * which is exactly the state this file was written to end.
   */
  const source = readFileSync(join(__dirname, '..', 'useCache.ts'), 'utf8');
  const body = source.slice(
    source.indexOf('const invalidateArtifactVisibility = () => {'),
  );
  const fn = body.slice(0, body.indexOf('\n  };') + 5);

  it('asks every query to fetch again, not only the watched ones', () => {
    expect(fn).toContain("const refetchType = 'all' as const;");
    // Each call has to carry it: one that does not is a whole family of
    // pages left stale.
    const calls = fn.match(/invalidateQueries\(\{/g) ?? [];
    expect(calls.length).toBeGreaterThanOrEqual(3);
    expect((fn.match(/refetchType/g) ?? []).length).toBe(calls.length + 1);
  });

  it('still spares the content of an open notebook', () => {
    expect(fn).toContain("!== 'model'");
  });

  it('reaches the tables, not only the editors', () => {
    // `details()` misses `bySpace`, which is what a table reads.
    expect(fn).toContain('queryKeys.notebooks.all()');
    expect(fn).not.toContain('.details()');
  });
});
