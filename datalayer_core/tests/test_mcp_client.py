# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

# Copyright (c) 2023-2026 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""The MCP mixin addresses the gateway, IAM and the OTEL service as documented."""

from __future__ import annotations

from typing import Any

from datalayer_core.mixins.mcp import McpMixin
from datalayer_core.utils.urls import DatalayerURLs


class Response:
    def __init__(self, value: Any, text: str = "") -> None:
        self._value = value
        self.text = text
        self.headers: dict[str, str] = {}

    def json(self) -> Any:
        return self._value


class Otel:
    def __init__(self) -> None:
        self.calls: list[tuple[str, dict[str, Any]]] = []

    def get_trace(self, trace_id: str) -> dict[str, Any]:
        self.calls.append(("get_trace", {"trace_id": trace_id}))
        return {"trace_id": trace_id, "data": [{"span_id": "root", "span_name": "mcp.request", "start_time": "t"}]}

    def query_logs(self, **kwargs: Any) -> dict[str, Any]:
        self.calls.append(("query_logs", kwargs))
        return {"data": [{"body": "ran", "severity_text": "INFO"}]}

    def query_metrics(self, **kwargs: Any) -> dict[str, Any]:
        self.calls.append(("query_metrics", kwargs))
        return {"data": [{"value": 1, "timestamp": "t", "attributes": {"outcome": "ok"}}]}

    def list_traces(self, **kwargs: Any) -> dict[str, Any]:
        self.calls.append(("list_traces", kwargs))
        return {"data": [{"span_name": "mcp.request", "duration_ms": 5, "attributes": {"client.id": "agent-1"}}]}


class Client(McpMixin):
    def __init__(self) -> None:
        self.urls = DatalayerURLs.from_environment(
            iam_url="https://iam.test",
            otel_url="https://otel.test",
            jupyter_mcp_server_url="https://mcp.test/mcp",
        )
        self.calls: list[tuple[str, dict[str, Any]]] = []
        self.responses: list[Response] = []
        self.otel = Otel()

    def _fetch(self, url: str, **kwargs: Any) -> Response:
        self.calls.append((url, kwargs))
        return self.responses.pop(0)

    def _get_api_key(self) -> str:
        return "key"

    def _otel_client(self) -> Otel:
        return self.otel


TASK = {"uid": "01T", "status": "working", "tool": "execute_cell", "trace_id": "abc"}


def test_routes_live_under_the_resource_host_with_stable_queries() -> None:
    client = Client()
    client.responses = [Response({"items": [TASK], "next_cursor": "n"}), Response(TASK), Response({"items": []})]

    page = client.list_mcp_tasks(status="working", notebook="01NB", limit=10)
    task = client.cancel_mcp_task("01T")
    client.list_mcp_bindings(kind="sandbox")

    assert page.next_cursor == "n"
    assert task.uid == "01T"
    assert client.calls[0][0] == "https://mcp.test/api/mcp/v1/tasks?notebook=01NB&status=working&limit=10"
    assert client.calls[1] == ("https://mcp.test/api/mcp/v1/tasks/01T", {"method": "DELETE"})
    assert client.calls[2][0] == "https://mcp.test/api/mcp/v1/bindings?kind=sandbox&limit=50"


def test_answering_a_task_carries_an_idempotency_key_and_the_input_as_typed() -> None:
    client = Client()
    client.responses = [Response(TASK)]
    client.answer_mcp_task("01T", {"confirm_delete": True}, idempotency_key="k1")
    url, kwargs = client.calls[0]
    assert url.endswith("/tasks/01T/input")
    assert kwargs["json"] == {"input": {"confirm_delete": True}}
    assert kwargs["headers"]["Idempotency-Key"] == "k1"


def test_the_audit_log_pages_and_exports() -> None:
    client = Client()
    client.responses = [
        Response({"items": [{"uid": "01A", "at": "t", "decision": "refused", "refusal_reason": "tool_denylist"}]}),
        Response(None, text="uid,at\n01A,t\n"),
    ]
    page = client.list_mcp_audit_events(org="01ORG", decision="refused", task_id="01T")
    csv = client.export_mcp_audit_events(format="csv", org="01ORG")
    assert page.items[0].refusal_reason == "tool_denylist"
    assert client.calls[0][0] == "https://mcp.test/api/mcp/v1/audit?org=01ORG&decision=refused&task_id=01T&limit=50"
    assert csv.startswith("uid,at")
    assert client.calls[1][0] == "https://mcp.test/api/mcp/v1/audit?org=01ORG&export=csv"
    assert client.calls[1][1]["headers"] == {"Accept": "text/csv"}


def test_connected_agents_come_from_iam() -> None:
    client = Client()
    client.responses = [
        Response({"success": True, "agents": [{"uid": "01G", "client_id": "https://claude.ai/c.json", "client_name": "Claude", "scopes": ["notebooks:read"]}]}),
        Response({"success": True, "message": "gone"}),
    ]
    agents = client.list_connected_agents()
    answer = client.disconnect_agent("01G")
    assert agents[0].client_name == "Claude"
    assert answer["message"] == "gone"
    assert client.calls[0] == ("https://iam.test/api/iam/v1/oauth/connected-agents", {"method": "GET"})
    assert client.calls[1] == ("https://iam.test/api/iam/v1/oauth/connected-agents/01G", {"method": "DELETE"})


def test_a_run_s_trace_and_logs_are_read_by_the_task_s_trace_id() -> None:
    client = Client()
    client.responses = [Response(TASK), Response(TASK), Response({**TASK, "trace_id": None})]
    trace = client.get_mcp_run_trace("01T")
    logs = client.get_mcp_run_logs("01T", limit=5)
    none = client.get_mcp_run_trace("01T")
    assert trace["trace_id"] == "abc"
    assert trace["spans"][0]["span_id"] == "root"
    assert logs["records"][0]["body"] == "ran"
    assert none == {"task_uid": "01T", "trace_id": "", "spans": []}
    assert client.otel.calls[0] == ("get_trace", {"trace_id": "abc"})
    assert client.otel.calls[1] == ("query_logs", {"trace_id": "abc", "limit": 5, "severity": None})


def test_metrics_read_the_catalog_and_the_spans_for_one_agent() -> None:
    client = Client()
    everyone = client.get_mcp_metrics()
    one = client.get_mcp_metrics(agent="agent-1")
    assert everyone["slis"]["availability"] == 1
    assert everyone["spans"] == []
    assert one["slis"]["samples"]["calls"] == 1
    names = [call[1]["name"] for call in client.otel.calls if call[0] == "query_metrics"]
    assert set(names) == {"mcp.calls", "mcp.call.duration", "mcp.tasks", "sandbox.launch_seconds"}
    assert all(call[1].get("service_name") == "datalayer-jupyter-mcp-server" for call in client.otel.calls)
