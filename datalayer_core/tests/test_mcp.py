# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

# Copyright (c) 2023-2026 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""The MCP arithmetic and client setups the CLI and the SDK share."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from datalayer_core.mcp import (
    Mcp,
    derived_idempotency_key,
    CLIENT_METADATA_URLS,
    CLI_CLIENT_METADATA_URL,
    MCP_CLIENT_IDS,
    MCP_CLIENTS,
    default_config_path,
    mcp_endpoint_url,
    percentile,
    render_client_configuration,
    span_tree,
    summarize_metric_points,
    summarize_request_spans,
    write_client_configuration,
)
from datalayer_core.mixins.mcp import mcp_gateway_origin
from datalayer_core.models.mcp import McpTask, is_cimd_client_id, is_task_terminal


def test_the_answer_key_is_the_same_for_a_retry_and_different_for_a_change() -> None:
    """A POST that timed out may well have arrived.

    Deriving the key from the task and the input is what makes re-running the
    command safe. Canonical JSON, so the same answer written with its keys in
    another order is still the same answer.
    """
    same = derived_idempotency_key("01T", {"approve": True, "note": "ok"})
    reordered = derived_idempotency_key("01T", {"note": "ok", "approve": True})
    assert same == reordered

    assert derived_idempotency_key("01T", {"approve": False}) != same
    # The task is in the digest: without it, one task's approval would
    # satisfy another's.
    assert derived_idempotency_key("01U", {"approve": True, "note": "ok"}) != same


def test_the_cli_and_the_facade_derive_the_same_key() -> None:
    """Two derivations that drifted would make `datalayer mcp tasks input`
    and `mcp.answer()` disagree about whether a retry is a repeat — and the
    disagreement would only show up as a task answered twice."""
    import datalayer_core.cli.commands.mcp as cli

    assert cli.derived_idempotency_key is derived_idempotency_key


def test_the_facade_offers_every_operation_the_cli_has() -> None:
    """The facade's own docstring promises this: "every operation the CLI has,
    and no more". A method that exists in one and not the other is a scripted
    workflow that cannot be written."""
    for name in (
        "tasks", "task", "cancel", "answer", "bindings", "policy", "jobs",
        "audit", "alerts", "acknowledge", "forwarding",
    ):
        assert callable(getattr(Mcp, name)), name


def test_the_gateway_origin_is_the_resource_without_its_path() -> None:
    assert mcp_gateway_origin("https://mcp.datalayer.run/mcp") == "https://mcp.datalayer.run"
    assert mcp_gateway_origin("https://mcp.datalayer.run/mcp/") == "https://mcp.datalayer.run"
    assert mcp_gateway_origin("http://localhost:4404") == "http://localhost:4404"


def test_datalayer_s_own_clients_are_documents_on_the_landing_host() -> None:
    assert set(CLIENT_METADATA_URLS) == {"agent-runtimes", "cli", "vscode", "web"}
    for client, url in CLIENT_METADATA_URLS.items():
        assert url == f"https://datalayer.ai/.well-known/mcp-clients/{client}.json"
        assert is_cimd_client_id(url)
    assert CLI_CLIENT_METADATA_URL.endswith("/cli.json")
    assert not is_cimd_client_id("01HZX7Q2M3N4P5R6S7T8U9V0W1")
    assert not is_cimd_client_id("https://datalayer.ai")
    assert not is_cimd_client_id("http://datalayer.ai/x.json")


def test_terminal_tasks_are_the_three_that_end() -> None:
    task = McpTask(uid="01T", status="working", tool="execute_cell")
    assert not is_task_terminal(task)
    assert is_task_terminal(task.model_copy(update={"status": "completed"}))
    # A field the gateway adds later is carried, not refused.
    carried = McpTask.model_validate({"uid": "01T", "status": "failed", "tool": "x", "new_field": 1})
    assert carried.model_dump()["new_field"] == 1


