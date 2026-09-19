/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * What signing out does to the cache.
 *
 * Two things have to be true at once, and the obvious call — `clear()` — only
 * manages one of them. Nothing the session was told may survive it, and
 * nothing still on screen may be left waiting for an answer that will never
 * come. The second is what broke: the anonymous home mounts the moment the
 * session ends and starts fetching its featured ribbon, the logout response
 * lands on top of that fetch, and `clear()` destroyed the query underneath
 * it — leaving the ribbon a row of empty placeholders until a reload.
 *
 * The first test here fails against `clear()`, which is the point of it.
 */

import { QueryClient, QueryObserver } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';

import { forgetSession } from '../useCache';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/** A client that does not retry, so a test's timings are its own. */
const makeClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false } } });

describe('forgetSession', () => {
  it('answers a query that was in flight when the session ended', async () => {
    const client = makeClient();
    let calls = 0;
    const observer = new QueryObserver(client, {
      queryKey: ['library', 'featured', 12],
      queryFn: async () => {
        calls += 1;
        await sleep(40);
        return ['a', 'b'];
      },
      staleTime: 60_000,
    });
    const unsubscribe = observer.subscribe(() => {});

    // The ribbon is mid-request when the logout response arrives.
    await sleep(5);
    forgetSession(client);
    await sleep(200);

    const result = observer.getCurrentResult();
    expect(result.status).toBe('success');
    expect(result.data).toEqual(['a', 'b']);
    // Asked again rather than left pending: the first request was discarded.
    expect(calls).toBe(2);
    unsubscribe();
  });

  it('asks again, rather than keeping what the last session was told', async () => {
    const client = makeClient();
    let handle = 'eric';
    const observer = new QueryObserver(client, {
      queryKey: ['iam', 'me'],
      queryFn: async () => ({ handle }),
      staleTime: 60_000,
    });
    const unsubscribe = observer.subscribe(() => {});
    await sleep(50);
    expect(observer.getCurrentResult().data).toEqual({ handle: 'eric' });

    // Whoever is looking now is somebody else.
    handle = 'anonymous';
    forgetSession(client);
    await sleep(200);

    expect(observer.getCurrentResult().data).toEqual({ handle: 'anonymous' });
    unsubscribe();
  });

  it('drops what nobody is looking at', async () => {
    const client = makeClient();
    await client.fetchQuery({
      queryKey: ['spaces', 'mine'],
      queryFn: async () => ['a private space'],
    });
    expect(client.getQueryData(['spaces', 'mine'])).toEqual([
      'a private space',
    ]);

    forgetSession(client);

    // Removed outright, not merely emptied: nothing of it is left to read.
    expect(
      client.getQueryCache().find({ queryKey: ['spaces', 'mine'] }),
    ).toBeUndefined();
  });
});
