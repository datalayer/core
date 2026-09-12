/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * What a tree is doing, from its stream alone (O2-03).
 *
 * The subscription sends a roll-up after each batch of events, and a client
 * that kept only the events works out the same summary itself.
 */

import { describe, expect, it, vi } from 'vitest';

import { subscribeToExecution, treeFromEvents } from '../events';
import type { ExecutionEvent, TreeSummary } from '../generated';

const encoder = new TextEncoder();
const options = {
  baseUrl: 'https://agents.example',
  token: 't',
  accountUid: 'org-1',
};

const event = (
  executionId: string,
  sequence: number,
  fields: Partial<ExecutionEvent>,
): ExecutionEvent =>
  ({
    eventId: `evt_${executionId}_${sequence}`,
    type: 'execution.state_changed',
    sequence,
    emittedAt: `2026-09-11T10:00:0${sequence}Z`,
    rootExecutionId: 'exec_root',
    executionId,
    parentExecutionId: null,
    agentId: 'acp-analyst',
    protocol: 'acp',
    ...fields,
  }) as ExecutionEvent;

describe('a tree from its events', () => {
  it('keeps every execution where it stands, with its parent and its depth', () => {
    const tree = treeFromEvents([
      event('exec_child', 2, {
        parentExecutionId: 'exec_root',
        state: 'running',
      }),
      event('exec_root', 1, { state: 'created', message: 'Profile it' }),
      event('exec_child', 1, {
        parentExecutionId: 'exec_root',
        state: 'created',
        message: 'Check the types',
      }),
      event('exec_grandchild', 1, {
        parentExecutionId: 'exec_child',
        state: 'created',
        message: 'Read the schema',
      }),
      event('exec_root', 2, { state: 'running' }),
      event('exec_grandchild', 2, {
        parentExecutionId: 'exec_child',
        state: 'completed',
      }),
    ]);
    const byId = Object.fromEntries(
      tree.executions.map(one => [one.executionId, one]),
    );
    expect(tree.rootExecutionId).toBe('exec_root');
    expect(byId.exec_root).toMatchObject({
      depth: 0,
      status: 'running',
      goal: 'Profile it',
    });
    expect(byId.exec_child).toMatchObject({
      depth: 1,
      status: 'running',
      parentExecutionId: 'exec_root',
      goal: 'Check the types',
    });
    expect(byId.exec_grandchild).toMatchObject({
      depth: 2,
      status: 'completed',
    });
    expect(tree.counts).toEqual({ running: 2, completed: 1 });
    expect(tree.terminal).toBe(false);
  });

  it('reads each execution in its own sequence, whatever order the events came in', () => {
    const tree = treeFromEvents([
      event('exec_root', 3, {
        state: 'completed',
        emittedAt: '2026-09-11T09:59:59Z',
      }),
      event('exec_root', 1, { state: 'created' }),
      event('exec_root', 2, { state: 'running' }),
    ]);
    expect(tree.executions[0].status).toBe('completed');
    expect(tree.terminal).toBe(true);
  });
});

describe('a subscription', () => {
  it('hands the roll-up to its own callback and moves the cursor past it', async () => {
    const tree: TreeSummary = {
      rootExecutionId: 'exec_1',
      executions: [],
      counts: { running: 1 },
      terminal: false,
    };
    const body = [
      `id: exec_1:1\nevent: execution.state_changed\ndata: ${JSON.stringify(
        event('exec_1', 1, { state: 'running' }),
      )}\n\n`,
      `id: exec_1:1\nevent: orchestration.tree\ndata: ${JSON.stringify(tree)}\n\n`,
      'event: end\ndata: {}\n\n',
    ];
    const fetcher = vi.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => '',
      body: new ReadableStream<Uint8Array>({
        start(controller) {
          for (const chunk of body) {
            controller.enqueue(encoder.encode(chunk));
          }
          controller.close();
        },
      }),
    }));
    const sequences: number[] = [];
    const trees: TreeSummary[] = [];
    const subscription = subscribeToExecution(options, 'exec_1', {
      onEvent: one => sequences.push(one.sequence),
      onTree: one => trees.push(one),
      reconnectDelayMs: 0,
      fetch: fetcher,
    });
    await subscription.done;
    expect(sequences).toEqual([1]);
    expect(trees).toEqual([tree]);
    expect(subscription.lastEventId()).toBe('exec_1:1');
  });
});
