# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""Environment commands for Datalayer CLI."""

from typing import Any, Dict, Optional

import typer
from rich.console import Console

from datalayer_core.client.client import DatalayerClient
from datalayer_core.displays.environments import display_environments
from datalayer_core.utils.urls import DatalayerURLs

# Create a Typer app for environment commands
app = typer.Typer(
    name="envs", help="Environment management commands", invoke_without_command=True
)

console = Console()


def _make_client(
    token: Optional[str] = None,
    runtimes_url: Optional[str] = None,
) -> DatalayerClient:
    """Create a DatalayerClient with optional runtimes URL override."""
    urls = DatalayerURLs.from_environment(runtimes_url=runtimes_url)
    return DatalayerClient(urls=urls, token=token)


@app.callback()
def envs_callback(ctx: typer.Context) -> None:
    """Environment management commands."""
    if ctx.invoked_subcommand is None:
        typer.echo(ctx.get_help())


@app.command(name="list")
def list_environments(
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
    """List available environments."""
    try:
        client = _make_client(token=token, runtimes_url=runtimes_url)
        environments = client.list_environments()

        # Convert to dict format for display_environments
        env_dicts: list[Dict[str, Any]] = []
        for env in environments:
            env_dicts.append(
                {
                    "name": env.name,
                    "title": env.title,
                    "burning_rate": env.burning_rate,
                    "language": env.language,
                    "owner": env.owner,
                    "visibility": env.visibility,
                    **(env.metadata or {}),
                }
            )

        display_environments(env_dicts)

        if len(env_dicts) > 0:
            console.print("\n[dim]Create a Runtime with e.g.[/dim]")
            for env_dict in env_dicts:
                console.print(
                    f"[dim]datalayer runtimes create --given-name my-runtime --credits-limit 3 {env_dict['name']}[/dim]"
                )
            console.print()

    except Exception as e:
        console.print(f"[red]Error listing environments: {e}[/red]")
        raise typer.Exit(1)


@app.command(name="ls")
def list_environments_alias(
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
    """List available environments (alias for list)."""
    list_environments(token=token, runtimes_url=runtimes_url)


# Root level commands for convenience
def envs_list(
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
    """List available environments (root command)."""
    list_environments(token=token, runtimes_url=runtimes_url)


def envs_ls(
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
    """List available environments (root command alias)."""
    list_environments(token=token, runtimes_url=runtimes_url)
