# Copyright (c) 2023-2026 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""Agent runtime commands for Datalayer CLI."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Optional

import requests
import typer
import yaml
from rich.console import Console

from datalayer_core.client.client import DatalayerClient
from datalayer_core.displays.runtimes import display_runtimes
from datalayer_core.runtimes.local import (
    DEFAULT_LOCAL_AGENT_NAME,
    DEFAULT_LOCAL_HOST,
    DEFAULT_LOCAL_LOG_LEVEL,
    DEFAULT_LOCAL_PROTOCOL,
    ensure_local_agent,
    start_local_agent_runtime,
    terminate_local_agent_runtime,
)
from datalayer_core.utils.urls import DatalayerURLs

DEFAULT_AGENT_SPEC_ID = "example-simple"

app = typer.Typer(
    name="agents",
    help="Agent runtime management commands.",
    invoke_without_command=True,
)

console = Console()


@app.callback()
def agents_callback(ctx: typer.Context) -> None:
    """Agent runtime management commands."""
    if ctx.invoked_subcommand is None:
        typer.echo(ctx.get_help())


def _make_client(
    token: Optional[str] = None,
    iam_url: Optional[str] = None,
    runtimes_url: Optional[str] = None,
) -> DatalayerClient:
    urls = DatalayerURLs.from_environment(iam_url=iam_url, runtimes_url=runtimes_url)
    return DatalayerClient(urls=urls, token=token)


def _is_url(value: str) -> bool:
    lowered = value.lower()
    return lowered.startswith("http://") or lowered.startswith("https://")


def _load_agent_spec(spec_source: str) -> dict[str, Any]:
    source = spec_source.strip()
    if not source:
        raise typer.BadParameter("--agentspec must be a non-empty URL or file path.")

    raw_text = ""
    if _is_url(source):
        try:
            response = requests.get(source, timeout=30)
        except Exception as exc:
            raise RuntimeError(
                f"Failed to fetch --agentspec URL '{source}': {exc}"
            ) from exc
        if response.status_code >= 400:
            preview = (response.text or "")[:500]
            raise RuntimeError(
                f"--agentspec URL returned HTTP {response.status_code}: {source}\n{preview}"
            )
        raw_text = response.text or ""
    else:
        path = Path(source)
        if not path.exists():
            raise RuntimeError(f"--agentspec file does not exist: {path}")
        if not path.is_file():
            raise RuntimeError(f"--agentspec path is not a file: {path}")
        raw_text = path.read_text(encoding="utf-8")

    try:
        parsed = yaml.safe_load(raw_text)
    except Exception as exc:
        raise RuntimeError(f"Failed to parse --agentspec as YAML/JSON: {exc}") from exc

    if not isinstance(parsed, dict):
        raise RuntimeError("--agentspec must decode to an object (mapping).")
    if not parsed:
        raise RuntimeError("--agentspec decoded to an empty object.")
    return parsed


def _create_local_agent_runtime(
    *,
    agent_spec_id: str,
    agent_name: str,
    host: str,
    port: Optional[int],
    protocol: str,
    log_level: str,
    token: Optional[str],
    raw: bool,
) -> None:
    """Launch a local agent-runtimes server and serve until interrupted."""
    runtime = start_local_agent_runtime(
        agent_spec_id=agent_spec_id,
        agent_name=agent_name,
        host=host,
        port=port,
        protocol=protocol,
        log_level=log_level,
    )

    resolved_token = (token or "").strip()
    if resolved_token:
        try:
            ensure_local_agent(
                base_url=runtime.base_url,
                agent_name=agent_name,
                token=resolved_token,
                agent_spec_id=agent_spec_id,
                transport=protocol,
            )
        except Exception as exc:
            terminate_local_agent_runtime(runtime)
            raise RuntimeError(f"Failed to register local agent: {exc}") from exc

    if raw:
        payload = {
            "success": True,
            "local": True,
            "runtime": {
                "base_url": runtime.base_url,
                "agent_name": runtime.agent_name,
                "agent_spec_id": runtime.agent_spec_id,
                "chat_endpoint": runtime.chat_endpoint,
            },
        }
        console.print(json.dumps(payload, ensure_ascii=False))
    else:
        console.print(
            f"[green]Local agent runtime '{agent_name}' started![/green]"
        )
        console.print(f"Base URL: {runtime.base_url}")
        console.print(f"Agent spec id: {agent_spec_id}")
        console.print(f"Chat endpoint: {runtime.chat_endpoint}")
        console.print("[dim]Press Ctrl+C to stop the local runtime.[/dim]")

    process = runtime.process
    try:
        if process is not None:
            process.wait()
    except KeyboardInterrupt:
        console.print("\n[yellow]Stopping local agent runtime...[/yellow]")
    finally:
        terminate_local_agent_runtime(runtime)


