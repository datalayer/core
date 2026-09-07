/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Which of a notebook's runs a person sees first.
 *
 * A notebook accumulates finished runs and keeps one or two live ones, so
 * ordering by time alone buries what is happening under what happened. The
 * rail is short — twenty rows beside a notebook, not a page — and the row
 * that needs a person is the one that must survive that cut.
 */

import { describe, expect, it } from 'vitest';
import { orderedRuns } from '../NotebookRuns';
import type { McpTask, McpTaskStatus } from '../../../models/McpTask';

const task = (uid: string, status: McpTaskStatus, updated: string): McpTask =>
  ({
    uid,
    status,
    tool: 'execute_cell',
    initiatingUser: 'u',
    createdAt: updated,
    lastUpdatedAt: updated,
  }) as McpTask;

describe('the order runs are shown in', () => {
  it('puts a run waiting on a person first, however old', () => {
    const found = orderedRuns([
      task('new', 'working', '2026-09-07T12:00:00Z'),
      task('asking', 'input_required', '2026-09-01T09:00:00Z'),
    ]);
    expect(found[0].uid).toBe('asking');
  });

  it('puts a live run above a finished one', () => {
    const found = orderedRuns([
      task('done', 'completed', '2026-09-07T12:00:00Z'),
      task('live', 'working', '2026-09-07T08:00:00Z'),
    ]);
    expect(found.map(t => t.uid)).toEqual(['live', 'done']);
  });

  it('orders within a rank by most recent', () => {
    const found = orderedRuns([
      task('older', 'completed', '2026-09-06T12:00:00Z'),
      task('newer', 'completed', '2026-09-07T12:00:00Z'),
    ]);
    expect(found.map(t => t.uid)).toEqual(['newer', 'older']);
  });

  it('treats every terminal status as finished', () => {
    const found = orderedRuns([
      task('cancelled', 'cancelled', '2026-09-07T12:00:00Z'),
      task('failed', 'failed', '2026-09-07T11:00:00Z'),
      task('working', 'working', '2026-09-07T01:00:00Z'),
    ]);
    expect(found[0].uid).toBe('working');
  });

  it('does not mutate what it was given', () => {
    const given = [
      task('a', 'completed', '2026-09-06T12:00:00Z'),
      task('b', 'input_required', '2026-09-07T12:00:00Z'),
    ];
    orderedRuns(given);
    expect(given.map(t => t.uid)).toEqual(['a', 'b']);
  });

  it('is empty for a notebook nothing has run on', () => {
    expect(orderedRuns([])).toEqual([]);
  });

  it('keeps the asking run when the rail is truncated', () => {
    // The property the ordering exists for: a notebook with a page of
    // finished runs and one waiting must not hide the waiting one.
    const many = Array.from({ length: 30 }, (_, n) =>
      task(
        `done-${n}`,
        'completed',
        `2026-09-07T12:${String(n).padStart(2, '0')}:00Z`,
      ),
    );
    const found = orderedRuns([
      ...many,
      task('asking', 'input_required', '2026-09-01T00:00:00Z'),
    ]);
    expect(found.slice(0, 20).map(t => t.uid)).toContain('asking');
  });
});
