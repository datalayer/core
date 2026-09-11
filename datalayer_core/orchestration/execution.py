# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""
The execution, and one attempt at it (PLAN_ORCHESTRATOR.md, sections 5.2, O0-01).

An execution is one durable unit of delegated work. It is never called a
task: Task is A2A's word for its own projection of this, and ``mcp_task`` is
the gateway's. A protocol session and a remote task are projections of an
execution; the execution is what survives them.

An attempt is one dispatch of an execution to a worker. Section 6.4 requires
each attempt to have its own identifier, because retries and duplicate
deliveries are only distinguishable if the thing that can happen twice is
named — an execution that completed twice is a bug, an execution with two
attempts of which one completed is ordinary.

The default limits are 19.8's seventh decision, and they are constants here
rather than numbers in a service so that the control plane, the durable
worker and the browser agree on what a tree may do before anybody asks.
"""

from __future__ import annotations

from pydantic import Field

from datalayer_core.orchestration.base import CanonicalModel, Timestamp
from datalayer_core.orchestration.context import ContextManifest
from datalayer_core.orchestration.descriptor import AgentProtocol, DataClassification
from datalayer_core.orchestration.errors import OrchestrationError
from datalayer_core.orchestration.lifecycle import INITIAL_STATE, ExecutionState

#: How deep a tree may go: a root and three levels of workers below it.
DEFAULT_MAX_DEPTH = 3
#: How many children one parent may have at once.
DEFAULT_MAX_CHILDREN_PER_PARENT = 8
#: How many executions one tree may hold in total, root included.
DEFAULT_MAX_EXECUTIONS_PER_TREE = 32
#: How many times a failed attempt is tried again, after the first attempt.
DEFAULT_MAX_RETRIES = 2
#: The first wait before a retry, then multiplied, capped.
DEFAULT_INITIAL_BACKOFF_SECONDS = 1.0
DEFAULT_BACKOFF_MULTIPLIER = 2.0
DEFAULT_MAX_BACKOFF_SECONDS = 60.0


class Objective(CanonicalModel):
    """What the worker is being asked for, and how it will be judged."""

    goal: str
    acceptance_criteria: list[str] = Field(default_factory=list)
    instructions: str | None = Field(
        default=None,
        description="Steering that applies from the start, not added later.",
    )


class Budget(CanonicalModel):
    """
    What the execution may spend.

    Inherited from the parent and split by it (19.8): a child cannot be
    given more than the parent still holds, and no child raises its own.
    ``None`` means the field is not bounded, which is a decision somebody
    made, not an oversight; the control plane refuses an unbounded budget
    where policy requires one.
    """

    input_tokens: int | None = None
    output_tokens: int | None = None
    cost: float | None = None
    currency: str = "USD"
    wall_clock_seconds: int | None = None
    credits: float | None = Field(
        default=None,
        description=(
            "Platform credits the tree's compute may consume, held by IAM in "
            "one reservation for the whole tree (O1-07). Set on the root: the "
            "tree's executions draw on it, and none sets its own."
        ),
    )
    executions: int | None = Field(
        default=None,
        description="How many executions the subtree below this one may create.",
    )


class Permissions(CanonicalModel):
    """
    What the worker may reach beyond its context manifest.

    ``None`` inherits the parent's allowlist; an empty list is the decision
    to allow nothing. The two are different, and collapsing them is how a
    child silently gains every tool its parent had.
    """

    tools: list[str] | None = None
    agents: list[str] | None = None
    sandboxes: bool = False
    network: bool = False


class DelegationLimits(CanonicalModel):
    """The bounds a tree is created under, defaulted to 19.8's decision."""

    max_depth: int = DEFAULT_MAX_DEPTH
    max_children_per_parent: int = DEFAULT_MAX_CHILDREN_PER_PARENT
    max_executions_per_tree: int = DEFAULT_MAX_EXECUTIONS_PER_TREE


