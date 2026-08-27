# Copyright (c) 2023-2026 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""
The records of the Jupyter MCP Server, as the CLI and the SDK read them.

Tasks, bindings and audit rows follow the canonical data model of the
gateway; the connected agents are IAM's OAuth grants. The gateway declares no
schema for them yet — its OpenAPI document names routes, not documents — so
these are written by hand from the model and take extra fields as they come:
a field the gateway adds is carried, not refused.

Snake case throughout: this is the wire.
"""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

McpTaskStatus = Literal["working", "input_required", "completed", "failed", "cancelled"]
McpBindingKind = Literal["notebook", "toolset", "sandbox"]
McpAuditDecision = Literal["allowed", "refused"]
McpAuditOutcome = Literal["ok", "error", "is_error"]
McpPolicyLayer = Literal["platform", "organization", "team", "personal"]

#: The task statuses from which nothing more happens.
TERMINAL_TASK_STATUSES: frozenset[str] = frozenset({"completed", "failed", "cancelled"})


class _Wire(BaseModel):
    model_config = ConfigDict(extra="allow")


class McpTaskOutput(_Wire):
    index: int
    output_type: str
    mime_type: str | None = None
    text: str | None = None
    reference: str | None = None


class McpTask(_Wire):
    uid: str
    status: McpTaskStatus
    status_message: str | None = None
    tool: str
    notebook_uid: str | None = None
    cell_id: str | None = None
    sandbox_uid: str | None = None
    operation_uid: str | None = None
    attachment_uid: str | None = None
    approval_uid: str | None = None
    sandbox_binding_uid: str | None = None
    initiating_user: str = ""
    initiating_client: str | None = None
    org_uid: str | None = None
    created_at: str = ""
    last_updated_at: str = ""
    ttl_ms: int | None = None
    poll_interval_ms: int | None = None
    result: Any = None
    error: str | None = None
    trace_id: str | None = None
    workflow_engine: str | None = None
    workflow_id: str | None = None
    workflow_run_id: str | None = None
    queue: str | None = None
    sandbox_provider: str | None = None
    worker_replica: str | None = None
    outputs: list[McpTaskOutput] = Field(default_factory=list)


class McpTaskList(_Wire):
    items: list[McpTask] = Field(default_factory=list)
    next_cursor: str | None = None


class McpBinding(_Wire):
    uid: str
    kind: McpBindingKind
    user_uid: str = ""
    client_id: str | None = None
    agent_uid: str | None = None
    org_uid: str | None = None
    alias: str | None = None
    item_uid: str | None = None
    source_uid: str | None = None
    session_uid: str | None = None
    sandbox_uid: str | None = None
    sandbox_provider: str | None = None
    capabilities: list[str] = Field(default_factory=list)
    on_lost: str | None = None
    worker_replica: str | None = None
    shared_from: str | None = None
    sandbox_binding_uid: str | None = None
    state: str | None = None
    created_at: str = ""
    last_used_at: str | None = None
    expires_at: str | None = None


class McpBindingList(_Wire):
    items: list[McpBinding] = Field(default_factory=list)
    next_cursor: str | None = None


class McpAuditEvent(_Wire):
    uid: str
    at: str
    org_uid: str | None = None
    team_uid: str | None = None
    user_uid: str = ""
    client_id: str | None = None
    agent_uid: str | None = None
    act: list[str] = Field(default_factory=list)
    method: str = ""
    tool: str | None = None
    item_uid: str | None = None
    source_uid: str | None = None
    cell_id: str | None = None
    arguments_hash: str | None = None
    redacted_arguments: dict[str, Any] | None = None
    decision: McpAuditDecision
    refusal_reason: str | None = None
    outcome: McpAuditOutcome | None = None
    duration_ms: float | None = None
    task_id: str | None = None
    trace_id: str | None = None
    replica: str | None = None
    protocol_version: str | None = None
    client_info: dict[str, Any] | None = None


class McpAuditEventList(_Wire):
    items: list[McpAuditEvent] = Field(default_factory=list)
    next_cursor: str | None = None


class McpPolicyRule(_Wire):
    name: str
    value: Any = None
    decided_by: McpPolicyLayer
    reason: str | None = None


class McpToolRule(_Wire):
    tool: str
    scope: str
    access: str | None = None
    approval: str | None = None
    allowed: bool = True
    decided_by: McpPolicyLayer = "platform"


class McpEffectivePolicy(_Wire):
    scope: Literal["personal", "organization"] = "personal"
    org_uid: str | None = None
    team_uid: str | None = None
    client_id: str | None = None
    scopes: list[str] = Field(default_factory=list)
    rules: list[McpPolicyRule] = Field(default_factory=list)
    tools: list[McpToolRule] = Field(default_factory=list)
    evaluated_at: str | None = None


class McpActiveClient(_Wire):
    client_id: str
    client_name: str | None = None
    grant_uid: str | None = None
    scopes: list[str] = Field(default_factory=list)
    connected_at: str | None = None
    last_call: McpAuditEvent | None = None


class McpActivityCounts(_Wire):
    calls: int = 0
    refusals: int = 0
    tasks: int = 0
    credits: float = 0


class McpActivity(_Wire):
    at: str = ""
    org_uid: str | None = None
    clients: list[McpActiveClient] = Field(default_factory=list)
    sandboxes: list[McpBinding] = Field(default_factory=list)
    tasks: list[McpTask] = Field(default_factory=list)
    calls: list[McpAuditEvent] = Field(default_factory=list)
    today: McpActivityCounts = Field(default_factory=McpActivityCounts)


class ConnectedAgentScope(_Wire):
    name: str
    title: str = ""
    description: str = ""


class ConnectedAgent(_Wire):
    """An OAuth grant of IAM: one agent a person connected."""

    uid: str
    client_id: str = ""
    client_name: str = ""
    scopes: list[str] = Field(default_factory=list)
    scope_details: list[ConnectedAgentScope] = Field(default_factory=list)
    resource: str = ""
    created_at: str | None = None
    last_used_at: str | None = None


def is_task_terminal(task: McpTask) -> bool:
    return task.status in TERMINAL_TASK_STATUSES


def is_cimd_client_id(client_id: str) -> bool:
    """
    Whether a client id is a Client ID Metadata Document URL.

    ``https``, a host and a path, no fragment: such a client registered by
    URL rather than through dynamic client registration.
    """
    if not client_id.startswith("https://") or "#" in client_id:
        return False
    rest = client_id[len("https://") :]
    host, _, path = rest.partition("/")
    return bool(host) and bool(path)
