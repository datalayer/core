# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""
The canonical execution lifecycle (PLAN_ORCHESTRATOR.md, sections 6.1, O0-02).

The states and the moves between them are data, and one function reads that
data. Adapters observe what a protocol tells them and report it; they never
decide what the canonical state becomes, because a worker that can invent a
transition can report success it never reached.

Two places where this table is not the picture in section 6.1, and why:

- The diagram draws ``failed -> retrying``, and the same section names
  ``failed`` terminal. Both cannot hold: a terminal state absorbs. The retry
  decision belongs to the moment an attempt fails, before failure is
  declared, which is also what section 6.4 asks for when it says to
  reconcile the remote state before retrying — so ``retry`` leaves
  ``running`` and ``failed`` absorbs.
- The diagram never enters ``terminated``, yet section 6.1 names it
  terminal and section 6.2 has ``executions.terminate``. Every state that is
  not already terminal accepts ``terminate``; without that the state is
  unreachable and the command has nowhere to land.

Cancellation is likewise accepted from every non-terminal state. An
execution waiting on an approval or paused for a person is exactly the one
somebody cancels, and section 6.2 asks cancellation to stop work rather than
to require it to be running first.

A lease that expired is not a transition. Section 6.4 says to treat it as
unknown before declaring failure, so the state stays where it is until the
control plane reconciles with the worker and then fails, retries or resumes.
"""

from __future__ import annotations

from enum import Enum
from types import MappingProxyType
from typing import Mapping


class ExecutionState(str, Enum):
    """Where an execution has got to."""

    CREATED = "created"
    ASSIGNED = "assigned"
    RUNNING = "running"
    WAITING = "waiting"
    PAUSED = "paused"
    RETRYING = "retrying"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    TERMINATED = "terminated"


class LifecycleEvent(str, Enum):
    """What is observed or commanded, which may move an execution."""

    ASSIGN = "assign"
    START = "start"
    WAIT = "wait"
    PAUSE = "pause"
    RESUME = "resume"
    RETRY = "retry"
    COMPLETE = "complete"
    FAIL = "fail"
    CANCEL = "cancel"
    TERMINATE = "terminate"


#: The state of an execution that has been created and nothing more.
INITIAL_STATE: ExecutionState = ExecutionState.CREATED

#: The states from which nothing more happens (section 6.1).
TERMINAL_STATES: frozenset[ExecutionState] = frozenset(
    {
        ExecutionState.COMPLETED,
        ExecutionState.FAILED,
        ExecutionState.CANCELLED,
        ExecutionState.TERMINATED,
    }
)

#: Every non-terminal state accepts these, for the reasons in the module
#: docstring: an execution can be cancelled or its worker released wherever
#: it stands.
_ALWAYS: Mapping[LifecycleEvent, ExecutionState] = MappingProxyType(
    {
        LifecycleEvent.CANCEL: ExecutionState.CANCELLED,
        LifecycleEvent.TERMINATE: ExecutionState.TERMINATED,
        LifecycleEvent.FAIL: ExecutionState.FAILED,
    }
)


def _moves(**moves: ExecutionState) -> Mapping[LifecycleEvent, ExecutionState]:
    """
    Return one state's moves: the ones it declares, over the ones every state has.

    Parameters
    ----------
    **moves : ExecutionState
        The state reached by each lifecycle event, keyed by event value.

    Returns
    -------
    Mapping[LifecycleEvent, ExecutionState]
        The moves of one state, read-only.
    """
    declared = {LifecycleEvent(event): state for event, state in moves.items()}
    return MappingProxyType({**_ALWAYS, **declared})


#: The lifecycle, as data. Terminal states declare no move at all, which is
#: what makes them absorbing rather than a convention a caller has to know.
TRANSITIONS: Mapping[ExecutionState, Mapping[LifecycleEvent, ExecutionState]] = (
    MappingProxyType(
        {
            ExecutionState.CREATED: _moves(assign=ExecutionState.ASSIGNED),
            ExecutionState.ASSIGNED: _moves(
                start=ExecutionState.RUNNING, retry=ExecutionState.RETRYING
            ),
            ExecutionState.RUNNING: _moves(
                wait=ExecutionState.WAITING,
                pause=ExecutionState.PAUSED,
                retry=ExecutionState.RETRYING,
                complete=ExecutionState.COMPLETED,
            ),
            ExecutionState.WAITING: _moves(
                resume=ExecutionState.RUNNING, retry=ExecutionState.RETRYING
            ),
            ExecutionState.PAUSED: _moves(resume=ExecutionState.RUNNING),
            ExecutionState.RETRYING: _moves(start=ExecutionState.RUNNING),
            ExecutionState.COMPLETED: MappingProxyType({}),
            ExecutionState.FAILED: MappingProxyType({}),
            ExecutionState.CANCELLED: MappingProxyType({}),
            ExecutionState.TERMINATED: MappingProxyType({}),
        }
    )
)


class InvalidTransition(ValueError):
    """A move the lifecycle does not allow, refused rather than performed."""

    def __init__(self, current: ExecutionState, event: LifecycleEvent) -> None:
        """
        Record which move was refused, so the caller can say so.

        Parameters
        ----------
        current : ExecutionState
            The state the execution is in.
        event : LifecycleEvent
            The event that does not apply to it.
        """
        self.current = current
        self.event = event
        reason = (
            "it is terminal"
            if is_terminal(current)
            else "that event does not apply there"
        )
        super().__init__(
            f"An execution in '{current.value}' cannot take '{event.value}': {reason}."
        )


def is_terminal(state: ExecutionState) -> bool:
    """
    Say whether nothing more happens from this state.

    Parameters
    ----------
    state : ExecutionState
        The state to test.

    Returns
    -------
    bool
        True when the state is terminal.
    """
    return ExecutionState(state) in TERMINAL_STATES


def can_transition(current: ExecutionState, event: LifecycleEvent) -> bool:
    """
    Say whether the event applies to the state, without moving anything.

    Parameters
    ----------
    current : ExecutionState
        The state the execution is in.
    event : LifecycleEvent
        The event observed or commanded.

    Returns
    -------
    bool
        True when the move is allowed.
    """
    return LifecycleEvent(event) in TRANSITIONS[ExecutionState(current)]


def transition(current: ExecutionState, event: LifecycleEvent) -> ExecutionState:
    """
    Return the state this event leads to, or refuse the move.

    This is the one place a canonical state changes. An adapter reporting
    what a protocol said comes through here, so a worker cannot talk an
    execution out of a terminal state or into one it never reached.

    Parameters
    ----------
    current : ExecutionState
        The state the execution is in.
    event : LifecycleEvent
        The event observed or commanded.

    Returns
    -------
    ExecutionState
        The state after the event.

    Raises
    ------
    InvalidTransition
        When the lifecycle does not allow the move.
    """
    state, moved_by = ExecutionState(current), LifecycleEvent(event)
    try:
        return TRANSITIONS[state][moved_by]
    except KeyError:
        raise InvalidTransition(state, moved_by) from None
