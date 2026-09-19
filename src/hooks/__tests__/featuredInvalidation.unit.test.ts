/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * What an administrator changes has to reach the page a visitor is on.
 *
 * The ribbon on the home page is a different query from the list on
 * `/admin/library/featured`, and only one of them is mounted while somebody
 * is reordering it. A plain `invalidateQueries` refetches the mounted one and
 * leaves the other to refetch when it is next mounted — which is the right
 * default nearly everywhere, and wrong here, because this app builds its
 * `QueryClient` with `refetchOnMount: false`. A query that mounts holding
 * stale data renders it and asks for nothing.
 *
 * So the ribbon kept its old order until the whole page was reloaded. These
 * tests are about the difference between the two invalidations, against the
 * app's own client options — the defaults are the whole reason the bug
 * exists, so a test with different ones would prove nothing.
 */

import { QueryClient, QueryObserver } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/** The options `landings/datalayer/ui` builds its client with. */
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
 * Read the ribbon, navigate away, let an administrator change it, then come
 * back — which is the sequence that was broken.
 */
async function ribbonAfterInvalidation(
  invalidate: (client: QueryClient) => Promise<void>,
): Promise<unknown> {
  const client = appClient();
  let order = ['first', 'second'];

  const mount = () => {
    const observer = new QueryObserver(client, {
      queryKey: ['items', 'featured', 12],
      queryFn: async () => order,
    });
    return { observer, stop: observer.subscribe(() => {}) };
  };

  // A visitor sees the ribbon, then goes somewhere else.
  const first = mount();
  await sleep(50);
  first.stop();

  // The administrator reorders it. The ribbon is not mounted.
  order = ['second', 'first'];
  await invalidate(client);
  await sleep(80);

  // Back to the home page.
  const second = mount();
  await sleep(120);
  const data = second.observer.getCurrentResult().data;
  second.stop();
  return data;
}

describe('after the ribbon is reordered', () => {
  it('a plain invalidation leaves the visitor on the old order', async () => {
    // Not an assertion about what should happen — a record of why the fix
    // exists. If this ever starts returning the new order, the default
    // behaviour changed and `refetchType: 'all'` may no longer be needed.
    const data = await ribbonAfterInvalidation(client =>
      client.invalidateQueries({ queryKey: ['items'] }),
    );

    expect(data).toEqual(['first', 'second']);
  });

  it('refetching everything gives the visitor the new order', async () => {
    const data = await ribbonAfterInvalidation(client =>
      client.invalidateQueries({ queryKey: ['items'], refetchType: 'all' }),
    );

    expect(data).toEqual(['second', 'first']);
  });

  it('reaches a query that is watching a different page size', async () => {
    /*
     * The signed-in home asks for eight and the anonymous one for twelve, so
     * they are two cache entries under the same prefix. Both have to move.
     */
    const client = appClient();
    let order = ['first'];
    const keys = [
      ['items', 'featured', 8],
      ['items', 'featured', 12],
    ];
    for (const queryKey of keys) {
      const observer = new QueryObserver(client, {
        queryKey,
        queryFn: async () => order,
      });
      const stop = observer.subscribe(() => {});
      await sleep(40);
      stop();
    }

    order = ['second'];
    await client.invalidateQueries({
      queryKey: ['items', 'featured'],
      refetchType: 'all',
    });
    await sleep(120);

    for (const queryKey of keys) {
      expect(client.getQueryData(queryKey)).toEqual(['second']);
    }
  });
});