def test_percentile_is_nearest_rank() -> None:
    assert percentile([], 0.95) is None
    assert percentile([5], 0.95) == 5
    assert percentile([10, 1, 7, 3, 100], 0.5) == 7
    assert percentile([10, 1, 7, 3, 100], 0.95) == 100


def test_the_slis_are_read_off_the_catalog_points() -> None:
    summary = summarize_metric_points(
        {
            "mcp.calls": [
                {"value": 8, "timestamp": "2026-08-27T10:00:00Z", "attributes": {"outcome": "ok"}},
                {"value": 2, "timestamp": "2026-08-27T10:00:00Z", "attributes": {"outcome": "error"}},
                {"value": 100, "timestamp": "2026-08-26T10:00:00Z", "attributes": {"outcome": "error"}},
            ],
            "mcp.call.duration": [
                {"value": 50, "timestamp": "2026-08-27T10:00:00Z"},
                {"value": 900, "timestamp": "2026-08-27T10:00:00Z"},
            ],
            "mcp.tasks": [
                {"value": 3, "timestamp": "2026-08-27T10:00:00Z", "attributes": {"status": "completed"}},
                {"value": 1, "timestamp": "2026-08-27T10:00:00Z", "attributes": {"status": "failed"}},
                {"value": 5, "timestamp": "2026-08-27T10:00:00Z", "attributes": {"status": "working"}},
            ],
            "sandbox.launch_seconds": [
                {"value": 4, "timestamp": "2026-08-27T10:00:00Z", "attributes": {"provider": "datalayer"}},
                {"value": 9, "timestamp": "2026-08-27T10:00:00Z", "attributes": {"provider": "e2b"}},
            ],
        },
        since="2026-08-27T00:00:00Z",
    )
    assert summary["availability"] == 0.8
    assert summary["p95_call_duration_ms"] == 900
    assert summary["task_success_rate"] == 0.75
    assert summary["p95_sandbox_launch_seconds"] == {"datalayer": 4, "e2b": 9}
    assert summary["samples"] == {"calls": 10, "tasks": 4, "launches": 2}


def test_a_per_agent_reading_comes_from_the_request_spans() -> None:
    def span(**overrides: object) -> dict[str, object]:
        base: dict[str, object] = {
            "span_name": "mcp.request",
            "start_time": "2026-08-27T10:00:00Z",
            "duration_ms": 100,
            "attributes": {},
        }
        base.update(overrides)
        return base

    spans = [
        span(span_id="a", attributes={"client.id": "agent-1", "http.response.status_code": 200}, duration_ms=20),
        span(span_id="b", attributes={"client.id": "agent-1", "rpc.jsonrpc.error_code": "-32001"}, duration_ms=30),
        span(span_id="c", attributes={"client.id": "agent-2"}, duration_ms=5000),
        span(span_id="d", attributes={"client.id": "agent-1", "mcp.task.id": "t1", "mcp.task.status": "completed"}),
        span(span_id="e", span_name="mcp.policy", attributes={"client.id": "agent-1"}),
    ]
    summary = summarize_request_spans(spans, agent="agent-1")
    assert summary["samples"]["calls"] == 3
    assert summary["availability"] == pytest.approx(2 / 3)
    assert summary["p95_call_duration_ms"] == 30
    assert summary["task_success_rate"] == 1


def test_spans_become_a_tree_roots_first_siblings_by_start() -> None:
    tree = span_tree(
        [
            {"span_id": "child-2", "parent_span_id": "root", "start_time": "2026-08-27T10:00:02Z"},
            {"span_id": "root", "start_time": "2026-08-27T10:00:00Z"},
            {"span_id": "child-1", "parent_span_id": "root", "start_time": "2026-08-27T10:00:01Z"},
            {"span_id": "orphan", "parent_span_id": "elsewhere", "start_time": "2026-08-27T10:00:03Z"},
        ]
    )
    assert [node["span"]["span_id"] for node in tree] == ["root", "orphan"]
    assert [node["span"]["span_id"] for node in tree[0]["children"]] == ["child-1", "child-2"]


