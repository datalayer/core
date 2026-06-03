# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""Cluster visibility commands for Datalayer CLI."""

import os
from typing import Any, Optional

import requests
import typer
from rich.console import Console
from rich.panel import Panel
from rich.text import Text
from rich.tree import Tree

from datalayer_core.utils.urls import DatalayerURLs


app = typer.Typer(
    name="cluster",
    help="Cluster visibility commands",
    invoke_without_command=True,
)

console = Console()


def _resolve_token(token: Optional[str] = None) -> str:
    if token:
        return token
    env_token = os.environ.get("DATALAYER_API_KEY")
    if env_token:
        return env_token
    try:
        from datalayer_core.client.client import DatalayerClient

        client = DatalayerClient()
        return client._get_token() or ""
    except Exception:
        return ""


def _fetch_api(
    path: str,
    *,
    token: Optional[str] = None,
    runtimes_url: Optional[str] = None,
    params: Optional[dict[str, str]] = None,
) -> Any:
    resolved_token = _resolve_token(token)
    if not resolved_token:
        raise RuntimeError(
            "No authentication token found. Pass --token, set DATALAYER_API_KEY, or run 'datalayer login'."
        )

    urls = DatalayerURLs.from_environment(runtimes_url=runtimes_url)
    url = f"{urls.runtimes_url}/api/runtimes/v1{path}"
    headers = {"Authorization": f"Bearer {resolved_token}"}

    response = requests.get(url, headers=headers, params=params, timeout=30)
    response.raise_for_status()
    return response.json()


def _status_style(status: str) -> str:
    normalized = (status or "").lower()
    if normalized in {"running", "ready", "succeeded"}:
        return "green"
    if normalized in {"pending", "unknown"}:
        return "yellow"
    if normalized in {"failed", "crashloopbackoff", "not_ready"}:
        return "red"
    return "white"


def _build_anomalies_panel(nodes_with_pods: list[Any], unassigned: list[Any]) -> Panel:
    pending_pods = 0
    unschedulable_pods = 0
    failed_pods = 0
    pending_scale_up_nodes = 0
    pending_scale_down_nodes = 0
    not_ready_nodes = 0

    for item in nodes_with_pods:
        node = item.get("node", {}) if isinstance(item, dict) else {}
        node_status = str(node.get("status") or "").lower()
        ready = bool(node.get("ready"))

        if node_status == "pending_scale_up":
            pending_scale_up_nodes += 1
        elif node_status == "pending_scale_down":
            pending_scale_down_nodes += 1
        elif not ready:
            not_ready_nodes += 1

        node_pods = item.get("pods", []) if isinstance(item, dict) else []
        for pod in node_pods:
            phase = str((pod or {}).get("phase") or "").lower()
            if phase == "pending":
                pending_pods += 1
            if phase in {"failed", "crashloopbackoff"}:
                failed_pods += 1
            if bool((pod or {}).get("unschedulable")):
                unschedulable_pods += 1

    for pod in unassigned:
        phase = str((pod or {}).get("phase") or "").lower()
        if phase == "pending":
            pending_pods += 1
        if phase in {"failed", "crashloopbackoff"}:
            failed_pods += 1
        if bool((pod or {}).get("unschedulable")):
            unschedulable_pods += 1

    lines = Text()
    lines.append("Pods\n", style="bold")
    lines.append(f"pending pods: {pending_pods}\n", style="yellow")
    lines.append(f"unschedulable pods: {unschedulable_pods}\n", style="red")
    lines.append(f"unassigned pods: {len(unassigned)}\n", style="yellow")
    lines.append(f"failed/crashloop pods: {failed_pods}\n", style="red")
    lines.append("----------------------------------------\n", style="dim")
    lines.append("Nodes\n", style="bold")
    lines.append(f"not-ready nodes: {not_ready_nodes}\n", style="red")
    lines.append(f"pending scale-up nodes: {pending_scale_up_nodes}\n", style="cyan")
    lines.append(f"pending scale-down nodes: {pending_scale_down_nodes}", style="cyan")

    return Panel(lines, title="Anomalies", border_style="yellow")


@app.callback()
def cluster_callback(ctx: typer.Context) -> None:
    """Cluster visibility commands."""
    if ctx.invoked_subcommand is None:
        typer.echo(ctx.get_help())


