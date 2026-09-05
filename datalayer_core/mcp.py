# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

# Copyright (c) 2023-2026 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""
The Jupyter MCP Server from Python: the agents connected, the audit log,
the observability of a run, and the configuration of the MCP clients.

Three things live here beside the facade:

- the **Client ID Metadata Documents** of Datalayer's own clients — the URLs
  a client hands the authorization server as its ``client_id`` — so that
  `agent-runtimes`, this CLI and everything else that registers by URL name
  the same document;
- the **SLI arithmetic** the CLI and the SDK share: availability, p95
  latency, task success and sandbox launch, over catalog points or over
  ``mcp.request`` spans;
- the **client setups**: what ``datalayer mcp setup <client>`` writes, and
  where, for each of the seven clients the documentation covers.
"""

from __future__ import annotations

import hashlib
import json
import os
import re
import sys
from collections.abc import Iterable, Mapping
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Callable

from datalayer_core.client import DatalayerClient
from datalayer_core.models.mcp import (
    ConnectedAgent,
    McpActivity,
    McpAuditEventList,
    McpBindingList,
    McpAlert,
    McpAlertList,
    McpEffectivePolicy,
    McpForwarding,
    McpJobSchedule,
    McpTask,
    McpTaskList,
)

# ---------------------------------------------------------------------------
# Client ID Metadata Documents
# ---------------------------------------------------------------------------

#: Where Datalayer publishes its clients' documents: the landing application
#: at `datalayer.ai`, the permanent host a ``client_id`` needs.
CLIENT_METADATA_BASE_URL = "https://datalayer.ai/.well-known/mcp-clients"

#: The documents, by client. Generated from one source in the landing
#: repository (`scripts/mcp-clients.json`), so the ids never drift.
CLIENT_METADATA_URLS: dict[str, str] = {
    "agent-runtimes": f"{CLIENT_METADATA_BASE_URL}/agent-runtimes.json",
    "cli": f"{CLIENT_METADATA_BASE_URL}/cli.json",
    "vscode": f"{CLIENT_METADATA_BASE_URL}/vscode.json",
    "web": f"{CLIENT_METADATA_BASE_URL}/web.json",
}

#: What this CLI hands an authorization server that supports CIMD.
CLI_CLIENT_METADATA_URL = CLIENT_METADATA_URLS["cli"]

# ---------------------------------------------------------------------------
# Observability
# ---------------------------------------------------------------------------

#: The metric catalog `telemetry.py` owns; no ad-hoc counters.
METRIC_CATALOG: tuple[str, ...] = (
    "mcp.calls",
    "mcp.call.duration",
    "mcp.refusals",
    "mcp.forwarded",
    "mcp.workers",
    "mcp.worker_start_seconds",
    "mcp.bindings",
    "mcp.sandbox_lost",
    "mcp.tasks",
    "mcp.task.duration",
    "durable.step.duration",
    "durable.queue.wait",
    "durable.recoveries",
    "sandbox.launch_seconds",
    "mcp.audit.write_failures",
    "mcp.dependency.ready",
)

#: The four SLIs, and the catalog metric each is read from.
SLI_METRICS: dict[str, str] = {
    "availability": "mcp.calls",
    "latency": "mcp.call.duration",
    "task_success": "mcp.tasks",
    "sandbox_launch": "sandbox.launch_seconds",
}

_TERMINAL = ("completed", "failed", "cancelled")


def percentile(values: Iterable[float], fraction: float) -> float | None:
    """The nearest-rank percentile of a sample; ``None`` for an empty one."""
    ordered = sorted(float(value) for value in values)
    if not ordered:
        return None
    import math

    rank = min(len(ordered) - 1, max(0, math.ceil(fraction * len(ordered)) - 1))
    return ordered[rank]


def _attribute(holder: Mapping[str, Any], name: str) -> str:
    attributes = holder.get("attributes") or {}
    value = attributes.get(name) if isinstance(attributes, Mapping) else None
    return "" if value is None else str(value)


def _not_before(timestamp: Any, since: str | None) -> bool:
    return not since or not timestamp or str(timestamp) >= since


def summarize_metric_points(
    metrics: Mapping[str, list[dict[str, Any]]], *, since: str | None = None
) -> dict[str, Any]:
    """
    The SLIs over catalog points — the platform-wide reading.

    ``mcp.calls{outcome}`` gives availability, ``mcp.call.duration{tool}``
    the latency, ``mcp.tasks{status}`` the task success rate and
    ``sandbox.launch_seconds{provider}`` the launches by provider.
    """

    def within(points: list[dict[str, Any]]) -> list[dict[str, Any]]:
        return [point for point in points if _not_before(point.get("timestamp"), since)]

    calls = within(list(metrics.get("mcp.calls", [])))
    total_calls = sum(float(point.get("value", 0)) for point in calls)
    failed_calls = sum(
        float(point.get("value", 0))
        for point in calls
        if _attribute(point, "outcome") in ("error", "unavailable")
    )
    durations = [float(point.get("value", 0)) for point in within(list(metrics.get("mcp.call.duration", [])))]
    terminal = [
        point
        for point in within(list(metrics.get("mcp.tasks", [])))
        if _attribute(point, "status") in _TERMINAL
    ]
    total_terminal = sum(float(point.get("value", 0)) for point in terminal)
    completed = sum(
        float(point.get("value", 0))
        for point in terminal
        if _attribute(point, "status") == "completed"
    )
    launches = within(list(metrics.get("sandbox.launch_seconds", [])))
    by_provider: dict[str, list[float]] = {}
    for point in launches:
        by_provider.setdefault(_attribute(point, "provider") or "unknown", []).append(
            float(point.get("value", 0))
        )
    return {
        "availability": (total_calls - failed_calls) / total_calls if total_calls else None,
        "p95_call_duration_ms": percentile(durations, 0.95),
        "task_success_rate": completed / total_terminal if total_terminal else None,
        "p95_sandbox_launch_seconds": {
            provider: percentile(values, 0.95) for provider, values in by_provider.items()
        },
        "samples": {"calls": total_calls, "tasks": total_terminal, "launches": len(launches)},
    }


def _unavailable(span: Mapping[str, Any]) -> bool:
    status = _attribute(span, "http.response.status_code") or _attribute(span, "http.status_code")
    rpc = _attribute(span, "rpc.jsonrpc.error_code") or _attribute(span, "mcp.error.code")
    return status.startswith("5") or rpc == "-32001"


def summarize_request_spans(
    spans: Iterable[Mapping[str, Any]],
    *,
    agent: str | None = None,
    org: str | None = None,
    since: str | None = None,
) -> dict[str, Any]:
    """
    The SLIs over ``mcp.request`` spans — the per-agent or per-organization
    reading, since metrics carry neither label by design.
    """
    selected = [
        span
        for span in spans
        if span.get("span_name") == "mcp.request"
        and _not_before(span.get("start_time"), since)
        and (not agent or _attribute(span, "client.id") == agent)
        and (not org or _attribute(span, "org.uid") == org)
    ]
    unavailable = sum(1 for span in selected if _unavailable(span))
    tasks: dict[str, str] = {}
    for span in selected:
        task_id = _attribute(span, "mcp.task.id")
        if task_id:
            tasks[task_id] = _attribute(span, "mcp.task.status") or str(span.get("status_code") or "")
    terminal = [status for status in tasks.values() if status in _TERMINAL]
    completed = sum(1 for status in terminal if status == "completed")
    return {
        "availability": (len(selected) - unavailable) / len(selected) if selected else None,
        "p95_call_duration_ms": percentile(
            (float(span.get("duration_ms", 0)) for span in selected if not _attribute(span, "mcp.task.id")),
            0.95,
        ),
        "task_success_rate": completed / len(terminal) if terminal else None,
        "p95_sandbox_launch_seconds": {},
        "samples": {"calls": len(selected), "tasks": len(terminal), "launches": 0},
    }


def span_tree(spans: Iterable[Mapping[str, Any]]) -> list[dict[str, Any]]:
    """The spans of a trace as ``{span, children}`` nodes, roots first, siblings by start."""
    nodes: dict[str, dict[str, Any]] = {}
    ordered: list[dict[str, Any]] = []
    for span in spans:
        node: dict[str, Any] = {"span": dict(span), "children": []}
        nodes[str(span.get("span_id", ""))] = node
        ordered.append(node)
    roots: list[dict[str, Any]] = []
    for node in ordered:
        parent = nodes.get(str(node["span"].get("parent_span_id") or ""))
        (parent["children"] if parent else roots).append(node)

    def sort(items: list[dict[str, Any]]) -> None:
        items.sort(key=lambda item: str(item["span"].get("start_time", "")))
        for item in items:
            sort(item["children"])

    sort(roots)
    return roots


# ---------------------------------------------------------------------------
# Client setups
# ---------------------------------------------------------------------------

#: How a client registers with the authorization server.
#:
#: ``cimd``: the client is an HTTPS URL and the document there is its
#: registration (Client ID Metadata Documents), which IAM reads; ``dcr``: the
#: client registers itself with RFC 7591 dynamic client registration, the
#: deprecated fallback. Which a client does is the client's own doing — its
#: id is its vendor's document, not something a configuration file sets —
#: so this is recorded per client, in one place, to be corrected as the
#: clients move.
Registration = str

Renderer = Callable[[str, str, str], str]


@dataclass(frozen=True)
class McpClientSetup:
    """What ``datalayer mcp setup <client>`` writes, and where."""

    id: str
    name: str
    #: ``json`` or ``toml``.
    format: str
    registration: Registration
    #: Whether the configuration file has a place for ``client_metadata_url``.
    #: None of the seven has one: the key is a client's own identity, which
    #: Datalayer's own clients set in code (see ``CLIENT_METADATA_URLS``).
    takes_client_metadata_url: bool
    #: Where the file is, relative to the home directory or the working
    #: directory; the platform decides for the desktop applications.
    path_of: Callable[[Path, Path, str], Path]
    #: The file with the server entry added or replaced.
    render: Renderer
    note: str


def _json_merge(existing: str, top_key: str, name: str, entry: dict[str, Any]) -> str:
    document: dict[str, Any] = json.loads(existing) if existing.strip() else {}
    if not isinstance(document, dict):
        raise ValueError("The configuration file is not a JSON object")
    servers = document.setdefault(top_key, {})
    if not isinstance(servers, dict):
        raise ValueError(f"'{top_key}' is not a JSON object")
    servers[name] = entry
    return json.dumps(document, indent=2) + "\n"


def _json_renderer(top_key: str, entry_of: Callable[[str], dict[str, Any]]) -> Renderer:
    return lambda existing, url, name: _json_merge(existing, top_key, name, entry_of(url))


def _toml_merge(existing: str, table: str, body: str) -> str:
    """Replace a ``[table]`` block, or append one; no TOML writer is depended on."""
    header = f"[{table}]"
    pattern = re.compile(
        rf"^\[{re.escape(table)}\]\n(?:(?!\[).*\n?)*", re.MULTILINE
    )
    block = f"{header}\n{body}\n"
    if pattern.search(existing):
        return pattern.sub(lambda _: block, existing, count=1)
    if existing and not existing.endswith("\n"):
        existing += "\n"
    if existing.strip():
        existing += "\n"
    return existing + block


def _codex_render(existing: str, url: str, name: str) -> str:
    return _toml_merge(existing, f"mcp_servers.{name}", f'url = "{url}"')


def _home(home: Path, *parts: str) -> Path:
    return home.joinpath(*parts)


def _claude_desktop_path(home: Path, cwd: Path, platform: str) -> Path:
    if platform == "darwin":
        return _home(home, "Library", "Application Support", "Claude", "claude_desktop_config.json")
    if platform.startswith("win"):
        appdata = os.environ.get("APPDATA")
        base = Path(appdata) if appdata else _home(home, "AppData", "Roaming")
        return base / "Claude" / "claude_desktop_config.json"
    return _home(home, ".config", "Claude", "claude_desktop_config.json")


def _cline_path(home: Path, cwd: Path, platform: str) -> Path:
    tail = ("User", "globalStorage", "saoudrizwan.claude-dev", "settings", "cline_mcp_settings.json")
    if platform == "darwin":
        return _home(home, "Library", "Application Support", "Code", *tail)
    if platform.startswith("win"):
        appdata = os.environ.get("APPDATA")
        base = Path(appdata) if appdata else _home(home, "AppData", "Roaming")
        return base.joinpath("Code", *tail)
    return _home(home, ".config", "Code", *tail)


MCP_CLIENTS: dict[str, McpClientSetup] = {
    "claude-code": McpClientSetup(
        id="claude-code",
        name="Claude Code",
        format="json",
        registration="dcr",
        takes_client_metadata_url=False,
        path_of=lambda home, cwd, platform: cwd / ".mcp.json",
        render=_json_renderer("mcpServers", lambda url: {"type": "http", "url": url}),
        note="Project scope: `.mcp.json` in the working directory. "
        "For user scope run `claude mcp add datalayer --transport http <url>`.",
    ),
    "claude-desktop": McpClientSetup(
        id="claude-desktop",
        name="Claude Desktop",
        format="json",
        registration="dcr",
        takes_client_metadata_url=False,
        path_of=_claude_desktop_path,
        render=_json_renderer("mcpServers", lambda url: {"url": url}),
        note="Settings → Developer → Edit Config opens the same file. Restart Claude Desktop.",
    ),
    "codex": McpClientSetup(
        id="codex",
        name="Codex",
        format="toml",
        registration="dcr",
        takes_client_metadata_url=False,
        path_of=lambda home, cwd, platform: home / ".codex" / "config.toml",
        render=_codex_render,
        note="A `[mcp_servers.<name>]` table; an existing one is replaced.",
    ),
    "cursor": McpClientSetup(
        id="cursor",
        name="Cursor",
        format="json",
        registration="dcr",
        takes_client_metadata_url=False,
        path_of=lambda home, cwd, platform: home / ".cursor" / "mcp.json",
        render=_json_renderer("mcpServers", lambda url: {"url": url}),
        note="Global: `~/.cursor/mcp.json`. Use --path .cursor/mcp.json for one project.",
    ),
    "vscode": McpClientSetup(
        id="vscode",
        name="VS Code",
        format="json",
        registration="cimd",
        takes_client_metadata_url=False,
        path_of=lambda home, cwd, platform: cwd / ".vscode" / "mcp.json",
        render=_json_renderer("servers", lambda url: {"type": "http", "url": url}),
        note="Workspace scope: `.vscode/mcp.json`. For every workspace put the same "
        "entry under `mcp.servers` in the user `settings.json`.",
    ),
    "windsurf": McpClientSetup(
        id="windsurf",
        name="Windsurf",
        format="json",
        registration="dcr",
        takes_client_metadata_url=False,
        path_of=lambda home, cwd, platform: home / ".codeium" / "windsurf" / "mcp_config.json",
        render=_json_renderer("mcpServers", lambda url: {"serverUrl": url}),
        note="Windsurf names the endpoint `serverUrl`.",
    ),
    "cline": McpClientSetup(
        id="cline",
        name="Cline",
        format="json",
        registration="dcr",
        takes_client_metadata_url=False,
        path_of=_cline_path,
        render=_json_renderer("mcpServers", lambda url: {"type": "streamableHttp", "url": url}),
        note="The file lives in VS Code's global storage for the Cline extension.",
    ),
}

MCP_CLIENT_IDS: tuple[str, ...] = tuple(MCP_CLIENTS)


def mcp_endpoint_url(url: str, scopes: Iterable[str] | None = None) -> str:
    """The endpoint, with the scopes named in the URL when the agent should get fewer."""
    names = [scope.strip() for scope in (scopes or []) if scope and scope.strip()]
    if not names:
        return url
    separator = "&" if "?" in url else "?"
    return f"{url}{separator}scopes={','.join(names)}"


def default_config_path(
    client: str,
    *,
    home: Path | None = None,
    cwd: Path | None = None,
    platform: str | None = None,
) -> Path:
    """Where the client keeps its configuration on this machine."""
    setup = MCP_CLIENTS[client]
    return setup.path_of(
        home or Path.home(), cwd or Path.cwd(), platform or sys.platform
    )


def render_client_configuration(
    client: str, url: str, *, existing: str = "", server_name: str = "datalayer"
) -> str:
    """The configuration file with the Datalayer server entry, everything else kept."""
    return MCP_CLIENTS[client].render(existing, url, server_name)


def write_client_configuration(
    client: str,
    url: str,
    *,
    path: Path | None = None,
    server_name: str = "datalayer",
    home: Path | None = None,
    cwd: Path | None = None,
) -> Path:
    """Write (or update) the client's configuration file; the path is answered."""
    target = path or default_config_path(client, home=home, cwd=cwd)
    existing = target.read_text() if target.exists() else ""
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(render_client_configuration(client, url, existing=existing, server_name=server_name))
    return target