def test_scopes_are_named_in_the_url() -> None:
    assert mcp_endpoint_url("https://mcp.datalayer.run/mcp") == "https://mcp.datalayer.run/mcp"
    assert (
        mcp_endpoint_url("https://mcp.datalayer.run/mcp", ["notebooks:read", " code:execute "])
        == "https://mcp.datalayer.run/mcp?scopes=notebooks:read,code:execute"
    )


URL = "https://mcp.datalayer.run/mcp"


@pytest.mark.parametrize("client", MCP_CLIENT_IDS)
def test_every_client_has_a_path_and_a_rendering(client: str, tmp_path: Path) -> None:
    home, cwd = tmp_path / "home", tmp_path / "project"
    for platform in ("linux", "darwin", "win32"):
        path = default_config_path(client, home=home, cwd=cwd, platform=platform)
        assert path.is_absolute()
        assert path.is_relative_to(home) or path.is_relative_to(cwd)
    rendered = render_client_configuration(client, URL)
    assert URL in rendered
    setup = MCP_CLIENTS[client]
    assert setup.registration in ("cimd", "dcr")
    # No configuration file of the seven has a place for the CIMD url.
    assert setup.takes_client_metadata_url is False
    assert "client_metadata_url" not in rendered


def test_json_clients_keep_the_other_servers_and_replace_datalayer(tmp_path: Path) -> None:
    path = tmp_path / ".cursor" / "mcp.json"
    path.parent.mkdir()
    path.write_text(json.dumps({"mcpServers": {"github": {"url": "https://github.example/mcp"}, "datalayer": {"url": "old"}}}))
    written = write_client_configuration("cursor", URL, path=path)
    document = json.loads(written.read_text())
    assert document["mcpServers"]["github"] == {"url": "https://github.example/mcp"}
    assert document["mcpServers"]["datalayer"] == {"url": URL}


def test_each_json_client_uses_its_own_key_shape(tmp_path: Path) -> None:
    shapes = {
        "claude-code": ("mcpServers", {"type": "http", "url": URL}),
        "claude-desktop": ("mcpServers", {"url": URL}),
        "cursor": ("mcpServers", {"url": URL}),
        "vscode": ("servers", {"type": "http", "url": URL}),
        "windsurf": ("mcpServers", {"serverUrl": URL}),
        "cline": ("mcpServers", {"type": "streamableHttp", "url": URL}),
    }
    for client, (top, entry) in shapes.items():
        document = json.loads(render_client_configuration(client, URL))
        assert document == {top: {"datalayer": entry}}, client


def test_codex_replaces_its_table_and_keeps_the_rest() -> None:
    existing = '[mcp_servers.github]\nurl = "https://github.example/mcp"\n\n[mcp_servers.datalayer]\nurl = "old"\nhttp_headers = { Authorization = "Bearer x" }\n\n[other]\nkey = 1\n'
    rendered = render_client_configuration("codex", URL, existing=existing)
    assert '[mcp_servers.github]\nurl = "https://github.example/mcp"' in rendered
    assert f'[mcp_servers.datalayer]\nurl = "{URL}"' in rendered
    assert "Bearer x" not in rendered
    assert "[other]\nkey = 1" in rendered
    assert rendered.count("[mcp_servers.datalayer]") == 1
    appended = render_client_configuration("codex", URL, existing="[other]\nkey = 1\n")
    assert appended == f'[other]\nkey = 1\n\n[mcp_servers.datalayer]\nurl = "{URL}"\n'


def test_a_file_that_is_not_json_is_refused_not_clobbered(tmp_path: Path) -> None:
    path = tmp_path / "mcp.json"
    path.write_text("not json")
    with pytest.raises(ValueError):
        write_client_configuration("cursor", URL, path=path)
    assert path.read_text() == "not json"
