# Copyright (c) 2023-2026 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""The MCP displays draw the same thing from a model or a dictionary."""

from __future__ import annotations

from rich.console import Console, RenderableType

from datalayer_core.displays.mcp import (
    audit_events_table,
    bindings_table,
    connected_agents_table,
    policy_table,
    slis_table,
    spans_table,
    tasks_table,
)
from datalayer_core.mcp import span_tree
from datalayer_core.models.mcp import ConnectedAgent, McpAuditEvent, McpBinding, McpTask


def render(table: RenderableType) -> str:
    console = Console(width=220, record=True, file=open("/dev/null", "w"))
    console.print(table)
    return console.export_text()


def test_agents_rows_from_a_model_and_a_dictionary() -> None:
    model = ConnectedAgent(uid="01G", client_id="https://claude.ai/c.json", client_name="Claude Code", scopes=["notebooks:read"])
    output = render(connected_agents_table([model, model.model_dump()]))
    assert output.count("Claude Code") == 2
    assert "notebooks:read" in output and "never" in output


def test_tasks_and_bindings_name_what_they_touch() -> None:
    tasks = render(tasks_table([McpTask(uid="01T", status="input_required", tool="execute_cell", notebook_uid="01NB")]))
    assert "input_required" in tasks and "01NB" in tasks
    bindings = render(bindings_table([McpBinding(uid="sb_1", kind="sandbox", sandbox_uid="01R", sandbox_provider="e2b"), {"uid": "nb_1", "kind": "notebook", "item_uid": "01NB"}]))
    assert "01R" in bindings and "e2b" in bindings and "01NB" in bindings


def test_audit_rows_carry_the_decision_and_its_reason() -> None:
    row = McpAuditEvent(uid="01A", at="t", user_uid="01U", method="tools/call", tool="delete_cell", decision="refused", refusal_reason="organization: tool_denylist")
    output = render(audit_events_table([row]))
    assert "refused (organization: tool_denylist)" in output
    # Without a client id the row is attributed to the person.
    assert "01U" in output


def test_policy_and_slis_read_as_a_person_says_them() -> None:
    policy = render(policy_table({"scope": "organization", "rules": [{"name": "calls_per_minute", "value": 60, "decided_by": "platform"}], "tools": [{"tool": "delete_cell", "scope": "notebooks:write", "allowed": False, "decided_by": "organization"}]}))
    assert "calls_per_minute" in policy and "denied" in policy and "organization" in policy
    slis = render(slis_table({"availability": 0.995, "p95_call_duration_ms": 80.4, "task_success_rate": None, "p95_sandbox_launch_seconds": {}, "samples": {"calls": 10, "tasks": 0, "launches": 0}}))
    assert "99.5%" in slis and "80 ms" in slis and "-" in slis


def test_spans_are_drawn_as_a_tree() -> None:
    tree = span_tree([{"span_id": "r", "span_name": "mcp.request", "duration_ms": 10, "start_time": "1"}, {"span_id": "c", "parent_span_id": "r", "span_name": "mcp.worker", "duration_ms": 5, "start_time": "2"}])
    output = render(spans_table(tree))
    assert "mcp.request" in output and "└ mcp.worker" in output and "5.0 ms" in output
