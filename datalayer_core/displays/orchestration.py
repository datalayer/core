# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""
Rich displays for the orchestration control plane: the workers discovered, an
execution, its artifacts, and its event stream as lines (ORCHESTRATOR.md, O1-13).

The words for an event are the ones the app's execution page uses
(``ui/src/views/orchestration/executionViews.ts``), so ``datalayer executions
watch`` and the page say the same thing about the same event. Everything a
worker or a person wrote is put in a cell as text, never read as markup.
"""

from __future__ import annotations

from collections.abc import Iterable

from rich.table import Table
from rich.text import Text

from datalayer_core.orchestration import (
    AgentDescriptor,
    Artifact,
    Execution,
    ExecutionEvent,
    ExecutionEventType,
)

__all__ = [
    "agents_table",
    "artifacts_table",
    "event_line",
    "event_words",
    "execution_table",
]


def _capitalized(word: str) -> str:
    return word[:1].upper() + word[1:]


def _with_message(words: str, message: str | None) -> str:
    return f"{words} — {message}" if message else words


def event_words(event: ExecutionEvent) -> str:
    """One event in words. What a worker put in ``data`` is never read into them."""
    kind = event.type
    if kind is ExecutionEventType.STATE_CHANGED:
        return _with_message(_capitalized(event.state.value if event.state else "moved"), event.message)
    if kind is ExecutionEventType.ACKNOWLEDGED:
        milestone = event.acknowledgement.kind.value if event.acknowledgement else "acknowledged"
        return _with_message(_capitalized(milestone), event.message)
    if kind is ExecutionEventType.ARTIFACT_REGISTERED:
        return f"Registered {event.artifact.name if event.artifact else 'an artifact'}"
    if kind is ExecutionEventType.STEERED:
        return _with_message("Steered", event.message)
    if kind is ExecutionEventType.ERROR:
        if event.error:
            return f"{event.error.code.value}: {event.error.message}"
        return _with_message("Error", event.message)
    return event.message or kind.value


def event_line(event: ExecutionEvent, *, root_execution_id: str | None = None) -> str:
    """One event as a line of ``executions watch``: when, whose when it is a child's, and what."""
    whose = "" if event.execution_id == root_execution_id else f"[{event.execution_id}] "
    return f"{event.emitted_at}  {whose}{event_words(event)}"


def agents_table(agents: Iterable[AgentDescriptor], *, title: str | None = None) -> Table:
    table = Table(title=title)
    # An id is what somebody copies into the next command: folded when the
    # terminal is narrow, never cut to an ellipsis.
    table.add_column("Agent", style="cyan", overflow="fold")
    table.add_column("Name", style="cyan")
    table.add_column("Capabilities", style="cyan")
    table.add_column("Protocols", style="cyan")
    table.add_column("Operations", style="cyan")
    table.add_column("Trust", style="cyan")
    for agent in agents:
        protocols = sorted({endpoint.protocol.value for endpoint in agent.endpoints})
        table.add_row(
            Text(agent.agent_id),
            Text(agent.name),
            Text(", ".join(agent.capabilities) or "-"),
            Text(", ".join(protocols) or "-"),
            Text(", ".join(operation.value for operation in agent.supported_operations) or "-"),
            Text(agent.trust_level.value),
        )
    return table


def execution_table(execution: Execution, *, title: str | None = None) -> Table:
    table = Table(title=title, show_header=False)
    table.add_column("Field", style="bold")
    table.add_column("Value", style="cyan")
    rows = [
        ("Execution", execution.execution_id),
        ("Goal", execution.objective.goal),
        ("Status", execution.status.value),
        ("Agent", f"{execution.agent.agent_id} over {execution.agent.protocol.value}"),
        ("Capability", execution.agent.capability or "-"),
        ("Delegated by", execution.parent_execution_id or "-"),
        ("Attempts", str(execution.attempt_count)),
        ("Deadline", execution.policy.deadline or "-"),
        ("Updated", execution.updated_at),
    ]
    if execution.status_message:
        rows.append(("Status message", execution.status_message))
    if execution.error:
        rows.append(("Error", f"{execution.error.code.value}: {execution.error.message}"))
    for label, value in rows:
        table.add_row(label, Text(str(value)))
    return table


def artifacts_table(artifacts: Iterable[Artifact], *, title: str | None = None) -> Table:
    table = Table(title=title)
    table.add_column("Artifact", style="cyan", overflow="fold")
    table.add_column("Name", style="cyan", overflow="fold")
    table.add_column("Type", style="cyan")
    table.add_column("Status", style="cyan")
    table.add_column("Reference", style="cyan", overflow="fold")
    table.add_column("Superseded by", style="cyan")
    for artifact in artifacts:
        table.add_row(
            Text(artifact.artifact_id),
            Text(artifact.name),
            Text(artifact.type.value),
            Text(artifact.status.value if artifact.status else "-"),
            Text(artifact.reference or "-"),
            Text(artifact.superseded_by or "-"),
        )
    return table
