/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * The TypeScript lifecycle is the Python one (PLAN_ORCHESTRATOR.md, O0-02).
 *
 * The same three assertions as `test_orchestration_lifecycle.py`: every
 * state reachable from `created`, every terminal state absorbing, and an
 * invalid move refused rather than performed. They hold over the generated
 * table, so if they hold here and there the two languages have the same
 * state machine — which is the only way an adapter's observation can mean
 * the same thing on both sides of the wire.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ORCHESTRATION_LIFECYCLE, type ExecutionState } from '../generated';
import {
  INITIAL_STATE,
  InvalidTransitionError,
  TERMINAL_STATES,
  canTransition,
  isTerminal,
  movesFrom,
  transition,
} from '../lifecycle';

const reachable = (): Set<ExecutionState> => {
  const seen = new Set<ExecutionState>([INITIAL_STATE]);
  const pending: ExecutionState[] = [INITIAL_STATE];
  while (pending.length > 0) {
    for (const target of Object.values(movesFrom(pending.pop()!))) {
      if (target !== undefined && !seen.has(target)) {
        seen.add(target);
        pending.push(target);
      }
    }
  }
  return seen;
};

describe('the canonical execution lifecycle', () => {
  it('reaches every state from the one an execution starts in', () => {
    expect(INITIAL_STATE).toBe('created');
    expect([...reachable()].sort()).toEqual(
      [...ORCHESTRATION_LIFECYCLE.states].sort(),
    );
  });

  it('absorbs in every terminal state', () => {
    expect([...TERMINAL_STATES].sort()).toEqual([
      'cancelled',
      'completed',
      'failed',
      'terminated',
    ]);
    for (const state of ORCHESTRATION_LIFECYCLE.states) {
      expect(isTerminal(state)).toBe(
        Object.keys(movesFrom(state)).length === 0,
      );
      if (!isTerminal(state)) {
        continue;
      }
      for (const event of ORCHESTRATION_LIFECYCLE.events) {
        expect(canTransition(state, event)).toBe(false);
        expect(() => transition(state, event)).toThrow(/it is terminal/);
      }
    }
  });

  it('moves where section 6.1 draws a move', () => {
    expect(transition('created', 'assign')).toBe('assigned');
    expect(transition('assigned', 'start')).toBe('running');
    expect(transition('running', 'wait')).toBe('waiting');
    expect(transition('waiting', 'resume')).toBe('running');
    expect(transition('running', 'pause')).toBe('paused');
    expect(transition('paused', 'resume')).toBe('running');
    expect(transition('running', 'complete')).toBe('completed');
    expect(transition('running', 'fail')).toBe('failed');
    expect(transition('running', 'cancel')).toBe('cancelled');
    // The retry decision is taken before failure is declared, so that
    // `failed` can absorb; see the Python module for why.
    expect(transition('running', 'retry')).toBe('retrying');
    expect(transition('retrying', 'start')).toBe('running');
    expect(canTransition('failed', 'retry')).toBe(false);
  });

  it('refuses a move the table does not hold', () => {
    expect(() => transition('created', 'complete')).toThrow(
      InvalidTransitionError,
    );
    expect(() => transition('created', 'complete')).toThrow(
      /does not apply there/,
    );
    try {
      transition('paused', 'pause');
      expect.unreachable('a second pause is not a move');
    } catch (error) {
      expect(error).toBeInstanceOf(InvalidTransitionError);
      expect((error as InvalidTransitionError).current).toBe('paused');
      expect((error as InvalidTransitionError).event).toBe('pause');
    }
  });

  it('is read from the generated table rather than restated', () => {
    // "Adapters observe, they do not decide": a second copy of the table is
    // a second place for it to be wrong, so this module must not name a
    // state of its own.
    const source = readFileSync(resolve(__dirname, '../lifecycle.ts'), 'utf8');
    const code = source.slice(source.indexOf('import {'));
    for (const state of ORCHESTRATION_LIFECYCLE.states) {
      expect(code, `lifecycle.ts names ${state}`).not.toContain(`'${state}'`);
    }
  });
});
