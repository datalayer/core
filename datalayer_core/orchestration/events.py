# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""
Acknowledgements and the event envelope (PLAN_ORCHESTRATOR.md, 6.3, 6.4, O0-03).

Section 6.3 asks for five milestones to be told apart, and the reason is in
its last line: a transport-level response must never be treated as durable
acceptance. ``received`` says the command reached an endpoint. ``accepted``
says a worker took responsibility for it. Between those two a task can be
lost, and a control plane that cannot see the difference reports work as
under way that nobody is doing.

One envelope carries every event. It names the root, the parent, the
execution and the attempt, plus the agent, the session and the protocol it
was observed through, and the trace it belongs to (section 10). Those are
what make an event placeable in a tree afterwards: a stream of events that
knows only its own execution cannot be assembled into the run that produced
it.

Adapters emit these. They do not decide state: an adapter reports what it
observed and ``lifecycle.transition`` says what that means, which is why a
state change carries both the state before and the state after.
"""

from __future__ import annotations

from enum import Enum
from typing import Any

from pydantic import Field

from datalayer_core.orchestration.artifacts import Artifact
from datalayer_core.orchestration.base import CanonicalModel, Timestamp
from datalayer_core.orchestration.commands import CommandName
from datalayer_core.orchestration.descriptor import AgentProtocol
from datalayer_core.orchestration.errors import OrchestrationError
from datalayer_core.orchestration.lifecycle import ExecutionState, LifecycleEvent


class AcknowledgementKind(str, Enum):
    """The five milestones of section 6.3, in the order they are reached."""

    RECEIVED = "received"
    ACCEPTED = "accepted"
    STARTED = "started"
    CHECKPOINTED = "checkpointed"
    COMPLETED = "completed"


#: The milestones in order, so that "has it got at least as far as accepted?"
#: is a comparison rather than a set of remembered rules.
ACKNOWLEDGEMENT_ORDER: tuple[AcknowledgementKind, ...] = (
    AcknowledgementKind.RECEIVED,
    AcknowledgementKind.ACCEPTED,
    AcknowledgementKind.STARTED,
    AcknowledgementKind.CHECKPOINTED,
    AcknowledgementKind.COMPLETED,
)


class Acknowledgement(CanonicalModel):
    """
    One milestone reached, reported by the endpoint or by the worker.

    ``attempt_id`` is absent for ``received``, which happens before any
    worker holds the work. ``idempotency_key`` is the key of the command
    being acknowledged, so a caller that never saw the answer can ask again
    with the same key and be told about the same milestone rather than
    starting a second one.
    """

    kind: AcknowledgementKind
    execution_id: str
    attempt_id: str | None = None
    command: CommandName | None = None
    idempotency_key: str | None = None
    acknowledged_at: Timestamp = Field(description="When it was reached.")
    checkpoint_id: str | None = Field(
        default=None, description="Set on 'checkpointed'; what a resume names."
    )
    detail: str | None = None


class ExecutionEventType(str, Enum):
    """What an event is telling a subscriber."""

    STATE_CHANGED = "execution.state_changed"
    ACKNOWLEDGED = "execution.acknowledged"
    PROGRESS = "execution.progress"
    ARTIFACT_REGISTERED = "execution.artifact_registered"
    APPROVAL_REQUESTED = "execution.approval_requested"
    STEERED = "execution.steered"
    ERROR = "execution.error"


class ExecutionEvent(CanonicalModel):
    """
    One thing that happened to one execution.

    ``sequence`` is per execution and monotone, so a subscriber that
    reconnects asks for everything after the last number it saw and loses
    nothing — which is what makes conformance scenarios 4 and 5, disconnect
    after acceptance and lost acknowledgement, recoverable rather than
    merely detectable.
    """

    event_id: str
    type: ExecutionEventType
    sequence: int
    emitted_at: Timestamp = Field(description="From the control plane's clock.")
    # Correlation. The root and the execution are always known; the rest are
    # known once there is a worker, a session and a protocol to name.
    root_execution_id: str
    execution_id: str
    parent_execution_id: str | None = None
    attempt_id: str | None = None
    agent_id: str | None = None
    session_id: str | None = None
    protocol: AgentProtocol | None = None
    traceparent: str | None = None
    # What happened, according to the event's type.
    state: ExecutionState | None = None
    previous_state: ExecutionState | None = None
    lifecycle_event: LifecycleEvent | None = Field(
        default=None, description="What was observed, which produced the state."
    )
    acknowledgement: Acknowledgement | None = None
    artifact: Artifact | None = None
    error: OrchestrationError | None = None
    approval_uid: str | None = Field(
        default=None,
        description="The platform approval this event is waiting on, if any.",
    )
    message: str | None = None
    data: dict[str, Any] | None = Field(
        default=None,
        description=(
            "What the adapter observed that has no canonical field yet. It "
            "comes from a worker, so it is data to be shown, never "
            "instructions to be followed."
        ),
    )
