# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

# Copyright (c) 2023-2026 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""
Rich displays for the Jupyter MCP Server: connected agents, tasks, bindings,
audit rows, the effective policy, a run's spans and logs, the SLIs.

Every display accepts the Pydantic models and the plain dictionaries they
dump to, as the Contents displays do: the CLI holds dictionaries because it
also emits JSON and YAML, and a script that kept the model should not have
to take it apart first.
"""

from __future__ import annotations

from collections.abc import Iterable
from typing import Any

from rich.console import Console
from rich.table import Table

__all__ = [
    "activity_summary_table",
    "audit_events_table",
    "bindings_table",
    "connected_agents_table",
    "display_audit_events",
    "display_connected_agents",
    "display_spans",
    "display_tasks",
    "logs_table",
    "policy_table",
    "slis_table",
    "spans_table",
    "tasks_table",
]


def _field(item: Any, name: str, default: Any = None) -> Any:
    if isinstance(item, dict):
        return item.get(name, default)
    return getattr(item, name, default)


def _text(item: Any, name: str, default: str = "-") -> str:
    value = _field(item, name)
    if value is None or value == "":
        return default
    return str(value)


def _short(value: str, length: int = 40) -> str:
    return value if len(value) <= length else value[: length - 1] + "…"


def connected_agents_table(items: Iterable[Any], *, title: str | None = None) -> Table:
    """One row per agent connected to the account: the grant behind it."""
    table = Table(title=title)
    table.add_column("Grant", style="cyan", no_wrap=True)
    table.add_column("Agent", style="cyan")
    table.add_column("Client id", style="cyan")
    table.add_column("Scopes", style="cyan")
    table.add_column("Connected", style="cyan")
    table.add_column("Last used", style="cyan")
    for item in items:
        scopes = _field(item, "scopes", []) or []
        table.add_row(
            _text(item, "uid"),
            _text(item, "client_name"),
            _short(_text(item, "client_id"), 60),
            " ".join(str(scope) for scope in scopes) or "-",
            _text(item, "created_at"),
            _text(item, "last_used_at", "never"),
        )
    return table


def tasks_table(items: Iterable[Any], *, title: str | None = None) -> Table:
    table = Table(title=title)
    table.add_column("Task", style="cyan", no_wrap=True)
    table.add_column("Status", style="cyan")
    table.add_column("Tool", style="cyan")
    table.add_column("Notebook", style="cyan")
    table.add_column("Agent", style="cyan")
    table.add_column("Updated", style="cyan")
    for item in items:
        table.add_row(
            _text(item, "uid"),
            _text(item, "status"),
            _text(item, "tool"),
            _text(item, "notebook_uid"),
            _short(_text(item, "initiating_client")),
            _text(item, "last_updated_at"),
        )
    return table


def bindings_table(items: Iterable[Any], *, title: str | None = None) -> Table:
    table = Table(title=title)
    table.add_column("Handle", style="cyan", no_wrap=True)
    table.add_column("Kind", style="cyan")
    table.add_column("Target", style="cyan")
    table.add_column("Provider", style="cyan")
    table.add_column("State", style="cyan")
    table.add_column("Agent", style="cyan")
    table.add_column("Expires", style="cyan")
    for item in items:
        kind = _text(item, "kind")
        target = {
            "notebook": _text(item, "item_uid"),
            "toolset": _text(item, "source_uid"),
            "sandbox": _text(item, "sandbox_uid"),
        }.get(kind, "-")
        table.add_row(
            _text(item, "uid"),
            kind,
            target,
            _text(item, "sandbox_provider"),
            _text(item, "state"),
            _short(_text(item, "client_id")),
            _text(item, "expires_at"),
        )
    return table


def audit_events_table(items: Iterable[Any], *, title: str | None = None) -> Table:
    """The audit log: who asked, through which agent, for what, and the decision."""
    table = Table(title=title)
    table.add_column("At", style="cyan", no_wrap=True)
    table.add_column("Agent", style="cyan")
    table.add_column("Method", style="cyan")
    table.add_column("Tool", style="cyan")
    table.add_column("Item", style="cyan")
    table.add_column("Decision", style="cyan")
    table.add_column("Outcome", style="cyan")
    table.add_column("Task", style="cyan")
    for item in items:
        decision = _text(item, "decision")
        reason = _field(item, "refusal_reason")
        table.add_row(
            _text(item, "at"),
            _short(_text(item, "client_id") if _field(item, "client_id") else _text(item, "user_uid")),
            _text(item, "method"),
            _text(item, "tool"),
            _text(item, "item_uid"),
            f"{decision} ({reason})" if reason else decision,
            _text(item, "outcome"),
            _text(item, "task_id"),
        )
    return table


def policy_table(policy: Any, *, title: str | None = None) -> Table:
    """The effective policy, each rule naming the layer that decided it."""
    table = Table(title=title or f"Effective policy ({_text(policy, 'scope', 'personal')})")
    table.add_column("Rule", style="cyan")
    table.add_column("Value", style="cyan")
    table.add_column("Decided by", style="cyan")
    for rule in _field(policy, "rules", []) or []:
        value = _field(rule, "value")
        table.add_row(
            _text(rule, "name"),
            "-" if value is None else str(value),
            _text(rule, "decided_by"),
        )
    for rule in _field(policy, "tools", []) or []:
        allowed = _field(rule, "allowed", True)
        table.add_row(
            f"tool {_text(rule, 'tool')}",
            f"{'allowed' if allowed else 'denied'} · {_text(rule, 'scope')}"
            + (f" · approval {_text(rule, 'approval')}" if _field(rule, "approval") else ""),
            _text(rule, "decided_by"),
        )
    return table


def activity_summary_table(activity: Any, *, title: str | None = None) -> Table:
    """Today's counts, and how much is going on right now."""
    today = _field(activity, "today", {}) or {}
    table = Table(title=title or "MCP activity")
    table.add_column("Measure", style="cyan")
    table.add_column("Value", style="cyan", justify="right")
    table.add_row("Connected clients", str(len(_field(activity, "clients", []) or [])))
    table.add_row("Bound sandboxes", str(len(_field(activity, "sandboxes", []) or [])))
    table.add_row("Running tasks", str(len(_field(activity, "tasks", []) or [])))
    table.add_row("Calls today", _text(today, "calls", "0"))
    table.add_row("Refusals today", _text(today, "refusals", "0"))
    table.add_row("Tasks today", _text(today, "tasks", "0"))
    table.add_row("Credits by agents today", _text(today, "credits", "0"))
    return table