@app.command(name="ls")
def list_agents(
    token: Optional[str] = typer.Option(
        None,
        "--token",
        help="Authentication token (Bearer token for API requests).",
    ),
    iam_url: Optional[str] = typer.Option(
        None,
        "--iam-url",
        help="Datalayer IAM server URL",
    ),
    runtimes_url: Optional[str] = typer.Option(
        None,
        "--runtimes-url",
        help="Datalayer Runtimes server URL",
    ),
) -> None:
    """List running agent runtimes."""
    try:
        client = _make_client(token=token, iam_url=iam_url, runtimes_url=runtimes_url)
        runtimes = client.list_runtimes()
        runtime_dicts: list[dict[str, Any]] = []
        for runtime in runtimes:
            runtime_dicts.append(
                {
                    "given_name": runtime.name,
                    "environment_name": runtime.environment,
                    "pod_name": runtime.pod_name,
                    "ingress": runtime.ingress,
                    "reservation_id": runtime.reservation_id,
                    "uid": runtime.uid,
                    "burning_rate": runtime.burning_rate,
                    "token": runtime.jupyter_token,
                    "started_at": runtime.started_at,
                    "expired_at": runtime.expired_at,
                }
            )
        display_runtimes(runtime_dicts)
    except Exception as exc:
        console.print(f"[red]Error listing agent runtimes: {exc}[/red]")
        raise typer.Exit(1)