# ---------------------------------------------------------------------------
# Facade
# ---------------------------------------------------------------------------


def derived_idempotency_key(task_uid: str, answer: Mapping[str, Any]) -> str:
    """One key per (task, answer), so a retry is the same answer.

    Shared by the CLI and the facade rather than written twice: two
    derivations that drift would make `datalayer mcp tasks input` and
    `mcp.answer()` disagree about whether a retry is a repeat, and the
    disagreement would only show up as a task answered twice.

    Canonical JSON, so the same answer serialised with its keys in another
    order is still recognised as the same answer. The task is in the digest
    too — without it, one task's approval would satisfy another's.
    """
    canonical = json.dumps(dict(answer), sort_keys=True, separators=(",", ":"), default=str)
    digest = hashlib.sha256(f"{task_uid}\x00{canonical}".encode()).hexdigest()
    return f"cli-{digest[:32]}"


class Mcp:
    """
    The Jupyter MCP Server, used from Python.

    ``datalayer.mcp.agents()`` lists the agents connected to the account,
    ``datalayer.mcp.audit()`` reads the audit log, ``datalayer.mcp.trace(uid)``
    the spans of a run — every operation the CLI has, and no more.
    """

    def __init__(self, client: DatalayerClient | None = None) -> None:
        self._client = client

    @property
    def client(self) -> DatalayerClient:
        if self._client is None:
            self._client = DatalayerClient()
        return self._client

    # Agents
    def agents(self) -> list[ConnectedAgent]:
        return self.client.list_connected_agents()

    def disconnect(self, grant_uid: str) -> dict[str, Any]:
        return self.client.disconnect_agent(grant_uid)

    # Activity, tasks, bindings, policy
    def activity(self, *, org: str | None = None) -> McpActivity:
        return self.client.get_mcp_activity(org=org)

    def tasks(self, **filters: Any) -> McpTaskList:
        return self.client.list_mcp_tasks(**filters)

    def task(self, task_uid: str) -> McpTask:
        return self.client.get_mcp_task(task_uid)

    def cancel(self, task_uid: str) -> McpTask:
        return self.client.cancel_mcp_task(task_uid)

    def answer(
        self, task_uid: str, input: Mapping[str, Any], *, idempotency_key: str | None = None
    ) -> McpTask:
        """Answer a task waiting on a person; the input is the tool's own.

        The key is derived from the task and the input when none is given, so
        a retry after a timeout is the same answer rather than a second one —
        a `POST` that timed out may well have arrived. Pass one explicitly
        only when you mean to answer again.
        """
        return self.client.answer_mcp_task(
            task_uid,
            input,
            idempotency_key=idempotency_key or derived_idempotency_key(task_uid, input),
        )

    def bindings(self, **filters: Any) -> McpBindingList:
        return self.client.list_mcp_bindings(**filters)

    def policy(self, *, agent: str | None = None) -> McpEffectivePolicy:
        return self.client.get_mcp_effective_policy(agent=agent)

    # Audit
    def audit(self, **filters: Any) -> McpAuditEventList:
        return self.client.list_mcp_audit_events(**filters)

    def export_audit(self, format: str = "jsonl", **filters: Any) -> str:
        return self.client.export_mcp_audit_events(format=format, **filters)

    # Alerts
    def alerts(self, **filters: Any) -> McpAlertList:
        return self.client.list_mcp_alerts(**filters)

    def acknowledge(self, alert_uid: str) -> McpAlert:
        return self.client.acknowledge_mcp_alert(alert_uid)

    def forwarding(self, *, org: str | None = None) -> McpForwarding:
        return self.client.get_mcp_audit_forwarding(org=org)

    # Operations
    def jobs(self) -> McpJobSchedule:
        """The periodic work of whichever gateway replica answers.

        Platform administrators only, and the counts are one replica's — see
        `McpJobSchedule`.
        """
        return self.client.get_mcp_job_schedule()

    # Observability
    def trace(self, task_uid: str) -> dict[str, Any]:
        return self.client.get_mcp_run_trace(task_uid)

    def logs(self, task_uid: str, *, limit: int = 200) -> dict[str, Any]:
        return self.client.get_mcp_run_logs(task_uid, limit=limit)

    def metrics(
        self, *, agent: str | None = None, org: str | None = None, since: str | None = None
    ) -> dict[str, Any]:
        return self.client.get_mcp_metrics(agent=agent, org=org, since=since)

    # Clients
    def setup(
        self,
        client: str,
        *,
        url: str | None = None,
        scopes: Iterable[str] | None = None,
        path: Path | None = None,
        server_name: str = "datalayer",
    ) -> Path:
        endpoint = mcp_endpoint_url(url or self.client.urls.jupyter_mcp_server_url, scopes)
        return write_client_configuration(client, endpoint, path=path, server_name=server_name)


#: The facade on the default client, for scripts: ``from datalayer_core.mcp import mcp``.
mcp = Mcp()
