/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * The canonical execution lifecycle (PLAN_ORCHESTRATOR.md, section 6.1, O0-02).
 *
 * The states and the moves between them are not written here: they are
 * generated from `datalayer_core/orchestration/lifecycle.py`, which is the
 * source of truth, and this module is the function that reads them. A
 * mirror that restated the table would be a second place for it to be
 * wrong, and the whole point of one state machine is that there is one.
 *
 * A browser observes; it does not decide. This is here so that a view can
 * tell whether a control it is about to enable would be refused — a cancel
 * button on a completed execution — without asking the control plane and
 * without inventing an answer.
 *
 * @module api/orchestration/lifecycle
 */

import {
  ORCHESTRATION_LIFECYCLE,
  type ExecutionState,
  type LifecycleEvent,
  type LifecycleMoves,
} from './generated';

/** A move the lifecycle does not allow, refused rather than performed. */
export class InvalidTransitionError extends Error {
  readonly current: ExecutionState;
  readonly event: LifecycleEvent;

  constructor(current: ExecutionState, event: LifecycleEvent) {
    const reason = isTerminal(current)
      ? 'it is terminal'
      : 'that event does not apply there';
    super(`An execution in '${current}' cannot take '${event}': ${reason}.`);
    this.name = 'InvalidTransitionError';
    this.current = current;
    this.event = event;
  }
}

/** The state of an execution that has been created and nothing more. */
export const INITIAL_STATE: ExecutionState = ORCHESTRATION_LIFECYCLE.initial;

/** The states from which nothing more happens. */
export const TERMINAL_STATES: ReadonlySet<ExecutionState> = new Set(
  ORCHESTRATION_LIFECYCLE.terminal,
);

/** Whether nothing more happens from this state. */
export const isTerminal = (state: ExecutionState): boolean =>
  TERMINAL_STATES.has(state);

/** Every event this state accepts, and where each one leads. */
export const movesFrom = (state: ExecutionState): LifecycleMoves =>
  ORCHESTRATION_LIFECYCLE.transitions[state];

/** Whether the event applies to the state, without moving anything. */
export const canTransition = (
  current: ExecutionState,
  event: LifecycleEvent,
): boolean => movesFrom(current)[event] !== undefined;

/**
 * The state this event leads to, or a refusal.
 *
 * @throws InvalidTransitionError - When the lifecycle does not allow the move.
 */
export const transition = (
  current: ExecutionState,
  event: LifecycleEvent,
): ExecutionState => {
  const next = movesFrom(current)[event];
  if (next === undefined) {
    throw new InvalidTransitionError(current, event);
  }
  return next;
};
