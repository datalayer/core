/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * What the Observability panes say about a run and about the engine.
 *
 * Both functions here answer a question an operator asks under pressure, and
 * both have a wrong answer that costs an hour: a durable span labelled as
 * nothing, and an unreachable engine reported as a broken one.
 *
 * @module views/mcp/__tests__/observabilityPanes.unit.test
 */

import { describe, expect, it } from 'vitest';
import type { McpWorkflowsHealth } from '../../../api/mcp/operations';
import { engineLook, engineQueues, stageOf } from '../McpObservability';

// The shape the gateway answers, as read on r1 on 9 November 2026 (camelCased by fromWire).
const health = (
  patch: Partial<McpWorkflowsHealth> = {},
): McpWorkflowsHealth => ({
  engine: 'dbos',
  durable: true,
  detail: 'ready',
  queues: ['agent', 'notebook', 'sandbox'],
  queuesNobodyServes: [],
  workflows: ['AgentRunWorkflow'],
  runs: [],
  ...patch,
});

const run = (queue: string, status: string, startedAt?: number) => ({
  uid: `${queue}-${status}-${startedAt ?? 0}`,
  workflow: 'W',
  queue,
  status,
  startedAt,
});

describe('stageOf', () => {
  it('names the stage of every span the platform emits', () => {
    expect(stageOf('mcp.request execute_cell')).toBe('Gateway');
    expect(stageOf('mcp.policy.check')).toBe('Policy');
    expect(stageOf('sandbox.launch')).toBe('Sandbox');
    expect(stageOf('durable.step.execute')).toBe('Workflow');
    expect(stageOf('runtimes.kernel.execute')).toBe('Runtime');
  });

  it('tells the workflow apart from the runtime it waits on', () => {
    // The two spans that explain a slow durable run. Labelling both the same
    // would hide which of them the run was actually spending its time in.
    expect(stageOf('durable.step.execute')).not.toBe(
      stageOf('runtimes.kernel.execute'),
    );
  });

  it('gives a span it does not recognise no label rather than a wrong one', () => {
    expect(stageOf('kafka.consume')).toBe('');
    expect(stageOf('')).toBe('');
  });
});

describe('engineLook', () => {
  it('separates an engine that cannot be reached from one that is unwell', () => {
    const unreachable = engineLook(undefined, true);
    const unwell = engineLook(
      health({
        durable: false,
        detail: 'the dbos runtime is not launched, so no queue is polled',
      }),
      false,
    );
    expect(unreachable.label).toBe('Unreachable');
    expect(unwell.label).toBe('Unhealthy');
    expect(unwell.note).toContain('not launched');
  });

  it('calls an engine that takes work healthy: durable, not a missing field', () => {
    // On r1 the page said Unhealthy for an engine answering durable: true and detail "ready".
    const ready = engineLook(health(), false);
    expect(ready.label).toBe('Healthy');
    expect(ready.variant).toBe('success');
    expect(ready.note).toMatch(/None of its newest runs/);
  });

  it('counts what is running among the newest runs, and says it is those', () => {
    const busy = engineLook(
      health({
        runs: [
          run('agent', 'running'),
          run('agent', 'completed'),
          run('sandbox', 'running'),
        ],
      }),
      false,
    );
    expect(busy.label).toBe('Healthy');
    expect(busy.note).toBe('2 of its newest runs are running.');
  });

  it('warns of a queue nobody serves', () => {
    const typo = engineLook(health({ queuesNobodyServes: ['notebok'] }), false);
    expect(typo.label).toBe('Healthy');
    expect(typo.variant).toBe('attention');
    expect(typo.note).toContain('notebok');
  });
});

describe('engineQueues', () => {
  it('names every queue, with what runs there and the oldest of it', () => {
    const now = 1_000_000_000;
    const queues = engineQueues(
      health({
        runs: [
          run('agent', 'running', now / 1000 - 90),
          run('agent', 'running', now / 1000 - 30),
          run('notebook', 'completed', 1),
        ],
      }),
      now,
    );
    expect(queues).toEqual([
      { name: 'agent', running: 2, oldestSeconds: 90, served: true },
      { name: 'notebook', running: 0, oldestSeconds: undefined, served: true },
      { name: 'sandbox', running: 0, oldestSeconds: undefined, served: true },
    ]);
  });

  it('lists a queue nobody serves, marked, and never a nameless row', () => {
    const queues = engineQueues(health({ queuesNobodyServes: ['notebok'] }));
    expect(queues.map(queue => queue.name)).toEqual([
      'agent',
      'notebook',
      'sandbox',
      'notebok',
    ]);
    expect(queues.find(queue => queue.name === 'notebok')?.served).toBe(false);
    expect(queues.every(queue => queue.name)).toBe(true);
  });
});
