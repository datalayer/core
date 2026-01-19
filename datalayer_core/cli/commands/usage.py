# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""Usage/credits commands for Datalayer CLI."""

from typing import Optional

import typer
from rich.console import Console

from datalayer_core.client.client import DatalayerClient
from datalayer_core.displays.usage import display_usage

app = typer.Typer(name="usage", help="Usage and credits commands")
console = Console()


@app.command(name="show")
def usage_show(
    token: Optional[str] = typer.Option(
        None,
        "--token",
        help="Authentication token (Bearer token for API requests).",
    ),
    raw: bool = typer.Option(
        False,
        "--raw",
        help="Print raw JSON payload from IAM.",
    ),
) -> None:
    """Show credits usage and reservations."""
    try:
        client = DatalayerClient(token=token)
        usage = client.get_usage_credits()
        if not usage.get("success", True):
            console.print(f"[red]Error: {usage.get('message', 'Unknown error')}[/red]")
            raise typer.Exit(1)

        if raw:
            console.print(usage)
            return

        display_usage(usage)
    except Exception as e:
        console.print(f"[red]Error fetching usage: {e}[/red]")
        raise typer.Exit(1)


# Root-level command for convenience

def usage_root(
    token: Optional[str] = typer.Option(
        None,
        "--token",
        help="Authentication token (Bearer token for API requests).",
    ),
) -> None:
    """Show credits usage and reservations (root command)."""
    usage_show(token=token)