@app.command(name="create")
def create_agent_runtime(
    environment: Optional[str] = typer.Argument(None, help="Environment name."),
    given_name: Optional[str] = typer.Option(
        None,
        "--given-name",
        help="Custom name for the runtime.",
    ),
    spec_id: Optional[str] = typer.Option(
        None,
        "--agentspec-id",
        help=(
            "Agent spec id for runtime bootstrap. "
            f"Defaults to {DEFAULT_AGENT_SPEC_ID} when --agentspec is omitted."
        ),
    ),
    spec: Optional[str] = typer.Option(
        None,
        "--agentspec",
        help="Agent spec source as YAML/JSON URL or local file path.",
    ),
    time_reservation: Optional[float] = typer.Option(
        10.0,
        "--time-reservation",
        help="Time reservation in minutes for the runtime.",
    ),
    billable_account_uid: Optional[str] = typer.Option(
        None,
        "--billable-account-uid",
        help="Account UID to bill the runtime to (org/team).",
    ),
    billable_account_type: Optional[str] = typer.Option(
        None,
        "--billable-account-type",
        help="Billable account type: user, organization, or team.",
    ),
    billable_account_handle: Optional[str] = typer.Option(
        None,
        "--billable-account-handle",
        help="Billable account handle (informational).",
    ),
    raw: bool = typer.Option(
        False,
        "--raw",
        help="Print machine-readable JSON payload.",
    ),
    token: Optional[str] = typer.Option(
        None,
        "--token",
        help="Authentication token (Bearer token for API requests).",
    ),
    iam_url: Optional[str] = typer.Option(
        None,
        "--iam-url",
        help="Datalayer IAM server URL",
    ),
    runtimes_url: Optional[str] = typer.Option(
        None,
        "--runtimes-url",
        help="Datalayer Runtimes server URL",
    ),
    local: bool = typer.Option(
        False,
        "--local",
        help="Launch the agent as a local agent-runtimes server instead of a cloud runtime.",
    ),
    host: str = typer.Option(
        DEFAULT_LOCAL_HOST,
        "--host",
        help="Host interface for the local runtime (only with --local).",
    ),
    port: Optional[int] = typer.Option(
        None,
        "--port",
        help="Port for the local runtime (random free port when omitted, only with --local).",
    ),
    protocol: str = typer.Option(
        DEFAULT_LOCAL_PROTOCOL,
        "--protocol",
        help="Transport protocol for the local runtime (only with --local).",
    ),
    log_level: str = typer.Option(
        DEFAULT_LOCAL_LOG_LEVEL,
        "--log-level",
        help="Log level for the local runtime process (only with --local).",
    ),
) -> None:
    """Create a new runtime preloaded with an agent spec.

    By default creates a cloud runtime. With ``--local`` it launches a local
    ``agent-runtimes`` server and serves until interrupted (Ctrl+C).
    """
    import questionary

    try:
        if spec and spec_id:
            raise typer.BadParameter(
                "Use either --agentspec-id or --agentspec, not both."
            )

        if local:
            if spec:
                raise typer.BadParameter(
                    "--agentspec is not supported with --local; use --agentspec-id."
                )
            _create_local_agent_runtime(
                agent_spec_id=(spec_id or "").strip() or DEFAULT_AGENT_SPEC_ID,
                agent_name=(given_name or "").strip() or DEFAULT_LOCAL_AGENT_NAME,
                host=host,
                port=port,
                protocol=protocol,
                log_level=log_level,
                token=token,
                raw=raw,
            )
            return

        client = _make_client(token=token, iam_url=iam_url, runtimes_url=runtimes_url)

        if environment is None:
            environments = client.list_environments()
            if not environments:
                console.print("[yellow]No environments available.[/yellow]")
                raise typer.Exit(0)
            choices = []
            for env in environments:
                label = env.name
                if env.title:
                    label += f"  ({env.title})"
                choices.append(questionary.Choice(title=label, value=env.name))

            selected = questionary.select(
                "Select the environment for the new agent runtime:",
                choices=choices,
            ).ask()
            if selected is None:
                raise typer.Exit(0)
            environment = selected

        agent_spec_payload: dict[str, Any] | None = None
        resolved_spec_id: str | None = None
        if spec:
            agent_spec_payload = _load_agent_spec(spec)
        else:
            resolved_spec_id = (spec_id or "").strip() or DEFAULT_AGENT_SPEC_ID

        final_time_reservation = time_reservation or 10.0
        runtime = client.create_runtime(
            name=given_name,
            environment=environment,
            time_reservation=final_time_reservation,
            agent_spec_id=resolved_spec_id,
            agent_spec=agent_spec_payload,
            billable_account_uid=billable_account_uid,
            billable_account_type=billable_account_type,
            billable_account_handle=billable_account_handle,
        )

        if raw:
            payload = {
                "success": True,
                "runtime": {
                    "given_name": runtime.name,
                    "environment_name": runtime.environment,
                    "pod_name": runtime.pod_name,
                    "uid": runtime.uid,
                    "ingress": runtime.ingress,
                    "reservation_id": runtime.reservation_id,
                    "burning_rate": runtime.burning_rate,
                    "started_at": runtime.started_at,
                    "expired_at": runtime.expired_at,
                },
                "agent_spec_id": resolved_spec_id,
                "agent_spec_source": spec or "",
            }
            console.print(json.dumps(payload, ensure_ascii=False))
            return

        console.print(f"[green]Agent runtime '{runtime.name}' created successfully![/green]")
        if runtime.pod_name:
            console.print(f"Pod: {runtime.pod_name}")
        if runtime.ingress:
            console.print(f"Ingress: {runtime.ingress}")
        if resolved_spec_id:
            console.print(f"Agent spec id: {resolved_spec_id}")
        elif spec:
            console.print(f"Agent spec source: {spec}")

    except typer.Exit:
        raise
    except Exception as exc:
        console.print("[red]Error creating agent runtime.[/red]")
        console.print(f"[red]{exc}[/red]")
        raise typer.Exit(1)


