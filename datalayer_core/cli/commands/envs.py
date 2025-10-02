# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""Environment commands for Datalayer CLI."""

from typing import Any, Dict

import typer
from rich.console import Console

from datalayer_core.client.client import DatalayerClient
from datalayer_core.displays.environments import display_environments

# Create a Typer app for environment commands
app = typer.Typer(name="envs", help="Environment management commands")

console = Console()


@app.command(name="list")
def list_environments() -> None:
    """List available environments."""
    try:
        client = DatalayerClient()
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
def list_environments_alias() -> None:
    """List available environments (alias for list)."""
    list_environments()


# Root level commands for convenience
def envs_list() -> None:
    """List available environments (root command)."""
    list_environments()


def envs_ls() -> None:
    """List available environments (root command alias)."""
    list_environments()
