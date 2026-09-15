/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Canonical events on the wire: a subscription that survives a dropped
 * connection.
 *
 * `executions.subscribe` is Server-Sent Events, and the id of every event is
 * the cursor of the whole subscription — each execution it covers, with the
 * last sequence sent of each. This reads the stream with `fetch` rather than
 * `EventSource`, which cannot carry the caller's bearer token, and when the
 * connection drops it reconnects with the last id it received as
 * `Last-Event-ID`: the service sends what was missed and nothing twice. The
 * stream ends with an `end` event once every execution it covers is over.
 *
 * After each batch of events the stream carries an `orchestration.tree`
 * roll-up of the executions it covers — each where it stands, never one state
 * for the tree — which `onTree` receives; `treeFromEvents` works out the same
 * summary from the events alone (O2-03).
 *
 * The other half is the user channel. The app's `/ws` connection carries an
 * `orchestration.tree` summary whenever a tree moves — the state of each
 * execution, never the event stream — which `isTreeAnnouncement` recognises.
 *
 * @module api/orchestration/events
 */

import { type EvalsQuery } from '../evals/request';
import { operationUrl, type OrchestrationClientOptions } from './client';
import type {
  ExecutionEvent,
  ExecutionSummary,
  LifecycleEvent,
  TreeSummary,
} from './generated';
import { isTerminal } from './lifecycle';

/** The user channel's event for a tree that moved, and the stream's roll-up. */
export const TREE_EVENT = 'orchestration.tree';

/** One Server-Sent Event, as it was framed. */
export interface ServerSentEvent {
  id?: string;
  event: string;
  data: string;
}

/**
 * Split what has arrived into the complete events and what is left over,
 * which is the beginning of an event still arriving.
 */
export const readServerSentEvents = (
  buffer: string,
): { events: ServerSentEvent[]; rest: string } => {
  const blocks = buffer.replace(/\r\n/g, '\n').split('\n\n');
  const rest = blocks.pop() ?? '';
  const events = blocks
    .filter(block => block.trim() !== '')
    .map(block => {
      const framed: ServerSentEvent = { event: 'message', data: '' };
      const data: string[] = [];
      for (const line of block.split('\n')) {
        if (line.startsWith(':')) {
          continue;
        }
        const colon = line.indexOf(':');
        const field = colon === -1 ? line : line.slice(0, colon);
        const value =
          colon === -1 ? '' : line.slice(colon + 1).replace(/^ /, '');
        if (field === 'id') {
          framed.id = value;
        } else if (field === 'event') {
          framed.event = value;
        } else if (field === 'data') {
          data.push(value);
        }
      }
      framed.data = data.join('\n');
      return framed;
    });
  return { events, rest };
};

/** The service refused the subscription; asking again would be refused again. */
export class SubscriptionRefused extends Error {
  constructor(
    readonly status: number,
    readonly detail: string,
  ) {
    super(`The subscription was refused with ${status}: ${detail}`);
    this.name = 'SubscriptionRefused';
  }
}

/** What `fetch` answers, as much of it as a subscription reads. */
interface StreamedResponse {
  ok: boolean;
  status: number;
  body: ReadableStream<Uint8Array> | null;
  text(): Promise<string>;
}

export interface SubscribeOptions {
  /** Every event of the tree below the execution too; the service's default. */
  includeChildren?: boolean;
  /** Replay the execution's own events after this sequence. */
  fromSequence?: number;
  /** Only these lifecycle events; every event when empty. */
  events?: LifecycleEvent[];
  /** The id of the last event already received, to resume after it. */
  lastEventId?: string;
  /** Each event once, in the order the service sent them, with the cursor it moved the subscription to. */
  onEvent: (event: ExecutionEvent, cursor: string) => void;
  /** What the executions the subscription covers are doing, after each batch of events that changed it. */
  onTree?: (tree: TreeSummary, cursor: string) => void;
  /** The subscription ended because every execution it covers is over. */
  onEnd?: () => void;
  /** How many drops in a row, with no event between them, before giving up. */
  maxReconnects?: number;
  /** How long to wait before reconnecting, in milliseconds. */
  reconnectDelayMs?: number;
  signal?: AbortSignal;
  /** The `fetch` to use; the global one by default. */
  fetch?: (url: string, init: RequestInit) => Promise<StreamedResponse>;
}

export interface Subscription {
  /** Settles when the stream ends, is aborted, or cannot be resumed. */
  done: Promise<void>;
  /** The id a later subscription resumes from. */
  lastEventId: () => string | undefined;
}

const pause = (milliseconds: number, signal?: AbortSignal): Promise<void> =>
  new Promise(resolve => {
    if (milliseconds <= 0 || signal?.aborted) {
      resolve();
      return;
    }
    const timer = setTimeout(resolve, milliseconds);
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
  });

/**
 * Subscribe to an execution — and its tree — until it is over.
 *
 * A dropped connection, before the service answered or in the middle of the
 * stream, is resumed from the last event received. A refusal is not: it
 * rejects `done` with `SubscriptionRefused`. An abort ends the subscription
 * quietly, because stopping is the caller's decision rather than a failure.
 */
