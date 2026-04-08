# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""Runtime commands for Datalayer CLI."""

from typing import Optional

import typer
from rich.console import Console

from datalayer_core.client.client import DatalayerClient
from datalayer_core.displays.runtimes import display_runtimes
from datalayer_core.utils.urls import DatalayerURLs

# Create a Typer app for runtime commands
app = typer.Typer(name="runtimes", help="Runtime management commands", invoke_without_command=True)

console = Console()


@app.callback()
def runtimes_callback(ctx: typer.Context) -> None:
    """Runtime management commands."""
    if ctx.invoked_subcommand is None:
        typer.echo(ctx.get_help())


def _make_client(
    token: Optional[str] = None,
    runtimes_url: Optional[str] = None,
) -> DatalayerClient:
    """Create a DatalayerClient with optional runtimes URL override."""
    urls = DatalayerURLs.from_environment(runtimes_url=runtimes_url)
    return DatalayerClient(urls=urls, token=token)


@app.command(name="list")
def list_runtimes(
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
) -> None:
    """List running runtimes."""
    try:
        client = _make_client(token=token, runtimes_url=runtimes_url)
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


@app.command(name="ls")
def list_runtimes_alias(
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
) -> None:
    """List running runtimes (alias for list)."""
    list_runtimes(token=token, runtimes_url=runtimes_url)


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
) -> None:
    """Create a new runtime."""
    import questionary

    try:
        client = _make_client(token=token, runtimes_url=runtimes_url)

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
    pod_name: Optional[str] = typer.Argument(None, help="Pod name of the runtime to terminate"),
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
) -> None:
    """Terminate a running runtime."""
    import questionary

    try:
        client = _make_client(token=token, runtimes_url=runtimes_url)

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
    runtimes_url: Optional[str] = typer.Option(
        None,
        "--runtimes-url",
        help="Datalayer Runtimes server URL",
    ),
) -> None:
    """List running runtimes (root command)."""
    list_runtimes(token=token, runtimes_url=runtimes_url)


def runtimes_ls(
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
) -> None:
    """List running runtimes (root command alias)."""
    list_runtimes(token=token, runtimes_url=runtimes_url)
