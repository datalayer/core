# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""
The twelve commands (PLAN_ORCHESTRATOR.md, sections 6.2, 6.4, O0-03).

Protocol-neutral by construction: nothing here knows about HTTP, JSON-RPC,
A2A or ACP. The same ``executions.delegate`` is what a browser posts, what
the CLI sends and what a parent agent asks for, and the adapter that turns
it into a protocol operation is somewhere else entirely (section 7).

Every mutating command carries an idempotency key, and that is enforced by
the type rather than by a rule somebody has to remember: a mutating command
is a ``MutatingCommand``, and a ``MutatingCommand`` without a key does not
validate. Section 6.4 asks for this because duplicate delivery is ordinary —
a client retries, a queue redelivers, a person clicks twice — and the second
delivery of a delegation must find the first execution rather than start a
second one.

Reading commands — discover, collect, subscribe — take no key: repeating
them costs a query and changes nothing.

The commands here are requests. What comes back is the rest of this package:
descriptors, executions, artifacts, acknowledgements and events.
"""

from __future__ import annotations

from enum import Enum
from types import MappingProxyType
from typing import Any, Literal, Mapping

from pydantic import Field

from datalayer_core.orchestration.artifacts import ArtifactType
from datalayer_core.orchestration.base import CanonicalModel, Timestamp
from datalayer_core.orchestration.context import ContextManifest, ContextReference
from datalayer_core.orchestration.descriptor import (
    AgentProtocol,
    DataClassification,
    RuntimeRequirements,
    TrustLevel,
    WorkerOperation,
)
from datalayer_core.orchestration.execution import (
    AgentBinding,
    Objective,
    Policy,
    Recovery,
    Trace,
)
from datalayer_core.orchestration.lifecycle import LifecycleEvent


class CommandName(str, Enum):
    """The twelve commands of section 6.2."""

    AGENTS_DISCOVER = "agents.discover"
    AGENTS_CREATE = "agents.create"
    AGENTS_ATTACH = "agents.attach"
    EXECUTIONS_DELEGATE = "executions.delegate"
    EXECUTIONS_STEER = "executions.steer"
    EXECUTIONS_PAUSE = "executions.pause"
    EXECUTIONS_RESUME = "executions.resume"
    EXECUTIONS_CANCEL = "executions.cancel"
    EXECUTIONS_CHECKPOINT = "executions.checkpoint"
    EXECUTIONS_COLLECT = "executions.collect"
    EXECUTIONS_TERMINATE = "executions.terminate"
    EXECUTIONS_SUBSCRIBE = "executions.subscribe"


class Command(CanonicalModel):
    """What every command carries, whatever it asks for."""

    command: CommandName
    issued_at: Timestamp | None = Field(
        default=None,
        description="From the caller, for acceptance latency.",
    )
    traceparent: str | None = Field(
        default=None,
        description="The W3C context of the caller, so the tree is one trace.",
    )


class ReadCommand(Command):
    """A command that changes nothing, and so needs no idempotency key."""


class MutatingCommand(Command):
    """
    A command that changes something, and so must be safe to deliver twice.

    The key is the caller's: the same key with the same intent finds the
    work the first delivery started, and the same key with a different
    intent is a conflict rather than a second execution.
    """

    idempotency_key: str = Field(min_length=1)


class AgentsDiscover(ReadCommand):
    """Find workers matching capabilities and constraints."""

    command: Literal[CommandName.AGENTS_DISCOVER] = CommandName.AGENTS_DISCOVER
    capabilities: list[str] = Field(default_factory=list)
    protocols: list[AgentProtocol] = Field(default_factory=list)
    operations: list[WorkerOperation] = Field(
        default_factory=list,
        description="Only workers supporting all of these are returned.",
    )
    data_classification: DataClassification | None = None
    minimum_trust_level: TrustLevel | None = None
    region: str | None = None
    limit: int = 20


class AgentsCreate(MutatingCommand):
    """Provision or launch a worker."""

    command: Literal[CommandName.AGENTS_CREATE] = CommandName.AGENTS_CREATE
    agent_id: str = Field(description="The descriptor to bring up.")
    protocol: AgentProtocol
    runtime: RuntimeRequirements = Field(default_factory=RuntimeRequirements)


class AgentsAttach(MutatingCommand):
    """Attach to an agent or a session that is already there."""

    command: Literal[CommandName.AGENTS_ATTACH] = CommandName.AGENTS_ATTACH
    agent_id: str
    protocol: AgentProtocol
    endpoint: str | None = None
    session_id: str | None = Field(
        default=None,
        description="An existing protocol session to load rather than open.",
    )


class ExecutionsDelegate(MutatingCommand):
    """
    Assign an objective and a context to a worker.

    The command that creates an execution. A child names its parent; a root
    does not, and the control plane is what decides the identifiers, the
    depth and the root — never the caller, because a caller that chose its
    own depth could delegate past the limit by saying it had not.
    """

    command: Literal[CommandName.EXECUTIONS_DELEGATE] = CommandName.EXECUTIONS_DELEGATE
    parent_execution_id: str | None = None
    agent: AgentBinding
    objective: Objective
    context: ContextManifest = Field(default_factory=ContextManifest)
    policy: Policy = Field(default_factory=Policy)
    recovery: Recovery = Field(default_factory=Recovery)
    trace: Trace = Field(default_factory=Trace)


class ExecutionsSteer(MutatingCommand):
    """Add instructions, and possibly context, while the work is active."""

    command: Literal[CommandName.EXECUTIONS_STEER] = CommandName.EXECUTIONS_STEER
    execution_id: str
    instructions: str
    references: list[ContextReference] = Field(default_factory=list)


class ExecutionsPause(MutatingCommand):
    """Request a recoverable pause."""

    command: Literal[CommandName.EXECUTIONS_PAUSE] = CommandName.EXECUTIONS_PAUSE
    execution_id: str
    reason: str | None = None


class ExecutionsResume(MutatingCommand):
    """Resume from the current state, or from a checkpoint."""

    command: Literal[CommandName.EXECUTIONS_RESUME] = CommandName.EXECUTIONS_RESUME
    execution_id: str
    checkpoint_id: str | None = None


class ExecutionsCancel(MutatingCommand):
    """Stop the work without deleting its history."""

    command: Literal[CommandName.EXECUTIONS_CANCEL] = CommandName.EXECUTIONS_CANCEL
    execution_id: str
    reason: str | None = None
    cascade: bool = Field(
        default=True,
        description="Cancel the executions below this one too.",
    )


class ExecutionsCheckpoint(MutatingCommand):
    """Persist recoverable state."""

    command: Literal[CommandName.EXECUTIONS_CHECKPOINT] = (
        CommandName.EXECUTIONS_CHECKPOINT
    )
    execution_id: str
    label: str | None = None


class ExecutionsCollect(ReadCommand):
    """Retrieve the registered results and artifacts."""

    command: Literal[CommandName.EXECUTIONS_COLLECT] = CommandName.EXECUTIONS_COLLECT
    execution_id: str
    include_children: bool = False
    artifact_types: list[ArtifactType] = Field(default_factory=list)


class ExecutionsTerminate(MutatingCommand):
    """
    Release the worker or session, where that is permitted.

    Whether an execution may terminate a worker another execution is
    attached to is open in 19.8 and is decided in Phase 1; the flag is here
    so the answer has somewhere to live.
    """

    command: Literal[CommandName.EXECUTIONS_TERMINATE] = (
        CommandName.EXECUTIONS_TERMINATE
    )
    execution_id: str
    release_worker: bool = True
    reason: str | None = None


class ExecutionsSubscribe(ReadCommand):
    """Stream canonical events and state changes."""

    command: Literal[CommandName.EXECUTIONS_SUBSCRIBE] = (
        CommandName.EXECUTIONS_SUBSCRIBE
    )
    execution_id: str
    include_children: bool = True
    from_sequence: int | None = Field(
        default=None,
        description="Replay from this event onwards, so a reconnect loses nothing.",
    )
    events: list[LifecycleEvent] = Field(
        default_factory=list,
        description="Only these lifecycle events; empty means every event.",
    )


#: Every command by name. The one place that says which model a command is,
#: so a caller reading a wire document does not switch on the name itself.
COMMAND_MODELS: Mapping[CommandName, type[Command]] = MappingProxyType(
    {
        CommandName.AGENTS_DISCOVER: AgentsDiscover,
        CommandName.AGENTS_CREATE: AgentsCreate,
        CommandName.AGENTS_ATTACH: AgentsAttach,
        CommandName.EXECUTIONS_DELEGATE: ExecutionsDelegate,
        CommandName.EXECUTIONS_STEER: ExecutionsSteer,
        CommandName.EXECUTIONS_PAUSE: ExecutionsPause,
        CommandName.EXECUTIONS_RESUME: ExecutionsResume,
        CommandName.EXECUTIONS_CANCEL: ExecutionsCancel,
        CommandName.EXECUTIONS_CHECKPOINT: ExecutionsCheckpoint,
        CommandName.EXECUTIONS_COLLECT: ExecutionsCollect,
        CommandName.EXECUTIONS_TERMINATE: ExecutionsTerminate,
        CommandName.EXECUTIONS_SUBSCRIBE: ExecutionsSubscribe,
    }
)

#: The commands that change something, derived from the models rather than
#: listed again: a command is mutating because it is a `MutatingCommand`.
MUTATING_COMMANDS: frozenset[CommandName] = frozenset(
    name for name, model in COMMAND_MODELS.items() if issubclass(model, MutatingCommand)
)


def is_mutating(command: CommandName) -> bool:
    """
    Say whether this command needs an idempotency key.

    Parameters
    ----------
    command : CommandName
        The command to test.

    Returns
    -------
    bool
        True when the command changes something.
    """
    return CommandName(command) in MUTATING_COMMANDS


def parse_command(payload: dict[str, Any]) -> Command:
    """
    Read a wire document as whichever of the twelve commands it says it is.

    Parameters
    ----------
    payload : dict[str, Any]
        The command as it arrived.

    Returns
    -------
    Command
        The validated command.

    Raises
    ------
    ValueError
        When the document names no command, or names one that does not exist.
    """
    named = payload.get("command")
    if named is None:
        raise ValueError("A command must name itself in 'command'.")
    try:
        name = CommandName(named)
    except ValueError:
        raise ValueError(
            f"'{named}' is not one of the twelve commands: "
            f"{', '.join(member.value for member in CommandName)}."
        ) from None
    return COMMAND_MODELS[name].from_wire(payload)