export const subscribeToExecution = (
  options: OrchestrationClientOptions,
  executionId: string,
  subscribe: SubscribeOptions,
): Subscription => {
  let lastEventId = subscribe.lastEventId;
  const fetcher =
    subscribe.fetch ??
    ((url: string, init: RequestInit) =>
      fetch(url, init) as Promise<StreamedResponse>);
  const query: EvalsQuery = {
    includeChildren: subscribe.includeChildren,
    fromSequence: subscribe.fromSequence,
  };
  const address = new URL(
    operationUrl(
      options,
      'executions.subscribe',
      { execution_id: executionId },
      query,
    ),
  );
  for (const wanted of subscribe.events ?? []) {
    address.searchParams.append('events', wanted);
  }
  const url = address.toString();
  const maxReconnects = subscribe.maxReconnects ?? 5;

  const run = async (): Promise<void> => {
    let dropsInARow = 0;
    for (;;) {
      const headers: Record<string, string> = { Accept: 'text/event-stream' };
      if (options.token) {
        headers.Authorization = `Bearer ${options.token}`;
      }
      if (lastEventId) {
        headers['Last-Event-ID'] = lastEventId;
      }
      let response: StreamedResponse | undefined;
      try {
        response = await fetcher(url, {
          headers,
          signal: subscribe.signal,
          credentials: 'include',
        });
      } catch {
        if (subscribe.signal?.aborted) {
          return;
        }
      }
      if (response && !response.ok) {
        throw new SubscriptionRefused(response.status, await response.text());
      }
      let ended = false;
      if (response?.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        for (;;) {
          let chunk: ReadableStreamReadResult<Uint8Array>;
          try {
            chunk = await reader.read();
          } catch {
            if (subscribe.signal?.aborted) {
              return;
            }
            break;
          }
          if (chunk.done) {
            break;
          }
          buffer += decoder.decode(chunk.value, { stream: true });
          const { events, rest } = readServerSentEvents(buffer);
          buffer = rest;
          for (const framed of events) {
            if (framed.event === 'end') {
              ended = true;
              continue;
            }
            if (framed.id) {
              lastEventId = framed.id;
            }
            if (framed.event === TREE_EVENT) {
              subscribe.onTree?.(
                JSON.parse(framed.data) as TreeSummary,
                framed.id ?? '',
              );
            } else {
              subscribe.onEvent(
                JSON.parse(framed.data) as ExecutionEvent,
                framed.id ?? '',
              );
            }
            dropsInARow = 0;
          }
        }
      }
      if (ended) {
        subscribe.onEnd?.();
        return;
      }
      if (subscribe.signal?.aborted) {
        return;
      }
      dropsInARow += 1;
      if (dropsInARow > maxReconnects) {
        throw new Error(
          `The subscription to '${executionId}' dropped ${dropsInARow} times with no event in between.`,
        );
      }
      await pause(subscribe.reconnectDelayMs ?? 1000, subscribe.signal);
    }
  };

  return { done: run(), lastEventId: () => lastEventId };
};

/**
 * What a tree is doing, worked out from its canonical events alone (O2-03).
 *
 * The same summary the subscription sends as `orchestration.tree`: each
 * execution's latest state, its parent, its worker and its goal — the message
 * of the event that created it — and its depth below the first execution the
 * events cover. Each execution's events are read in their own sequence,
 * whatever order they arrived in.
 */
export const treeFromEvents = (
  events: readonly ExecutionEvent[],
): TreeSummary => {
  interface Node {
    parent: string | null;
    goal: string;
    agentId: string;
    protocol?: ExecutionSummary['protocol'];
    status?: ExecutionSummary['status'];
    updatedAt: string;
  }
  const nodes = new Map<string, Node>();
  let root = '';
  const ordered = [...events].sort((one, other) =>
    one.executionId === other.executionId
      ? one.sequence - other.sequence
      : one.executionId < other.executionId
        ? -1
        : 1,
  );
  for (const event of ordered) {
    root = root || event.rootExecutionId;
    let node = nodes.get(event.executionId);
    if (!node) {
      node = {
        parent: event.parentExecutionId ?? null,
        goal: event.message ?? '',
        agentId: '',
        updatedAt: event.emittedAt,
      };
      nodes.set(event.executionId, node);
    }
    node.agentId = event.agentId ?? node.agentId;
    node.protocol = event.protocol ?? node.protocol;
    node.status = event.state ?? node.status;
    node.updatedAt = event.emittedAt;
  }
  const depth = (executionId: string): number => {
    const parent = nodes.get(executionId)?.parent;
    return parent && nodes.has(parent) ? depth(parent) + 1 : 0;
  };
  const executions: ExecutionSummary[] = [];
  for (const [executionId, node] of nodes) {
    if (node.status && node.protocol) {
      executions.push({
        executionId,
        parentExecutionId: node.parent,
        depth: depth(executionId),
        status: node.status,
        agentId: node.agentId,
        protocol: node.protocol,
        goal: node.goal,
        updatedAt: node.updatedAt,
      });
    }
  }
  const counts: Record<string, number> = {};
  for (const one of executions) {
    counts[one.status] = (counts[one.status] ?? 0) + 1;
  }
  return {
    rootExecutionId: root,
    executions,
    counts,
    terminal: executions.every(one => isTerminal(one.status)),
  };
};

/** A message of the app's user channel announcing that a tree moved. */
export interface TreeAnnouncement {
  channel: string;
  event: typeof TREE_EVENT;
  data: TreeSummary;
}

/** Whether a user-channel message is a tree announcement. */
export const isTreeAnnouncement = (
  message: unknown,
): message is TreeAnnouncement => {
  if (typeof message !== 'object' || message === null) {
    return false;
  }
  const { event, data } = message as { event?: unknown; data?: unknown };
  return (
    event === TREE_EVENT &&
    typeof data === 'object' &&
    data !== null &&
    typeof (data as { rootExecutionId?: unknown }).rootExecutionId ===
      'string' &&
    Array.isArray((data as { executions?: unknown }).executions)
  );
};