@app.command(name="get")
def get_agent_runtime(
    pod_name: Optional[str] = typer.Argument(
        None,
        help="Pod name of the agent runtime to read.",
    ),
    raw: bool = typer.Option(
        False,
        "--raw",
        help="Print machine-readable JSON payload.",
    ),
    token: Optional[str] = typer.Option(
        None,
        "--token",
        help="Authentication token (Bearer token for API requests).",
    ),
    iam_url: Optional[str] = typer.Option(
        None,
        "--iam-url",
        help="Datalayer IAM server URL",
    ),
    runtimes_url: Optional[str] = typer.Option(
        None,
        "--runtimes-url",
        help="Datalayer Runtimes server URL",
    ),
) -> None:
    """Read a single agent runtime by pod name."""
    import questionary

    try:
        client = _make_client(token=token, iam_url=iam_url, runtimes_url=runtimes_url)

        if pod_name is None:
            runtimes = client.list_runtimes()
            if not runtimes:
                console.print("[yellow]No running runtimes found.[/yellow]")
                raise typer.Exit(0)
            choices = []
            for runtime in runtimes:
                label = runtime.pod_name or ""
                if runtime.name:
                    label = f"{runtime.pod_name}  ({runtime.name})"
                if runtime.environment:
                    label += f"  [{runtime.environment}]"
                choices.append(questionary.Choice(title=label, value=runtime.pod_name))

            selected = questionary.select(
                "Select the agent runtime to read:",
                choices=choices,
            ).ask()
            if selected is None:
                raise typer.Exit(0)
            pod_name = selected

        runtime = client.get_runtime(pod_name)
        runtime_dict = {
            "given_name": runtime.name,
            "environment_name": runtime.environment,
            "pod_name": runtime.pod_name,
            "ingress": runtime.ingress,
            "reservation_id": runtime.reservation_id,
            "uid": runtime.uid,
            "burning_rate": runtime.burning_rate,
            "token": runtime.jupyter_token,
            "started_at": runtime.started_at,
            "expired_at": runtime.expired_at,
        }

        if raw:
            console.print(
                json.dumps(
                    {"success": True, "runtime": runtime_dict}, ensure_ascii=False
                )
            )
            return

        display_runtimes([runtime_dict])

    except typer.Exit:
        raise
    except Exception as exc:
        console.print(f"[red]Error reading agent runtime: {exc}[/red]")
        raise typer.Exit(1)


