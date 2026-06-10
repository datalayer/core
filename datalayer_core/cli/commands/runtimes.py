# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""Runtime commands for Datalayer CLI."""

from typing import Optional

import typer
from rich.console import Console
from rich.table import Table

from datalayer_core.client.client import DatalayerClient
from datalayer_core.displays.runtimes import display_runtimes
from datalayer_core.utils.network import fetch
from datalayer_core.utils.urls import DatalayerURLs

# Create a Typer app for runtime commands
app = typer.Typer(
    name="runtimes", help="Runtime management commands", invoke_without_command=True
)

console = Console()


@app.callback()
def runtimes_callback(ctx: typer.Context) -> None:
    """Runtime management commands."""
    if ctx.invoked_subcommand is None:
        typer.echo(ctx.get_help())


def _make_client(
    token: Optional[str] = None,
    api_key: Optional[str] = None,
    iam_url: Optional[str] = None,
    runtimes_url: Optional[str] = None,
) -> DatalayerClient:
    """Create a DatalayerClient with optional runtimes URL override."""
    urls = DatalayerURLs.from_environment(iam_url=iam_url, runtimes_url=runtimes_url)
    return DatalayerClient(urls=urls, token=token or api_key)


@app.command(name="ls")
def list_runtimes(
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
    """List running runtimes."""
    try:
        client = _make_client(
            token=token,
            iam_url=iam_url,
            runtimes_url=runtimes_url,
        )
        runtimes = client.list_runtimes()

        # Convert to dict format for display_runtimes
        runtime_dicts = []
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

    except Exception as e:
        console.print(f"[red]Error listing runtimes: {e}[/red]")
        raise typer.Exit(1)


@app.command(name="create")
def create_runtime(
    environment: Optional[str] = typer.Argument(None, help="Environment name"),
    given_name: Optional[str] = typer.Option(
        None,
        "--given-name",
        help="Custom name for the runtime",
    ),
    credits_limit: Optional[float] = typer.Option(
        None,
        "--credits-limit",
        help="Maximum amount of credits that can be consumed by the runtime",
    ),
    time_reservation: Optional[float] = typer.Option(
        10.0,
        "--time-reservation",
        help="Time reservation in minutes for the runtime",
    ),
    billable_account_uid: Optional[str] = typer.Option(
        None,
        "--billable-account-uid",
        help="Account UID to bill the runtime to (org/team). Defaults to the authenticated user.",
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
    token: Optional[str] = typer.Option(
        None,
        "--token",
        help="Authentication token (Bearer token for API requests).",
    ),
    api_key: Optional[str] = typer.Option(
        None,
        "--api-key",
        help="Authentication API key (alias for --token).",
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
    """Create a new runtime."""
    import questionary

    try:
        client = _make_client(
            token=token,
            api_key=api_key,
            iam_url=iam_url,
            runtimes_url=runtimes_url,
        )

        if environment is None:
            # List environments and let the user pick one
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
                "Select the environment for the new runtime:",
                choices=choices,
            ).ask()

            if selected is None:
                raise typer.Exit(0)
            environment = selected

        # Create runtime
        final_time_reservation = time_reservation or 10.0
        runtime = client.create_runtime(
            name=given_name,
            environment=environment,
            time_reservation=final_time_reservation,
            billable_account_uid=billable_account_uid,
            billable_account_type=billable_account_type,
            billable_account_handle=billable_account_handle,
        )

        console.print(
            f"Runtime will use credits limit: {(runtime.burning_rate or 0.0) * 60.0 * final_time_reservation:.2f}"
        )
        console.print(f"Runtime created successfully: {runtime.name}")
        console.print(f"[green]Runtime '{runtime.name}' created successfully![/green]")

    except typer.Exit:
        raise
    except Exception as e:
        console.print(f"[red]Error creating runtime: {e}[/red]")
        raise typer.Exit(1)


@app.command(name="terminate")
def terminate_runtime(
    pod_name: Optional[str] = typer.Argument(
        None, help="Pod name of the runtime to terminate"
    ),
    token: Optional[str] = typer.Option(
        None,
        "--token",
        help="Authentication token (Bearer token for API requests).",
    ),
    api_key: Optional[str] = typer.Option(
        None,
        "--api-key",
        help="Authentication API key (alias for --token).",
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
    """Terminate a running runtime."""
    import questionary

    try:
        client = _make_client(
            token=token,
            api_key=api_key,
            iam_url=iam_url,
            runtimes_url=runtimes_url,
        )

        if pod_name is None:
            # List runtimes and let the user pick one
            runtimes = client.list_runtimes()
            if not runtimes:
                console.print("[yellow]No running runtimes found.[/yellow]")
                raise typer.Exit(0)

            choices = []
            for rt in runtimes:
                label = rt.pod_name or ""
                if rt.name:
                    label = f"{rt.pod_name}  ({rt.name})"
                if rt.environment:
                    label += f"  [{rt.environment}]"
                choices.append(questionary.Choice(title=label, value=rt.pod_name))

            selected = questionary.select(
                "Select the runtime to terminate:",
                choices=choices,
            ).ask()

            if selected is None:
                # User cancelled (Ctrl-C / Esc)
                raise typer.Exit(0)
            pod_name = selected

        success = client.terminate_runtime(pod_name)

        if success:
            console.print(
                f"[green]Runtime '{pod_name}' terminated successfully![/green]"
            )
        else:
            console.print(f"[red]Failed to terminate runtime '{pod_name}'[/red]")
            raise typer.Exit(1)

    except typer.Exit:
        raise
    except Exception as e:
        console.print(f"[red]Error terminating runtime: {e}[/red]")
        raise typer.Exit(1)


# Root level commands for convenience
def runtimes_list(
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
    """List running runtimes (root command)."""
    list_runtimes(token=token, iam_url=iam_url, runtimes_url=runtimes_url)


def runtimes_ls(
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
    """List running runtimes (root command alias)."""
    list_runtimes(token=token, iam_url=iam_url, runtimes_url=runtimes_url)


@app.command(name="inspect")
def inspect_runtime(
    runtime: Optional[str] = typer.Option(
        None,
        "--runtime",
        "-r",
        help="Runtime identifier (pod name, uid, or given name). Defaults to first running runtime.",
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
    """Inspect a runtime and list available kernels."""
    try:
        client = _make_client(token=token, iam_url=iam_url, runtimes_url=runtimes_url)
        runtimes = client.list_runtimes()
        if not runtimes:
            console.print("[yellow]No running runtimes found.[/yellow]")
            raise typer.Exit(1)

        selected = None
        if runtime:
            for candidate in runtimes:
                if runtime in {candidate.pod_name, candidate.uid, candidate.name}:
                    selected = candidate
                    break
            if selected is None:
                console.print(f"[red]Runtime '{runtime}' not found.[/red]")
                raise typer.Exit(1)
        else:
            selected = runtimes[0]

        pod_name = selected.pod_name or ""
        refreshed = client.get_runtime(pod_name)
        endpoint = str(refreshed.ingress or "").rstrip("/")
        runtime_token = str(refreshed.jupyter_token or client._get_token() or "")
        if not endpoint:
            console.print("[red]Runtime has no ingress endpoint.[/red]")
            raise typer.Exit(1)

        response = fetch(f"{endpoint}/api/kernels", token=runtime_token, timeout=15)
        kernels = response.json() if response.content else []
        if not isinstance(kernels, list):
            kernels = []

        summary = Table(title="Runtime Inspection")
        summary.add_column("Field", style="cyan")
        summary.add_column("Value")
        summary.add_row("Runtime", str(refreshed.name or pod_name))
        summary.add_row("Pod", str(pod_name))
        summary.add_row("UID", str(refreshed.uid or ""))
        summary.add_row("Ingress", endpoint)
        summary.add_row("Kernels", str(len(kernels)))
        console.print(summary)

        kernels_table = Table(title="Available Kernels")
        kernels_table.add_column("ID", style="green")
        kernels_table.add_column("Name")
        kernels_table.add_column("State")
        kernels_table.add_column("Connections")
        kernels_table.add_column("Last Activity")

        for kernel in kernels:
            kernels_table.add_row(
                str((kernel or {}).get("id") or ""),
                str((kernel or {}).get("name") or ""),
                str((kernel or {}).get("execution_state") or ""),
                str((kernel or {}).get("connections") or "0"),
                str((kernel or {}).get("last_activity") or ""),
            )

        if kernels:
            console.print(kernels_table)
        else:
            console.print("[yellow]No kernels returned by runtime API.[/yellow]")
    except typer.Exit:
        raise
    except Exception as e:
        console.print(f"[red]Error inspecting runtime: {e}[/red]")
        raise typer.Exit(1)


@app.command(name="health")
def runtime_health(
    runtime: Optional[str] = typer.Option(
        None,
        "--runtime",
        "-r",
        help="Runtime identifier (pod name, uid, or given name). Defaults to first running runtime.",
    ),
    token: Optional[str] = typer.Option(
        None,
        "--token",
        help="Authentication token (Bearer token for API requests).",
    ),
    api_key: Optional[str] = typer.Option(
        None,
        "--api-key",
        help="Authentication API key (alias for --token).",
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
    """Check runtime health by executing a probe on the sandbox."""
    try:
        client = _make_client(
            token=token,
            api_key=api_key,
            iam_url=iam_url,
            runtimes_url=runtimes_url,
        )
        runtimes = client.list_runtimes()
        if not runtimes:
            console.print("[yellow]No running runtimes found.[/yellow]")
            raise typer.Exit(1)

        selected = None
        if runtime:
            for candidate in runtimes:
                if runtime in {candidate.pod_name, candidate.uid, candidate.name}:
                    selected = candidate
                    break
            if selected is None:
                console.print(f"[red]Runtime '{runtime}' not found.[/red]")
                raise typer.Exit(1)
        else:
            selected = runtimes[0]

        pod_name = selected.pod_name or selected.uid or selected.name or ""
        refreshed = client.get_runtime(pod_name)
        health = client.check_runtime_health(
            pod_name,
            api_key=api_key,
        )

        health_status = "alive" if bool(health.get("success")) else "unreachable"
        detail = str(health.get("message") or "health probe failed")
        probe_mode = str(health.get("probe_mode") or "n/a")

        table = Table(title="Runtime Health")
        table.add_column("Field", style="cyan")
        table.add_column("Value")
        table.add_row("Runtime", str(refreshed.name or pod_name))
        table.add_row("Pod", str(pod_name))
        table.add_row("UID", str(refreshed.uid or ""))
        table.add_row("Ingress", str(refreshed.ingress or "n/a"))
        table.add_row("Probe", probe_mode)
        table.add_row("Status", health_status)
        table.add_row("Detail", detail)
        console.print(table)

        stdout_tail = str(health.get("stdout_tail") or "").strip()
        if stdout_tail:
            console.print(f"[dim]Probe stdout: {stdout_tail}[/dim]")

        if health_status != "alive":
            raise typer.Exit(1)
    except typer.Exit:
        raise
    except Exception as e:
        console.print(f"[red]Error checking runtime health: {e}[/red]")
        raise typer.Exit(1)
