# Copyright (c) 2023-2026 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""
Typed transport methods for the Jupyter MCP Server, IAM's connected agents
and the observability of a run.

The gateway's REST routes live under ``/api/mcp/v1`` on the host of the MCP
resource; the configured URL is the resource itself and ends in ``/mcp``, so
that segment is taken off first. Observability is read from the OTEL service
with the caller's own token — the gateway adds no telemetry route.
"""

from __future__ import annotations

from typing import Any, Mapping
from urllib.parse import urlencode

from datalayer_core.models.mcp import (
    ConnectedAgent,
    McpActivity,
    McpAuditEventList,
    McpBinding,
    McpBindingList,
    McpEffectivePolicy,
    McpTask,
    McpTaskList,
)

#: The ``service.name`` the gateway exports under.
MCP_GATEWAY_SERVICE_NAME = "datalayer-jupyter-mcp-server"


def mcp_gateway_origin(mcp_server_url: str) -> str:
    """The host of the gateway without the ``/mcp`` resource path."""
    trimmed = mcp_server_url.rstrip("/")
    return trimmed[: -len("/mcp")] if trimmed.endswith("/mcp") else trimmed


def _query(parameters: Mapping[str, Any]) -> str:
    present = {
        key: value
        for key, value in parameters.items()
        if value is not None and value != ""
    }
    return f"?{urlencode(present)}" if present else ""


class McpMixin:
    """Authenticated transport for the gateway, IAM's grants and the OTEL service."""

    def _mcp_url(self, path: str = "", **parameters: Any) -> str:
        origin = mcp_gateway_origin(self.urls.jupyter_mcp_server_url)  # type: ignore[attr-defined]
        return f"{origin}/api/mcp/v1{path}{_query(parameters)}"

    def _mcp_service_url(self, path: str) -> str:
        origin = mcp_gateway_origin(self.urls.jupyter_mcp_server_url)  # type: ignore[attr-defined]
        return f"{origin}/api/mcp{path}"

    def _iam_url(self, path: str = "") -> str:
        return f"{self.urls.iam_url}/api/iam/v1{path}"  # type: ignore[attr-defined]

    # Gateway ----------------------------------------------------------------

    def get_mcp_gateway_version(self) -> dict[str, Any]:
        """The gateway's version and the resource it serves; no token needed."""
        response = self._fetch(self._mcp_service_url("/version"), method="GET")  # type: ignore[attr-defined]
        return dict(response.json())

    def list_mcp_tasks(
        self,
        *,
        notebook: str | None = None,
        sandbox: str | None = None,
        agent: str | None = None,
        status: str | None = None,
        org: str | None = None,
        cursor: str | None = None,
        limit: int = 50,
    ) -> McpTaskList:
        response = self._fetch(  # type: ignore[attr-defined]
            self._mcp_url(
                "/tasks",
                notebook=notebook,
                sandbox=sandbox,
                agent=agent,
                status=status,
                org=org,
                cursor=cursor,
                limit=limit,
            ),
            method="GET",
        )
        return McpTaskList.model_validate(response.json())

    def get_mcp_task(self, task_uid: str) -> McpTask:
        response = self._fetch(self._mcp_url(f"/tasks/{task_uid}"), method="GET")  # type: ignore[attr-defined]
        return McpTask.model_validate(response.json())

    def cancel_mcp_task(self, task_uid: str) -> McpTask:
        """Stop a task; idempotent, a finished task is answered as it is."""
        response = self._fetch(self._mcp_url(f"/tasks/{task_uid}"), method="DELETE")  # type: ignore[attr-defined]
        return McpTask.model_validate(response.json())

    def answer_mcp_task(
        self, task_uid: str, input: Mapping[str, Any], *, idempotency_key: str
    ) -> McpTask:
        """Answer a task that is ``input_required``; the input is the tool's own."""
        response = self._fetch(  # type: ignore[attr-defined]
            self._mcp_url(f"/tasks/{task_uid}/input"),
            method="POST",
            json={"input": dict(input)},
            headers={
                "Accept": "application/json",
                "Content-Type": "application/json",
                "Idempotency-Key": idempotency_key,
            },
        )
        return McpTask.model_validate(response.json())

    def list_mcp_bindings(
        self,
        *,
        kind: str | None = None,
        state: str | None = None,
        agent: str | None = None,
        org: str | None = None,
        cursor: str | None = None,
        limit: int = 50,
    ) -> McpBindingList:
        response = self._fetch(  # type: ignore[attr-defined]
            self._mcp_url(
                "/bindings",
                kind=kind,
                state=state,
                agent=agent,
                org=org,
                cursor=cursor,
                limit=limit,
            ),
            method="GET",
        )
        return McpBindingList.model_validate(response.json())

    def terminate_mcp_binding(self, binding_uid: str) -> McpBinding:
        """Release a handle; a sandbox binding's runtime is terminated with it."""
        response = self._fetch(  # type: ignore[attr-defined]
            self._mcp_url(f"/bindings/{binding_uid}"), method="DELETE"
        )
        return McpBinding.model_validate(response.json())

    def get_mcp_activity(
        self, *, org: str | None = None, team: str | None = None
    ) -> McpActivity:
        """What is going on for the caller, or for an organization they own."""
        response = self._fetch(  # type: ignore[attr-defined]
            self._mcp_url("/activity", org=org, team=team), method="GET"
        )
        return McpActivity.model_validate(response.json())

    def list_mcp_audit_events(
        self,
        *,
        org: str | None = None,
        team: str | None = None,
        agent: str | None = None,
        user: str | None = None,
        tool: str | None = None,
        method: str | None = None,
        decision: str | None = None,
        outcome: str | None = None,
        since: str | None = None,
        until: str | None = None,
        task_id: str | None = None,
        trace_id: str | None = None,
        cursor: str | None = None,
        limit: int = 50,
    ) -> McpAuditEventList:
        response = self._fetch(  # type: ignore[attr-defined]
            self._mcp_url(
                "/audit",
                org=org,
                team=team,
                agent=agent,
                user=user,
                tool=tool,
                method=method,
                decision=decision,
                outcome=outcome,
                since=since,
                until=until,
                task_id=task_id,
                trace_id=trace_id,
                cursor=cursor,
                limit=limit,
            ),
            method="GET",
        )
        return McpAuditEventList.model_validate(response.json())

    def export_mcp_audit_events(
        self,
        *,
        format: str = "jsonl",
        org: str | None = None,
        team: str | None = None,
        agent: str | None = None,
        user: str | None = None,
        tool: str | None = None,
        decision: str | None = None,
        outcome: str | None = None,
        since: str | None = None,
        until: str | None = None,
    ) -> str:
        """The rows the filters select, whole, as one JSONL or CSV document."""
        accept = "text/csv" if format == "csv" else "application/x-ndjson"
        response = self._fetch(  # type: ignore[attr-defined]
            self._mcp_url(
                "/audit",
                org=org,
                team=team,
                agent=agent,
                user=user,
                tool=tool,
                decision=decision,
                outcome=outcome,
                since=since,
                until=until,
                export=format,
            ),
            method="GET",
            headers={"Accept": accept},
        )
        return str(response.text)

    def get_mcp_effective_policy(
        self,
        *,
        agent: str | None = None,
        org: str | None = None,
        team: str | None = None,
    ) -> McpEffectivePolicy:
        response = self._fetch(  # type: ignore[attr-defined]
            self._mcp_url("/policy", agent=agent, org=org, team=team), method="GET"
        )
        return McpEffectivePolicy.model_validate(response.json())

    # Connected agents (IAM) -------------------------------------------------

    def list_connected_agents(self) -> list[ConnectedAgent]:
        """The agents the caller connected: IAM's grants, one per client."""
        response = self._fetch(self._iam_url("/oauth/connected-agents"), method="GET")  # type: ignore[attr-defined]
        payload = response.json()
        return [
            ConnectedAgent.model_validate(agent)
            for agent in (payload.get("agents", []) if isinstance(payload, dict) else [])
        ]

    def disconnect_agent(self, grant_uid: str) -> dict[str, Any]:
        """Revoke one grant; the refresh token stops working at once."""
        response = self._fetch(  # type: ignore[attr-defined]
            self._iam_url(f"/oauth/connected-agents/{grant_uid}"), method="DELETE"
        )
        return dict(response.json())

    # Observability (OTEL) ---------------------------------------------------

    def _otel_client(self) -> Any:
        from datalayer_core.otel.client import OtelClient

        return OtelClient(
            base_url=self.urls.otel_url,  # type: ignore[attr-defined]
            token=self._get_api_key(),  # type: ignore[attr-defined]
        )

    def get_mcp_run_trace(self, task_uid: str) -> dict[str, Any]:
        """
        The spans of a run: ``{task_uid, trace_id, spans}``.

        A task without a trace id yet has no spans, not an error.
        """
        task = self.get_mcp_task(task_uid)
        if not task.trace_id:
            return {"task_uid": task_uid, "trace_id": "", "spans": []}
        trace = self._otel_client().get_trace(task.trace_id)
        spans = trace.get("data", trace) if isinstance(trace, dict) else trace
        return {"task_uid": task_uid, "trace_id": task.trace_id, "spans": list(spans or [])}

    def get_mcp_run_logs(
        self, task_uid: str, *, limit: int = 200, severity: str | None = None
    ) -> dict[str, Any]:
        """The log lines of a run, gateway and worker alike, by its trace."""
        task = self.get_mcp_task(task_uid)
        if not task.trace_id:
            return {"task_uid": task_uid, "trace_id": "", "records": []}
        page = self._otel_client().query_logs(
            trace_id=task.trace_id, limit=limit, severity=severity
        )
        records = page.get("data", page) if isinstance(page, dict) else page
        return {
            "task_uid": task_uid,
            "trace_id": task.trace_id,
            "records": list(records or []),
        }

    def get_mcp_metrics(
        self,
        *,
        agent: str | None = None,
        org: str | None = None,
        since: str | None = None,
        limit: int = 500,
    ) -> dict[str, Any]:
        """
        The four SLIs and the catalog points they rest on.

        Metrics carry no agent or organization label by design, so a reading
        for one agent or organization is computed from the ``mcp.request``
        spans, which carry ``client.id`` and ``org.uid``.
        """
        from datalayer_core.mcp import SLI_METRICS, summarize_metric_points, summarize_request_spans

        otel = self._otel_client()
        metrics: dict[str, list[dict[str, Any]]] = {}
        for name in SLI_METRICS.values():
            page = otel.query_metrics(
                name=name, service_name=MCP_GATEWAY_SERVICE_NAME, limit=limit
            )
            metrics[name] = list(page.get("data", []) if isinstance(page, dict) else page)
        spans: list[dict[str, Any]] = []
        if agent or org:
            page = otel.list_traces(service_name=MCP_GATEWAY_SERVICE_NAME, limit=limit)
            spans = list(page.get("data", []) if isinstance(page, dict) else page)
            slis = summarize_request_spans(spans, agent=agent, org=org, since=since)
        else:
            slis = summarize_metric_points(metrics, since=since)
        return {
            "filters": {"agent": agent, "org": org, "since": since},
            "metrics": metrics,
            "spans": spans,
            "slis": slis,
        }