class Policy(CanonicalModel):
    """
    Everything that constrains an execution rather than describing it.

    The deadline is absolute and inherited: a child may be given less time
    than its parent has left and never more (19.8).
    """

    deadline: Timestamp | None = Field(
        default=None, description="Absolute, and never extended by a child."
    )
    budget: Budget = Field(default_factory=Budget)
    permissions: Permissions = Field(default_factory=Permissions)
    data_classification: DataClassification | None = None
    limits: DelegationLimits = Field(default_factory=DelegationLimits)
    approval_required: bool = Field(
        default=False,
        description="Whether a person must accept the result before it commits.",
    )


class RetryPolicy(CanonicalModel):
    """How a failed attempt is tried again: 19.8's two retries, backing off."""

    max_retries: int = DEFAULT_MAX_RETRIES
    initial_backoff_seconds: float = DEFAULT_INITIAL_BACKOFF_SECONDS
    backoff_multiplier: float = DEFAULT_BACKOFF_MULTIPLIER
    max_backoff_seconds: float = DEFAULT_MAX_BACKOFF_SECONDS


class Recovery(CanonicalModel):
    """What has to be true for this execution to be recoverable."""

    retry_policy: RetryPolicy = Field(default_factory=RetryPolicy)
    checkpoint_required: bool = True


class Trace(CanonicalModel):
    """
    The W3C context that makes one tree one trace (section 10, O0-11).

    Carried on every command and restored on every worker. A worker that
    drops it shows as a broken link in the trace, which is a fact worth
    seeing, rather than as a second trace nobody connects to the first.
    """

    traceparent: str | None = None
    tracestate: str | None = None


class AgentBinding(CanonicalModel):
    """
    Which worker an execution is bound to, and how it is reached.

    ``session_id`` is the protocol's own handle — an ACP session, an A2A
    context — and it is a projection: section 8 requires the session to be
    reconstructable from Datalayer state, never the other way round.
    """

    agent_id: str
    capability: str
    protocol: AgentProtocol
    endpoint: str | None = None
    session_id: str | None = None


class Attempt(CanonicalModel):
    """
    One dispatch of an execution to a worker (section 6.4).

    ``lease_expires_at`` is when the control plane stops believing the
    worker is still on it. An expired lease is unknown, not failed: the
    control plane reconciles with the protocol before it decides, so the
    state is unchanged until it does.
    """

    attempt_id: str
    execution_id: str
    number: int = Field(description="1 for the first dispatch, then upwards.")
    agent_id: str
    protocol: AgentProtocol
    session_id: str | None = None
    protocol_task_id: str | None = Field(
        default=None,
        description="The A2A task or ACP prompt this attempt became.",
    )
    state: ExecutionState = INITIAL_STATE
    started_at: Timestamp | None = None
    ended_at: Timestamp | None = None
    lease_expires_at: Timestamp | None = None
    error: OrchestrationError | None = None


class Execution(CanonicalModel):
    """
    One durable unit of delegated work.

    ``root_execution_id`` is on every execution, the root's pointing at
    itself, so a tree is one query rather than a walk up a chain of parents.
    ``status`` is the canonical state and only ``lifecycle.transition``
    changes it.
    """

    execution_id: str
    parent_execution_id: str | None = None
    root_execution_id: str
    depth: int = Field(default=0, description="0 at the root, checked against limits.")
    status: ExecutionState = INITIAL_STATE
    status_message: str | None = None
    agent: AgentBinding
    objective: Objective
    context: ContextManifest = Field(default_factory=ContextManifest)
    policy: Policy = Field(default_factory=Policy)
    recovery: Recovery = Field(default_factory=Recovery)
    trace: Trace = Field(default_factory=Trace)
    current_attempt_id: str | None = None
    attempt_count: int = 0
    created_at: Timestamp
    updated_at: Timestamp
    error: OrchestrationError | None = None
