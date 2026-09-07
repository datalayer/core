/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * What a run has printed, and whether it is over.
 *
 * The logic, not the components. A run's output arrives in two shapes and
 * both are the run's output: the streamed `outputs`, and the `result` a
 * finished tool returned. A cancelled run has both — the gateway promotes
 * the partial output to the result when it stops — so drawing only one of
 * them shows a person less than the server kept, and concatenating them
 * naively prints the same lines twice.
 *
 * That promotion is the reason this is tested rather than eyeballed: it is
 * exactly the case where the two shapes hold the same text, and it is the
 * case a person hits when they cancel something.
 */

import { describe, expect, it } from 'vitest';
import { isRunOver, outputTextOf, RUN_STATUS_LOOK } from '../RunDetail';
import type { McpTask, McpTaskStatus } from '../../../models/McpTask';

const task = (over: Partial<McpTask> = {}): McpTask =>
  ({
    uid: 'tsk_1',
    status: 'working',
    tool: 'execute_cell',
    initiatingUser: 'u',
    createdAt: '2026-09-07T10:00:00Z',
    lastUpdatedAt: '2026-09-07T10:00:01Z',
    ...over,
  }) as McpTask;

describe('what the run has printed', () => {
  it('shows the streamed outputs', () => {
    const found = outputTextOf(
      task({ outputs: [{ index: 0, outputType: 'stream', text: 'tick 0\n' }] }),
    );
    expect(found).toBe('tick 0\n');
  });

  it("shows a finished tool's result", () => {
    const found = outputTextOf(
      task({ status: 'completed', result: { content: [{ type: 'text', text: 'done\n' }] } }),
    );
    expect(found).toBe('done\n');
  });

  it('shows both, in order, when a run carries both', () => {
    const found = outputTextOf(
      task({
        outputs: [{ index: 0, outputType: 'stream', text: 'tick 0\n' }],
        result: { content: [{ type: 'text', text: 'done\n' }] },
      }),
    );
    expect(found).toBe('tick 0\ndone\n');
  });

  it('does not print a promoted partial twice', () => {
    // What a cancelled run looks like: the gateway promotes the partial
    // output to the result, so the same text is in both places.
    const found = outputTextOf(
      task({
        status: 'cancelled',
        outputs: [{ index: 0, outputType: 'stream', text: 'tick 0\n' }],
        result: { content: [{ type: 'text', text: 'tick 0\n' }] },
      }),
    );
    expect(found).toBe('tick 0\n');
  });

  it('ignores a result that is a resource uri rather than content', () => {
    // A large result is a URI, not text; drawing the URI as output would
    // show a person a link where they expected their numbers.
    expect(outputTextOf(task({ result: 'datalayer://results/tsk_1' }))).toBe('');
  });

  it('ignores non-text content parts', () => {
    expect(
      outputTextOf(task({ result: { content: [{ type: 'image', data: 'iVBOR' }] } })),
    ).toBe('');
  });

  it('is empty for a run that printed nothing', () => {
    expect(outputTextOf(task())).toBe('');
  });
});

describe('whether the run is over', () => {
  it.each<[McpTaskStatus, boolean]>([
    ['working', false],
    ['input_required', false],
    ['completed', true],
    ['failed', true],
    ['cancelled', true],
  ])('%s', (status, expected) => {
    expect(isRunOver(status)).toBe(expected);
  });

  it('a run waiting on a person is not over', () => {
    // It has stopped, but it will move again the moment somebody answers —
    // so the cancel button stays, and the answer box is drawn.
    expect(isRunOver('input_required')).toBe(false);
  });
});

describe('how a status is drawn', () => {
  it('has a look for every status the model allows', () => {
    const statuses: McpTaskStatus[] = [
      'working',
      'input_required',
      'completed',
      'failed',
      'cancelled',
    ];
    for (const status of statuses) {
      expect(RUN_STATUS_LOOK[status]).toBeDefined();
    }
  });

  it('draws a run waiting on a person as wanting attention', () => {
    // The one status that is a question rather than a state.
    expect(RUN_STATUS_LOOK.input_required.variant).toBe('attention');
  });

  it('draws a failure as a failure', () => {
    expect(RUN_STATUS_LOOK.failed.variant).toBe('danger');
  });
});