@app.command(name="update")
def update_agent_runtime(
    pod_name: Optional[str] = typer.Argument(
        None,
        help="Pod name of the agent runtime to update.",
    ),
    capability: list[str] = typer.Option(
        [],
        "--capability",
        help="Capability to apply (repeatable). Replaces existing capabilities.",
    ),
    raw: bool = typer.Option(
        False,
        "--raw",
        help="Print machine-readable JSON payload.",
    ),
    token: Optional[str] = typer.Option(
        None,
        "--token",
        help="Authentication token (Bearer token for API requests).",
    ),
    iam_url: Optional[str] = typer.Option(
        None,
        "--iam-url",
        help="Datalayer IAM server URL",
    ),
    runtimes_url: Optional[str] = typer.Option(
        None,
        "--runtimes-url",
        help="Datalayer Runtimes server URL",
    ),
) -> None:
    """Update an agent runtime's capabilities."""
    import questionary

    try:
        client = _make_client(token=token, iam_url=iam_url, runtimes_url=runtimes_url)

        if pod_name is None:
            runtimes = client.list_runtimes()
            if not runtimes:
                console.print("[yellow]No running runtimes found.[/yellow]")
                raise typer.Exit(0)
            choices = []
            for runtime in runtimes:
                label = runtime.pod_name or ""
                if runtime.name:
                    label = f"{runtime.pod_name}  ({runtime.name})"
                if runtime.environment:
                    label += f"  [{runtime.environment}]"
                choices.append(questionary.Choice(title=label, value=runtime.pod_name))

            selected = questionary.select(
                "Select the agent runtime to update:",
                choices=choices,
            ).ask()
            if selected is None:
                raise typer.Exit(0)
            pod_name = selected

        client.update_runtime(pod_name, list(capability))

        if raw:
            console.print(
                json.dumps(
                    {
                        "success": True,
                        "pod_name": pod_name,
                        "capabilities": list(capability),
                    },
                    ensure_ascii=False,
                )
            )
            return

        console.print(
            f"[green]Agent runtime '{pod_name}' updated successfully![/green]"
        )
        if capability:
            console.print(f"Capabilities: {', '.join(capability)}")

    except typer.Exit:
        raise
    except Exception as exc:
        console.print(f"[red]Error updating agent runtime: {exc}[/red]")
        raise typer.Exit(1)


@app.command(name="delete")
@app.command(name="terminate")
def terminate_agent_runtime(
    pod_name: Optional[str] = typer.Argument(
        None,
        help="Pod name of the runtime to terminate.",
    ),
    token: Optional[str] = typer.Option(
        None,
        "--token",
        help="Authentication token (Bearer token for API requests).",
    ),
    iam_url: Optional[str] = typer.Option(
        None,
        "--iam-url",
        help="Datalayer IAM server URL",
    ),
    runtimes_url: Optional[str] = typer.Option(
        None,
        "--runtimes-url",
        help="Datalayer Runtimes server URL",
    ),
) -> None:
    """Terminate a running agent runtime."""
    import questionary

    try:
        client = _make_client(token=token, iam_url=iam_url, runtimes_url=runtimes_url)

        if pod_name is None:
            runtimes = client.list_runtimes()
            if not runtimes:
                console.print("[yellow]No running runtimes found.[/yellow]")
                raise typer.Exit(0)

            choices = []
            for runtime in runtimes:
                label = runtime.pod_name or ""
                if runtime.name:
                    label = f"{runtime.pod_name}  ({runtime.name})"
                if runtime.environment:
                    label += f"  [{runtime.environment}]"
                choices.append(questionary.Choice(title=label, value=runtime.pod_name))

            selected = questionary.select(
                "Select the agent runtime to terminate:",
                choices=choices,
            ).ask()
            if selected is None:
                raise typer.Exit(0)
            pod_name = selected

        success = client.terminate_runtime(pod_name)
        if success:
            console.print(
                f"[green]Agent runtime '{pod_name}' terminated successfully![/green]"
            )
        else:
            console.print(f"[red]Failed to terminate agent runtime '{pod_name}'[/red]")
            raise typer.Exit(1)

    except typer.Exit:
        raise
    except Exception as exc:
        console.print(f"[red]Error terminating agent runtime: {exc}[/red]")
        raise typer.Exit(1)


def agents_ls(
    token: Optional[str] = typer.Option(
        None,
        "--token",
        help="Authentication token (Bearer token for API requests).",
    ),
    iam_url: Optional[str] = typer.Option(
        None,
        "--iam-url",
        help="Datalayer IAM server URL",
    ),
    runtimes_url: Optional[str] = typer.Option(
        None,
        "--runtimes-url",
        help="Datalayer Runtimes server URL",
    ),
) -> None:
    """List running agent runtimes (root command alias)."""
    list_agents(token=token, iam_url=iam_url, runtimes_url=runtimes_url)