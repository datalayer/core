# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""Runtime commands for Datalayer CLI."""

from typing import Optional

import typer
from rich.console import Console

from datalayer_core.client.client import DatalayerClient
from datalayer_core.displays.runtimes import display_runtimes

# Create a Typer app for runtime commands
app = typer.Typer(name="runtimes", help="Runtime management commands")

console = Console()


@app.command(name="list")
def list_runtimes() -> None:
    """List running runtimes."""
    try:
        client = DatalayerClient()
        runtimes = client.list_runtimes()
        
        # Convert to dict format for display_runtimes
        runtime_dicts = []
        for runtime in runtimes:
            runtime_dicts.append({
                'given_name': runtime.name,
                'environment_name': runtime.environment,
                'pod_name': runtime.pod_name,
                'ingress': runtime.ingress,
                'reservation_id': runtime.reservation_id,
                'uid': runtime.uid,
                'burning_rate': runtime.burning_rate,
                'token': runtime.kernel_token,
                'started_at': runtime.started_at,
                'expired_at': runtime.expired_at,
            })
        
        display_runtimes(runtime_dicts)
        
    except Exception as e:
        console.print(f"[red]Error listing runtimes: {e}[/red]")
        raise typer.Exit(1)


@app.command(name="ls")
def list_runtimes_alias() -> None:
    """List running runtimes (alias for list)."""
    list_runtimes()


@app.command(name="create")
def create_runtime(
    environment: str = typer.Argument(..., help="Environment name"),
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
) -> None:
    """Create a new runtime."""
    try:
        client = DatalayerClient()
        
        # Create runtime
        runtime = client.create_runtime(
            name=given_name,
            environment=environment,
            time_reservation=time_reservation,
        )
        
        # Start the runtime to get full details
        with runtime:
            # Convert to dict format for display_runtimes
            runtime_dict = {
                'given_name': runtime.name,
                'environment_name': runtime.environment,
                'pod_name': runtime.pod_name,
                'ingress': runtime.ingress,
                'reservation_id': runtime.reservation_id,
                'uid': runtime.uid,
                'burning_rate': runtime.burning_rate,
                'token': runtime.kernel_token,
                'started_at': runtime.started_at,
                'expired_at': runtime.expired_at,
            }
            
            display_runtimes([runtime_dict])
            console.print(f"[green]Runtime '{runtime.name}' created successfully![/green]")
        
    except Exception as e:
        console.print(f"[red]Error creating runtime: {e}[/red]")
        raise typer.Exit(1)


@app.command(name="terminate")
def terminate_runtime(
    pod_name: str = typer.Argument(..., help="Pod name of the runtime to terminate")
) -> None:
    """Terminate a running runtime."""
    try:
        client = DatalayerClient()
        
        success = client.terminate_runtime(pod_name)
        
        if success:
            console.print(f"[green]Runtime '{pod_name}' terminated successfully![/green]")
        else:
            console.print(f"[red]Failed to terminate runtime '{pod_name}'[/red]")
            raise typer.Exit(1)
        
    except Exception as e:
        console.print(f"[red]Error terminating runtime: {e}[/red]")
        raise typer.Exit(1)


# Root level commands for convenience
def runtimes_list() -> None:
    """List running runtimes (root command)."""
    list_runtimes()


def runtimes_ls() -> None:
    """List running runtimes (root command alias)."""
    list_runtimes()