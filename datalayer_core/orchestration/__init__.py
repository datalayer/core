# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""
The canonical orchestration model (PLAN_ORCHESTRATOR.md, O0-01 to O0-03, O0-08 to O0-10).

One agent discovers, delegates to, supervises, steers, recovers and
terminates others. This package is what all of that is said in: the agent
descriptor, the execution and its attempts, the context manifest, the
artifacts, the lifecycle, the twelve commands, the five acknowledgements,
the event envelope and the error record.

Three decisions live here as code rather than as prose, because each of them
has to come out the same wherever it is taken:

- **What a worker is, whatever it speaks** (O0-08). ``descriptor`` reads an
  A2A agent card, an ACP registry entry and a Datalayer agentspec into one
  descriptor and writes a card back out, reporting every field the source
  could not state and every field the descriptor could not keep. Nothing is
  guessed: a scheduler cannot tell an invented cost hint from a real one.
- **Whether an execution may proceed on the context it was given** (O0-09).
  ``context`` parses and validates the reference form 19.8 decided and holds
  a manifest against what a resolver found — refusing a required reference
  that was denied, is gone, or whose pin has moved, and keeping every
  reference it could not use rather than quietly shrinking the manifest.
  Minting the grant that makes a reference readable is O1-06.
- **Which of two attempts owns the result** (O0-10). ``artifacts`` holds
  19.8's fourth decision: the first attempt to reach commit wins, and a
  later one is registered with its provenance and marked superseded.

It is framework-neutral and transport-neutral by construction. Nothing here
imports an adapter, a client, HTTP or a protocol library, and nothing here
knows whether the worker at the other end speaks A2A, ACP or nothing at all
(section 2). Adapters, stores and control planes are built on this package;
this package is built on pydantic and the standard library.

It lives in `core` (19.8) because `core` is already the typed client the
app, the CLI and the services share, and because a second copy of these
types in another repository is how they drift. These models are the source
of truth: the TypeScript in `src/api/orchestration/generated.ts` is
generated from their JSON Schema by `scripts/generate-orchestration-types.py`
and guarded by `npm run check:orchestration-generated`.

