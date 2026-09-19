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
import { engineLook, stageOf } from '../McpObservability';

const health = (
  patch: Partial<McpWorkflowsHealth> = {},
): McpWorkflowsHealth => ({
  engine: 'dbos',
  healthy: true,
  queues: [],
  workerVersions: {},
  checkedAt: '2026-09-07T12:00:00Z',
  ...patch,
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
    const unwell = engineLook(health({ healthy: false }), false);
    expect(unreachable.label).toBe('Unreachable');
    expect(unwell.label).toBe('Unhealthy');
    expect(unreachable.label).not.toBe(unwell.label);
  });

  it('does not call a healthy engine with a queue unhealthy', () => {
    const busy = engineLook(
      health({ queues: [{ name: 'notebook', backlog: 4 }] }),
      false,
    );
    expect(busy.label).toBe('Healthy');
    expect(busy.note).toContain('4');
  });

  it('says plainly when nothing is waiting', () => {
    const idle = engineLook(health(), false);
    expect(idle.label).toBe('Healthy');
    expect(idle.variant).toBe('success');
    expect(idle.note).toMatch(/Nothing/);
  });

  it('draws a queue that is not empty differently from one that is', () => {
    const idle = engineLook(health(), false);
    const busy = engineLook(
      health({ queues: [{ name: 'q', backlog: 1 }] }),
      false,
    );
    expect(busy.variant).not.toBe(idle.variant);
  });

  it('counts the backlog across every queue, not just the first', () => {
    const many = engineLook(
      health({
        queues: [
          { name: 'notebook', backlog: 2 },
          { name: 'sandbox', backlog: 3 },
        ],
      }),
      false,
    );
    expect(many.note).toContain('5');
  });

  it('does not invent a waiting run out of a queue that reported no number', () => {
    // `backlog` is required by the contract, so a missing one is a malformed
    // answer — and the reading to avoid is the one that puts a number on an
    // operator's screen that nothing measured.
    const malformed = engineLook(
      health({ queues: [{ name: 'q' } as unknown as McpWorkflowsHealth['queues'][number]] }),
      false,
    );
    expect(malformed.note).toMatch(/Nothing/);
    expect(malformed.variant).toBe('success');
  });

  it('reads one waiting run as singular', () => {
    const one = engineLook(
      health({ queues: [{ name: 'q', backlog: 1 }] }),
      false,
    );
    expect(one.note).toContain('1 run is');
  });

  it("passes on the engine's own account of why it is unhealthy", () => {
    const said = engineLook(
      health({ healthy: false, detail: 'no worker has polled in 4 minutes' }),
      false,
    );
    expect(said.note).toBe('no worker has polled in 4 minutes');
  });

  it('says it is still asking rather than guessing, before the answer arrives', () => {
    const pending = engineLook(undefined, false);
    expect(pending.label).not.toBe('Healthy');
    expect(pending.label).not.toBe('Unhealthy');
  });

  it('prefers unreachable over anything a stale answer says', () => {
    // A cached healthy answer with the current ask failing is not health.
    const stale = engineLook(health(), true);
    expect(stale.label).toBe('Unreachable');
  });
});