@app.command(name="show")
def show_cluster(
    token: Optional[str] = typer.Option(
        None,
        "--token",
        help="Authentication token (Bearer token for API requests).",
    ),
    runtimes_url: Optional[str] = typer.Option(
        None,
        "--runtimes-url",
        help="Datalayer Runtimes server URL",
    ),
    phase: Optional[str] = typer.Option(
        None,
        "--phase",
        help="Filter pods by phase (for example: Running, Pending, Failed).",
    ),
    no_anomalies: bool = typer.Option(
        False,
        "--no-anomalies",
        help="Hide the anomaly summary panel.",
    ),
    anomalies_only: bool = typer.Option(
        False,
        "--anomalies-only",
        help="Show only the anomaly summary panel (skip topology tree).",
    ),
) -> None:
    """Show cluster details with pods grouped by node and status."""
    try:
        state_payload = _fetch_api(
            "/cluster/state",
            token=token,
            runtimes_url=runtimes_url,
            params={"phase": phase} if phase else None,
        )
        nodes_with_pods = state_payload.get("nodes_with_pods", [])
        unassigned = state_payload.get("unassigned_pods", [])
        node_requests = state_payload.get("node_requests", [])

        if not anomalies_only:
            root = Tree("[bold]Cluster Topology[/bold]")

            if not nodes_with_pods:
                root.add("[yellow]No nodes returned by API.[/yellow]")
            else:
                for item in nodes_with_pods:
                    node = item.get("node", {}) if isinstance(item, dict) else {}
                    node_pods = item.get("pods", []) if isinstance(item, dict) else []
                    node_name = str(node.get("name") or "")
                    node_status = str(node.get("status") or "unknown")
                    ready = "true" if bool(node.get("ready")) else "false"
                    schedulable = "true" if bool(node.get("schedulable")) else "false"

                    node_line = Text()
                    node_line.append(node_name, style="bold")
                    node_line.append(" ")
                    node_line.append(f"[{node_status}]", style=_status_style(node_status))
                    node_line.append(f" ready={ready} schedulable={schedulable}", style="dim")
                    node_line.append(f" pods={len(node_pods)}", style="cyan")

                    node_branch = root.add(node_line)

                    if not node_pods:
                        node_branch.add("[dim]No pods on this node.[/dim]")
                        continue

                    for pod in node_pods:
                        pod_name = str(pod.get("name") or "")
                        namespace = str(pod.get("namespace") or "")
                        pod_phase = str(pod.get("phase") or "Unknown")
                        unsched = bool(pod.get("unschedulable"))

                        pod_line = Text()
                        pod_line.append(f"{namespace}/{pod_name}" if namespace else pod_name)
                        pod_line.append(" ")
                        pod_line.append(f"[{pod_phase}]", style=_status_style(pod_phase))
                        if unsched:
                            pod_line.append(" unschedulable", style="red")

                        node_branch.add(pod_line)
            if unassigned:
                branch = root.add(f"[bold yellow]unassigned[/bold yellow] pods={len(unassigned)}")
                for pod in unassigned:
                    pod_name = str(pod.get("name") or "")
                    namespace = str(pod.get("namespace") or "")
                    pod_phase = str(pod.get("phase") or "Unknown")
                    line = Text()
                    line.append(f"{namespace}/{pod_name}" if namespace else pod_name)
                    line.append(" ")
                    line.append(f"[{pod_phase}]", style=_status_style(pod_phase))
                    if bool(pod.get("unschedulable")):
                        line.append(" unschedulable", style="red")
                    branch.add(line)

            console.print(root)

        if not no_anomalies:
            console.print(_build_anomalies_panel(nodes_with_pods, unassigned))

        if node_requests:
            requests_text = Text()
            for req in node_requests:
                action_id = str((req or {}).get("action_id") or "")
                operation = str((req or {}).get("operation") or "-")
                status = str((req or {}).get("status") or "-")
                requested = (req or {}).get("requested_delta_nodes")
                applied = (req or {}).get("applied_delta_nodes")
                target_workers = (req or {}).get("target_workers")
                reason = str((req or {}).get("reason") or "")
                if len(reason) > 120:
                    reason = reason[:117] + "..."

                requests_text.append(f"{action_id} ", style="bold")
                requests_text.append(f"{operation} ", style="cyan")
                requests_text.append(f"[{status}] ", style=_status_style(status))
                requests_text.append(
                    f"requested={requested if requested is not None else '-'} ",
                    style="yellow",
                )
                requests_text.append(
                    f"applied={applied if applied is not None else '-'} ",
                    style="yellow",
                )
                requests_text.append(
                    f"target_workers={target_workers if target_workers is not None else '-'}\n",
                    style="yellow",
                )
                if reason:
                    requests_text.append(f"  reason: {reason}\n", style="dim")
            console.print(Panel(requests_text, title="Node Requests", border_style="cyan"))
    except Exception as e:
        console.print(f"[red]Error showing cluster details: {e}[/red]")
        raise typer.Exit(1)