`fixtures/orchestration-v1.json` is the same document in both languages: the
Python suite validates and re-serializes it, and the vitest suite checks the
same file against the generated types. A field that exists on one side and
not the other fails there.
"""

from datalayer_core.orchestration.artifacts import (
    Artifact,
    ArtifactCommit,
    ArtifactProvenance,
    ArtifactStatus,
    ArtifactType,
    commit_artifacts,
)
from datalayer_core.orchestration.base import (
    CanonicalModel,
    Timestamp,
    check_rfc3339,
    instant,
)
from datalayer_core.orchestration.commands import (
    COMMAND_MODELS,
    MUTATING_COMMANDS,
    AgentsAttach,
    AgentsCreate,
    AgentsDiscover,
    Command,
    CommandName,
    ExecutionsCancel,
    ExecutionsCheckpoint,
    ExecutionsCollect,
    ExecutionsDelegate,
    ExecutionsPause,
    ExecutionsResume,
    ExecutionsSteer,
    ExecutionsSubscribe,
    ExecutionsTerminate,
    MutatingCommand,
    ReadCommand,
    binding_for,
    command_idempotency_key,
    is_mutating,
    parse_command,
)
from datalayer_core.orchestration.context import (
    CONTEXT_URI,
    ContextAccess,
    ContextKind,
    ContextManifest,
    ContextMaterialization,
    ContextReference,
    ContextSharing,
    ManifestResolution,
    ReferenceResolution,
    ReferenceStatus,
    format_context_uri,
    parse_context_uri,
    resolve_manifest,
)
from datalayer_core.orchestration.descriptor import (
    A2A_CARD_CANNOT_STATE,
    A2A_CARD_NOT_KEPT,
    ACP_ENTRY_CANNOT_STATE,
    ACP_ENTRY_NOT_KEPT,
    AGENTSPEC_CANNOT_STATE,
    AGENTSPEC_NOT_KEPT,
    AgentAuthentication,
    AgentCardMapping,
    AgentDescriptor,
    AgentProtocol,
    AgentSkill,
    Availability,
    CostHint,
    DataClassification,
    DescriptorMapping,
    DescriptorSource,
    LatencyHint,
    MappingGap,
    ProtocolEndpoint,
    RuntimeRequirements,
    TrustLevel,
    WorkerOperation,
    from_acp_agent,
    from_agent_card,
    from_agentspec,
    to_agent_card,
)
from datalayer_core.orchestration.errors import ErrorCode, OrchestrationError
from datalayer_core.orchestration.events import (
    ACKNOWLEDGEMENT_ORDER,
    Acknowledgement,
    AcknowledgementKind,
    ExecutionEvent,
    ExecutionEventType,
)
from datalayer_core.orchestration.execution import (
    DEFAULT_MAX_CHILDREN_PER_PARENT,
    DEFAULT_MAX_DEPTH,
    DEFAULT_MAX_EXECUTIONS_PER_TREE,
    DEFAULT_MAX_RETRIES,
    AgentBinding,
    Attempt,
    Budget,
    DelegationLimits,
    Execution,
    Objective,
    Permissions,
    Policy,
    Recovery,
    RetryPolicy,
    Trace,
    Usage,
)
from datalayer_core.orchestration.lifecycle import (
    INITIAL_STATE,
    TERMINAL_STATES,
    TRANSITIONS,
    ExecutionState,
    InvalidTransition,
    LifecycleEvent,
    can_transition,
    is_terminal,
    transition,
)

__all__ = [
    "A2A_CARD_CANNOT_STATE",
    "A2A_CARD_NOT_KEPT",
    "ACKNOWLEDGEMENT_ORDER",
    "ACP_ENTRY_CANNOT_STATE",
    "ACP_ENTRY_NOT_KEPT",
    "AGENTSPEC_CANNOT_STATE",
    "AGENTSPEC_NOT_KEPT",
    "COMMAND_MODELS",
    "CONTEXT_URI",
    "DEFAULT_MAX_CHILDREN_PER_PARENT",
    "DEFAULT_MAX_DEPTH",
    "DEFAULT_MAX_EXECUTIONS_PER_TREE",
    "DEFAULT_MAX_RETRIES",
    "INITIAL_STATE",
    "MUTATING_COMMANDS",
    "TERMINAL_STATES",
    "TRANSITIONS",
    "Acknowledgement",
    "AcknowledgementKind",
    "AgentAuthentication",
    "AgentBinding",
    "AgentCardMapping",
    "AgentDescriptor",
    "AgentProtocol",
    "AgentSkill",
    "AgentsAttach",
    "AgentsCreate",
    "AgentsDiscover",
    "Artifact",
    "ArtifactCommit",
    "ArtifactProvenance",
    "ArtifactStatus",
    "ArtifactType",
    "Attempt",
    "Availability",
    "Budget",
    "CanonicalModel",
    "Command",
    "CommandName",
    "ContextAccess",
    "ContextKind",
    "ContextManifest",
    "ContextMaterialization",
    "ContextReference",
    "ContextSharing",
    "CostHint",
    "DataClassification",
    "DelegationLimits",
    "DescriptorMapping",
    "DescriptorSource",
    "ErrorCode",
    "Execution",
    "ExecutionEvent",
    "ExecutionEventType",
    "ExecutionState",
    "ExecutionsCancel",
    "ExecutionsCheckpoint",
    "ExecutionsCollect",
    "ExecutionsDelegate",
    "ExecutionsPause",
    "ExecutionsResume",
    "ExecutionsSteer",
    "ExecutionsSubscribe",
    "ExecutionsTerminate",
    "InvalidTransition",
    "LatencyHint",
    "LifecycleEvent",
    "ManifestResolution",
    "MappingGap",
    "MutatingCommand",
    "Objective",
    "OrchestrationError",
    "Permissions",
    "Policy",
    "ProtocolEndpoint",
    "ReadCommand",
    "Recovery",
    "ReferenceResolution",
    "ReferenceStatus",
    "RetryPolicy",
    "RuntimeRequirements",
    "Timestamp",
    "Trace",
    "TrustLevel",
    "Usage",
    "WorkerOperation",
    "binding_for",
    "can_transition",
    "check_rfc3339",
    "command_idempotency_key",
    "commit_artifacts",
    "format_context_uri",
    "from_acp_agent",
    "from_agent_card",
    "from_agentspec",
    "instant",
    "is_mutating",
    "is_terminal",
    "parse_command",
    "parse_context_uri",
    "resolve_manifest",
    "to_agent_card",
    "transition",
]
