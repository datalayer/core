# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""The lifecycle is data, and one function reads it
(PLAN_ORCHESTRATOR.md, section 6.1, O0-02).

Every state is reachable from `created`, every terminal state absorbs, and a
move the table does not hold is refused rather than performed. The same
three things are asserted of the TypeScript in
`src/api/orchestration/__tests__/lifecycle.unit.test.ts`, against the table
generated from this one."""

from __future__ import annotations

import importlib
import pkgutil
from enum import Enum

import pytest

import datalayer_core.orchestration as orchestration
from datalayer_core.orchestration import (
    INITIAL_STATE,
    TERMINAL_STATES,
    TRANSITIONS,
    Attempt,
    Execution,
    ExecutionState,
    InvalidTransition,
    LifecycleEvent,
    can_transition,
    is_terminal,
    transition,
)


def reachable() -> set[ExecutionState]:
    seen, pending = {INITIAL_STATE}, [INITIAL_STATE]
    while pending:
        for target in TRANSITIONS[pending.pop()].values():
            if target not in seen:
                seen.add(target)
                pending.append(target)
    return seen


def test_every_state_is_reachable_from_the_one_an_execution_starts_in() -> None:
    assert reachable() == set(ExecutionState)


def test_every_terminal_state_absorbs() -> None:
    assert TERMINAL_STATES == {
        ExecutionState.COMPLETED,
        ExecutionState.FAILED,
        ExecutionState.CANCELLED,
        ExecutionState.TERMINATED,
    }
    for state in ExecutionState:
        assert is_terminal(state) == (not TRANSITIONS[state])
        if is_terminal(state):
            for event in LifecycleEvent:
                assert not can_transition(state, event)
                with pytest.raises(InvalidTransition, match="it is terminal"):
                    transition(state, event)


def test_the_states_of_section_6_1_are_the_states_of_the_table() -> None:
    assert transition(ExecutionState.CREATED, LifecycleEvent.ASSIGN) is (
        ExecutionState.ASSIGNED
    )
    assert transition(ExecutionState.ASSIGNED, LifecycleEvent.START) is (
        ExecutionState.RUNNING
    )
    assert transition(ExecutionState.RUNNING, LifecycleEvent.WAIT) is (
        ExecutionState.WAITING
    )
    assert transition(ExecutionState.WAITING, LifecycleEvent.RESUME) is (
        ExecutionState.RUNNING
    )
    assert transition(ExecutionState.RUNNING, LifecycleEvent.PAUSE) is (
        ExecutionState.PAUSED
    )
    assert transition(ExecutionState.PAUSED, LifecycleEvent.RESUME) is (
        ExecutionState.RUNNING
    )
    assert transition(ExecutionState.RUNNING, LifecycleEvent.COMPLETE) is (
        ExecutionState.COMPLETED
    )
    assert transition(ExecutionState.RUNNING, LifecycleEvent.FAIL) is (
        ExecutionState.FAILED
    )
    assert transition(ExecutionState.RUNNING, LifecycleEvent.CANCEL) is (
        ExecutionState.CANCELLED
    )


def test_the_retry_edge_leaves_running_rather_than_failed() -> None:
    # Section 6.1 draws `failed -> retrying` and calls `failed` terminal.
    # Both cannot hold, so the retry decision is taken when the attempt
    # fails: `running -> retrying -> running`, and `failed` absorbs.
    assert transition(ExecutionState.RUNNING, LifecycleEvent.RETRY) is (
        ExecutionState.RETRYING
    )
    assert transition(ExecutionState.RETRYING, LifecycleEvent.START) is (
        ExecutionState.RUNNING
    )
    assert not can_transition(ExecutionState.FAILED, LifecycleEvent.RETRY)


def test_a_move_the_table_does_not_hold_is_refused() -> None:
    with pytest.raises(InvalidTransition, match="does not apply"):
        transition(ExecutionState.CREATED, LifecycleEvent.COMPLETE)
    with pytest.raises(InvalidTransition, match="does not apply"):
        transition(ExecutionState.PAUSED, LifecycleEvent.PAUSE)
    with pytest.raises(InvalidTransition):
        transition(ExecutionState.RUNNING, LifecycleEvent.ASSIGN)


def test_a_terminated_worker_can_be_released_from_wherever_it_stands() -> None:
    for state in ExecutionState:
        if is_terminal(state):
            continue
        assert transition(state, LifecycleEvent.TERMINATE) is (
            ExecutionState.TERMINATED
        )
        assert transition(state, LifecycleEvent.CANCEL) is ExecutionState.CANCELLED


def test_nothing_else_declares_a_state() -> None:
    # "No adapter module imports a state constant directly": the states are
    # declared once, and everything that carries one is annotated with the
    # declaration rather than with a vocabulary of its own.
    states = {member.value for member in ExecutionState}
    for found in pkgutil.iter_modules(orchestration.__path__):
        module = importlib.import_module(f"datalayer_core.orchestration.{found.name}")
        for member in vars(module).values():
            if not isinstance(member, type) or not issubclass(member, Enum):
                continue
            if member.__module__ != module.__name__:
                continue
            # An enum whose every value is a state name is a second
            # declaration of the states. `AcknowledgementKind` shares the
            # word "completed" with them and is not one of them.
            values = {item.value for item in member}
            assert not values <= states or member is ExecutionState
    assert ExecutionState.__module__ == "datalayer_core.orchestration.lifecycle"
    assert Execution.model_fields["status"].annotation is ExecutionState
    assert Attempt.model_fields["state"].annotation is ExecutionState
