# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""Config command for Datalayer CLI."""

from typing import Optional

import questionary
import typer
from rich.console import Console
from rich.panel import Panel
from rich.table import Table

from datalayer_core.base.user_config import (
    CONFIG_FILE,
    DEFAULT_IAM_URL,
    DEFAULT_RUNTIMES_URL,
    get_config,
    get_iam_url,
    get_runtimes_url,
    set_config,
)

# Create a Typer app for the config command
app = typer.Typer(name="config", help="Configuration management commands")

console = Console()


def _display_config() -> None:
    """Display the current configuration."""
    config = get_config()
    iam_url = config.get("iam_url", DEFAULT_IAM_URL)
    runtimes_url = config.get("runtimes_url", DEFAULT_RUNTIMES_URL)

    table = Table(title="Current Configuration", show_header=True)
    table.add_column("Setting", style="cyan")
    table.add_column("Value", style="green")
    table.add_column("Source", style="dim")

    iam_source = "config" if "iam_url" in config else "default"
    runtimes_source = "config" if "runtimes_url" in config else "default"

    table.add_row("IAM URL", iam_url, iam_source)
    table.add_row("Runtimes URL", runtimes_url, runtimes_source)

    console.print()
    console.print(table)
    console.print(f"\n[dim]Config file: {CONFIG_FILE}[/dim]")


@app.command(name="show")
def show() -> None:
    """Show the current configuration."""
    _display_config()


@app.command(name="set")
def set_values(
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
    """Set configuration values non-interactively."""
    if iam_url is None and runtimes_url is None:
        console.print(
            "[yellow]No values to set. Use --iam-url and/or --runtimes-url.[/yellow]"
        )
        raise typer.Exit(1)

    set_config(iam_url=iam_url, runtimes_url=runtimes_url)
    console.print("[green]Configuration updated.[/green]")
    _display_config()


@app.command(name="edit")
def edit() -> None:
    """Interactively edit the configuration."""
    current_iam = get_iam_url()
    current_runtimes = get_runtimes_url()

    _display_config()

    console.print()
    change = questionary.confirm(
        "Do you want to change the configuration?",
        default=False,
    ).ask()

    if not change:
        console.print("[dim]No changes made.[/dim]")
        return

    # Ask for IAM URL
    new_iam = questionary.text(
        "IAM URL:",
        default=current_iam,
    ).ask()

    if new_iam is None:
        # User cancelled (Ctrl+C)
        console.print("[dim]Cancelled.[/dim]")
        return

    # Ask for Runtimes URL
    new_runtimes = questionary.text(
        "Runtimes URL:",
        default=current_runtimes,
    ).ask()

    if new_runtimes is None:
        console.print("[dim]Cancelled.[/dim]")
        return

    set_config(iam_url=new_iam, runtimes_url=new_runtimes)
    console.print("\n[green]Configuration saved.[/green]")
    _display_config()


# Default command (invoked when running `datalayer config` with no subcommand)
@app.callback(invoke_without_command=True)
def config_callback(ctx: typer.Context) -> None:
    """Show or edit Datalayer CLI configuration."""
    if ctx.invoked_subcommand is None:
        _display_config()

        console.print()
        change = questionary.confirm(
            "Do you want to change the configuration?",
            default=False,
        ).ask()

        if not change:
            console.print("[dim]No changes made.[/dim]")
            return

        current_iam = get_iam_url()
        current_runtimes = get_runtimes_url()

        new_iam = questionary.text(
            "IAM URL:",
            default=current_iam,
        ).ask()

        if new_iam is None:
            console.print("[dim]Cancelled.[/dim]")
            return

        new_runtimes = questionary.text(
            "Runtimes URL:",
            default=current_runtimes,
        ).ask()

        if new_runtimes is None:
            console.print("[dim]Cancelled.[/dim]")
            return

        set_config(iam_url=new_iam, runtimes_url=new_runtimes)
        console.print("\n[green]Configuration saved.[/green]")
        _display_config()