def _walk(nodes: list[dict[str, Any]], depth: int = 0) -> Iterable[tuple[int, dict[str, Any]]]:
    for node in nodes:
        yield depth, node["span"]
        yield from _walk(node["children"], depth + 1)


def spans_table(tree: list[dict[str, Any]], *, title: str | None = None) -> Table:
    """A run's spans as a tree: gateway, policy, worker, then what they called."""
    table = Table(title=title)
    table.add_column("Span", style="cyan")
    table.add_column("Service", style="cyan")
    table.add_column("Duration", style="cyan", justify="right")
    table.add_column("Status", style="cyan")
    table.add_column("Started", style="cyan")
    for depth, span in _walk(tree):
        duration = _field(span, "duration_ms")
        table.add_row(
            "  " * depth + ("└ " if depth else "") + _text(span, "span_name"),
            _text(span, "service_name"),
            "-" if duration is None else f"{float(duration):.1f} ms",
            _text(span, "status_code"),
            _text(span, "start_time"),
        )
    return table


def logs_table(records: Iterable[Any], *, title: str | None = None) -> Table:
    table = Table(title=title)
    table.add_column("At", style="cyan", no_wrap=True)
    table.add_column("Severity", style="cyan")
    table.add_column("Service", style="cyan")
    table.add_column("Message", style="cyan")
    for record in records:
        table.add_row(
            _text(record, "timestamp"),
            _text(record, "severity_text"),
            _text(record, "service_name"),
            _text(record, "body"),
        )
    return table


def _ratio(value: Any) -> str:
    return "-" if value is None else f"{float(value) * 100:.1f}%"


def slis_table(slis: Any, *, title: str | None = None) -> Table:
    """The four SLIs, and how many samples each rests on."""
    samples = _field(slis, "samples", {}) or {}
    table = Table(title=title or "MCP service level indicators")
    table.add_column("Indicator", style="cyan")
    table.add_column("Value", style="cyan", justify="right")
    table.add_column("Samples", style="cyan", justify="right")
    table.add_row("Availability of POST /mcp", _ratio(_field(slis, "availability")), _text(samples, "calls", "0"))
    p95 = _field(slis, "p95_call_duration_ms")
    table.add_row("p95 call duration", "-" if p95 is None else f"{float(p95):.0f} ms", _text(samples, "calls", "0"))
    table.add_row("Task success rate", _ratio(_field(slis, "task_success_rate")), _text(samples, "tasks", "0"))
    launches = _field(slis, "p95_sandbox_launch_seconds", {}) or {}
    if launches:
        for provider, seconds in launches.items():
            table.add_row(
                f"p95 sandbox launch ({provider})",
                "-" if seconds is None else f"{float(seconds):.1f} s",
                _text(samples, "launches", "0"),
            )
    else:
        table.add_row("p95 sandbox launch", "-", _text(samples, "launches", "0"))
    return table


def display_connected_agents(items: Iterable[Any], console: Console | None = None) -> None:
    (console or Console()).print(connected_agents_table(items))


def display_tasks(items: Iterable[Any], console: Console | None = None) -> None:
    (console or Console()).print(tasks_table(items))


def display_audit_events(items: Iterable[Any], console: Console | None = None) -> None:
    (console or Console()).print(audit_events_table(items))


def display_spans(tree: list[dict[str, Any]], console: Console | None = None) -> None:
    (console or Console()).print(spans_table(tree))
