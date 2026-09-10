/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * A subscription survives a dropped connection, receiving each event once.
 *
 * The service sends every event with the subscription's cursor as its id and
 * resumes after a `Last-Event-ID`; this holds the client to its half: the
 * connection breaks in the middle of an event, the client reconnects with
 * the last id it fully received, and what it hands its caller is the whole
 * stream, in order, once.
 */

import { describe, expect, it, vi } from 'vitest';

import {
  SubscriptionRefused,
  TREE_EVENT,
  isTreeAnnouncement,
  readServerSentEvents,
  subscribeToExecution,
} from '../events';

const encoder = new TextEncoder();
const options = {
  baseUrl: 'https://agents.example',
  token: 't',
  accountUid: 'org-1',
};

const framed = (sequence: number) =>
  `id: exec_1:${sequence}\nevent: execution.progress\ndata: ${JSON.stringify({
    eventId: `evt_${sequence}`,
    sequence,
    executionId: 'exec_1',
  })}\n\n`;

/** A response whose body sends these chunks, then ends or breaks. */
const answer = (chunks: string[], ending: 'end' | 'break') => {
  let index = 0;
  return {
    ok: true,
    status: 200,
    text: async () => '',
    body: new ReadableStream<Uint8Array>({
      pull(controller) {
        if (index < chunks.length) {
          controller.enqueue(encoder.encode(chunks[index++]));
          return;
        }
        if (ending === 'break') {
          controller.error(new TypeError('network error'));
        } else {
          controller.close();
        }
      },
    }),
  };
};

describe('reading Server-Sent Events', () => {
  it('keeps the part of an event still arriving', () => {
    const { events, rest } = readServerSentEvents(
      `${framed(1)}id: exec_1:2\nev`,
    );
    expect(events.map(one => one.id)).toEqual(['exec_1:1']);
    expect(rest).toBe('id: exec_1:2\nev');
  });

  it('reads CRLF framing, comments and multi-line data', () => {
    const { events } = readServerSentEvents(
      ': keepalive\r\nevent: end\r\ndata: a\r\ndata: b\r\n\r\n',
    );
    expect(events).toEqual([{ event: 'end', data: 'a\nb' }]);
  });
});

describe('a subscription', () => {
  it('resumes a dropped connection from the last event and receives each event once', async () => {
    const sent = [1, 2, 3, 4, 5];
    const calls: Array<{ url: string; headers: Record<string, string> }> = [];
    const fetcher = vi.fn(async (url: string, init: RequestInit) => {
      const headers = init.headers as Record<string, string>;
      calls.push({ url, headers });
      const after = Number(
        (headers['Last-Event-ID'] ?? 'exec_1:0').split(':')[1],
      );
      const pending = sent.filter(sequence => sequence > after).map(framed);
      if (calls.length === 1) {
        // Two events, the second in two pieces, and the connection breaks.
        return answer(
          [
            pending[0],
            pending[1].slice(0, 12),
            pending[1].slice(12),
            pending[2].slice(0, 20),
          ],
          'break',
        );
      }
      return answer([...pending, 'event: end\ndata: {}\n\n'], 'end');
    });
    const received: number[] = [];
    let ended = false;
    const subscription = subscribeToExecution(options, 'exec_1', {
      onEvent: event => received.push(event.sequence),
      onEnd: () => {
        ended = true;
      },
      reconnectDelayMs: 0,
      fetch: fetcher,
    });
    await subscription.done;

    expect(received).toEqual([1, 2, 3, 4, 5]);
    expect(ended).toBe(true);
    expect(calls).toHaveLength(2);
    expect(calls[0].headers['Last-Event-ID']).toBeUndefined();
    expect(calls[1].headers['Last-Event-ID']).toBe('exec_1:2');
    expect(calls[0].headers.Authorization).toBe('Bearer t');
    expect(new URL(calls[0].url).pathname).toBe(
      '/api/ai-agents/v1/orchestration/executions/exec_1/events',
    );
    expect(subscription.lastEventId()).toBe('exec_1:5');
  });

  it('asks for the lifecycle events it wants, repeated', async () => {
    const fetcher = vi.fn(async () =>
      answer(['event: end\ndata: {}\n\n'], 'end'),
    );
    await subscribeToExecution(options, 'exec_1', {
      onEvent: () => undefined,
      events: ['complete', 'fail'],
      fetch: fetcher,
    }).done;
    const url = new URL(fetcher.mock.calls[0][0] as unknown as string);
    expect(url.searchParams.getAll('events')).toEqual(['complete', 'fail']);
    expect(url.searchParams.get('account_uid')).toBe('org-1');
  });

  it('does not ask again when the service refused', async () => {
    const fetcher = vi.fn(async () => ({
      ok: false,
      status: 404,
      body: null,
      text: async () => '{"code":"not_found"}',
    }));
    const subscription = subscribeToExecution(options, 'exec_nope', {
      onEvent: () => undefined,
      reconnectDelayMs: 0,
      fetch: fetcher,
    });
    await expect(subscription.done).rejects.toBeInstanceOf(SubscriptionRefused);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('gives up after drops with no event between them', async () => {
    const fetcher = vi.fn(async () => {
      throw new TypeError('offline');
    });
    const subscription = subscribeToExecution(options, 'exec_1', {
      onEvent: () => undefined,
      maxReconnects: 2,
      reconnectDelayMs: 0,
      fetch: fetcher,
    });
    await expect(subscription.done).rejects.toThrow(/dropped 3 times/);
    expect(fetcher).toHaveBeenCalledTimes(3);
  });
});

describe('the user channel', () => {
  it('recognises a tree announcement and nothing else', () => {
    const tree = {
      rootExecutionId: 'exec_1',
      executions: [],
      counts: {},
      terminal: false,
    };
    expect(
      isTreeAnnouncement({ channel: 'user:u', event: TREE_EVENT, data: tree }),
    ).toBe(true);
    expect(
      isTreeAnnouncement({
        channel: 'user:u',
        event: 'event_created',
        data: tree,
      }),
    ).toBe(false);
    expect(
      isTreeAnnouncement({ channel: 'user:u', event: TREE_EVENT, data: {} }),
    ).toBe(false);
    expect(isTreeAnnouncement(null)).toBe(false);
  });
});
