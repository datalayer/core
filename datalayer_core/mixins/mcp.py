# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

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
    McpAlert,
    McpAlertList,
    McpEffectivePolicy,
    McpForwarding,
    McpJobSchedule,
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

    def list_mcp_alerts(
        self, *, org: str | None = None, team: str | None = None, unacknowledged: bool = False
    ) -> McpAlertList:
        """The alert rules that fired, for an organization's owners and auditors."""
        response = self._fetch(  # type: ignore[attr-defined]
            self._mcp_url(
                "/alerts",
                org=org,
                scope=team,
                unacknowledged="true" if unacknowledged else None,
            ),
            method="GET",
        )
        return McpAlertList.model_validate(response.json())

    def acknowledge_mcp_alert(self, alert_uid: str) -> McpAlert:
        """Mark one alert as seen. Idempotent; the first acknowledgement stands."""
        response = self._fetch(  # type: ignore[attr-defined]
            self._mcp_url(f"/alerts/{alert_uid}/acknowledge"), method="POST"
        )
        return McpAlert.model_validate(response.json())

    def get_mcp_audit_forwarding(self, *, org: str | None = None) -> McpForwarding:
        """Whether the audit is reaching the organization's own system of record."""
        response = self._fetch(  # type: ignore[attr-defined]
            self._mcp_url("/audit/forwarding", org=org), method="GET"
        )
        return McpForwarding.model_validate(response.json())

    def get_mcp_job_schedule(self) -> McpJobSchedule:
        """The periodic work of the replica that answers, and what it has done.

        Platform administrators only. Whichever replica the load balancer
        picks is the one that reports — the counts are that replica's, and
        `skipped` being high on it is the scheduler working rather than a
        problem.
        """
        response = self._fetch(  # type: ignore[attr-defined]
            self._mcp_url("/operations/jobs"), method="GET"
        )
        return McpJobSchedule.model_validate(response.json())

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

    # Policy layers (IAM) ----------------------------------------------------

    def get_mcp_policy_layer(self, scope: str, subject_uid: str) -> dict[str, Any] | None:
        """One layer's rules, or ``None`` where nobody has written it.

        Distinct from :meth:`get_mcp_effective_policy`, which is every layer
        intersected with the layer that decided each rule. That one answers
        "what may my agent do"; this one answers "what does *this* layer
        narrow", which is the only thing that can be written back.

        ``None`` rather than an empty answer: "narrows nothing" and "does not
        exist" are the same in effect and different to edit.
        """
        try:
            response = self._fetch(  # type: ignore[attr-defined]
                self._iam_url(f"/mcp-policies/{scope}/{subject_uid}"), method="GET"
            )
        except Exception as error:  # noqa: BLE001 - a missing layer is an answer
            if "404" in str(error) or "not found" in str(error).lower():
                return None
            raise
        return dict(response.json())

    def set_mcp_policy_layer(
        self,
        scope: str,
        subject_uid: str,
        rules: dict[str, Any],
        *,
        expected_version: int | None = None,
    ) -> dict[str, Any]:
        """Replace one layer's rules.

        Replace, not merge: a policy is read whole and small, and merging
        would leave no way to express *removing* a rule — clearing a denylist
        would find it still there.

        ``expected_version`` is the version that was read. Passing it makes a
        write that would overwrite somebody else's fail instead of winning
        silently.
        """
        suffix = f"/mcp-policies/{scope}/{subject_uid}"
        if expected_version is not None:
            suffix = f"{suffix}?expected_version={expected_version}"
        response = self._fetch(  # type: ignore[attr-defined]
            self._iam_url(suffix), method="PUT", json=rules
        )
        return dict(response.json())

    def delete_mcp_policy_layer(self, scope: str, subject_uid: str) -> dict[str, Any]:
        """Remove one layer, so it narrows nothing again."""
        response = self._fetch(  # type: ignore[attr-defined]
            self._iam_url(f"/mcp-policies/{scope}/{subject_uid}"), method="DELETE"
        )
        return dict(response.json()) if response.content else {}

    # Alert rules (IAM) and trying one (gateway) -----------------------------

    def list_mcp_alert_rules(self, org_uid: str) -> list[dict[str, Any]]:
        """One organization's rules, disabled ones included."""
        response = self._fetch(  # type: ignore[attr-defined]
            self._iam_url(f"/mcp-alert-rules/{org_uid}"), method="GET"
        )
        payload = response.json()
        return [dict(rule) for rule in (payload.get("rules") or [])]

    def create_mcp_alert_rule(self, org_uid: str, rule: dict[str, Any]) -> dict[str, Any]:
        """Write a rule. Refused when the evaluator could not evaluate it."""
        response = self._fetch(  # type: ignore[attr-defined]
            self._iam_url(f"/mcp-alert-rules/{org_uid}"), method="POST", json=rule
        )
        return dict((response.json() or {}).get("rule") or {})

    def delete_mcp_alert_rule(self, org_uid: str, uid: str) -> dict[str, Any]:
        """Remove one rule. What it watched is unwatched from the next tick."""
        response = self._fetch(  # type: ignore[attr-defined]
            self._iam_url(f"/mcp-alert-rules/{org_uid}/{uid}"), method="DELETE"
        )
        return dict(response.json()) if response.content else {}

    def test_mcp_alert_rule(self, rule: dict[str, Any]) -> dict[str, Any]:
        """What a rule would see now. Records nothing, tells nobody.

        Asked of the **gateway** rather than IAM: IAM holds the rule and has
        nothing to read it with.
        """
        response = self._fetch(  # type: ignore[attr-defined]
            self._mcp_url("/alerts/test"), method="POST", json=rule
        )
        return dict(response.json())

    # Where alerts go (IAM) --------------------------------------------------

    def get_mcp_alert_destinations(self, org_uid: str) -> dict[str, Any]:
        """Where an organization's fired alerts go, besides the app."""
        try:
            response = self._fetch(  # type: ignore[attr-defined]
                self._iam_url(f"/mcp-audit-settings/{org_uid}"), method="GET"
            )
        except Exception as error:  # noqa: BLE001 - having decided nothing is an answer
            if "404" in str(error) or "not found" in str(error).lower():
                return {}
            raise
        return dict((response.json() or {}).get("settings") or {})

    def set_mcp_alert_destinations(
        self,
        org_uid: str,
        *,
        webhook: str | None = None,
        slack: str | None = None,
        emails: str | None = None,
    ) -> dict[str, Any]:
        """Change some of them. Only what is passed is sent.

        IAM merges this document, and retention and SIEM forwarding live on
        it too — set by other people, on another surface. Sending the whole
        shape would clear them.
        """
        body: dict[str, Any] = {}
        if webhook is not None:
            body["alert_webhook_url"] = webhook
        if slack is not None:
            body["alert_slack_webhook_url"] = slack
        if emails is not None:
            body["alert_emails"] = emails
        response = self._fetch(  # type: ignore[attr-defined]
            self._iam_url(f"/mcp-audit-settings/{org_uid}"), method="PUT", json=body
        )
        return dict((response.json() or {}).get("settings") or {})

    # Service agents (IAM) ---------------------------------------------------

    def list_service_agents(self, org_uid: str) -> list[dict[str, Any]]:
        """One organization's service agents, revoked ones included.

        Revoked ones included because hiding them makes a revoked agent
        invisible to whoever is deciding whether it is still needed, while
        its audit rows still name it.
        """
        response = self._fetch(  # type: ignore[attr-defined]
            self._iam_url(f"/organizations/{org_uid}/mcp-service-agents"), method="GET"
        )
        payload = response.json()
        agents = payload.get("agents", []) if isinstance(payload, dict) else []
        return [dict(agent) for agent in agents]

    def create_service_agent(
        self,
        org_uid: str,
        *,
        name: str,
        scopes: str | list[str],
        description: str = "",
        team_uid: str = "",
    ) -> dict[str, Any]:
        """Create a service agent. **The key is in this answer and no other.**

        IAM stores a hash of it, so nothing can return it later: a caller
        that drops it rotates rather than recovers.
        """
        response = self._fetch(  # type: ignore[attr-defined]
            self._iam_url(f"/organizations/{org_uid}/mcp-service-agents"),
            method="POST",
            json={
                "name": name,
                "scopes": scopes,
                "description": description,
                "team_uid": team_uid,
            },
        )
        payload = response.json()
        return dict(payload.get("agent") or {})

    def rotate_service_agent_key(self, org_uid: str, agent_uid: str) -> dict[str, Any]:
        """Give the agent a new key. The old one stops working at once."""
        response = self._fetch(  # type: ignore[attr-defined]
            self._iam_url(
                f"/organizations/{org_uid}/mcp-service-agents/{agent_uid}/rotate"
            ),
            method="POST",
        )
        payload = response.json()
        return dict(payload.get("agent") or {})

    def revoke_service_agent(self, org_uid: str, agent_uid: str) -> dict[str, Any]:
        """Stop the agent, keeping it readable for its audit."""
        response = self._fetch(  # type: ignore[attr-defined]
            self._iam_url(
                f"/organizations/{org_uid}/mcp-service-agents/{agent_uid}/revoke"
            ),
            method="POST",
        )
        payload = response.json()
        return dict(payload.get("agent") or {})

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
