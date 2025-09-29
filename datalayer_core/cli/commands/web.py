# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""Web application commands for Datalayer CLI."""

import sys
from typing import Optional

import typer
from rich.console import Console

from datalayer_core.base.serverapplication import launch_new_instance
from datalayer_core.utils.urls import DatalayerURLs

# Create a Typer app for web commands
app = typer.Typer(name="web", help="Web application commands")

console = Console()


@app.command(name="start")
def web_start(
    run_url: Optional[str] = typer.Option(
        None,
        "--run-url",
        help="Datalayer Run URL",
    ),
    disable_xsrf: bool = typer.Option(
        True,
        "--disable-xsrf/--enable-xsrf",
        help="Disable XSRF protection",
    ),
) -> None:
    """Launch the Datalayer web application."""
    try:
        # Get URLs configuration
        urls = DatalayerURLs.from_environment(run_url=run_url)

        # Prepare arguments for Jupyter server
        sys.argv = [
            "",
            f"--ServerApp.disable_check_xsrf={disable_xsrf}",
            "--DatalayerExtensionApp.webapp=True",
            f"--DatalayerExtensionApp.run_url={urls.run_url}",
        ]

        console.print("[green]Starting Datalayer web application...[/green]")
        console.print(f"Run URL: {urls.run_url}")
        console.print("[yellow]Press Ctrl+C to stop the server[/yellow]")

        # Launch the Jupyter server
        launch_new_instance()

    except KeyboardInterrupt:
        console.print("\n[yellow]Datalayer web application stopped.[/yellow]")
    except Exception as e:
        console.print(f"[red]Error starting web application: {e}[/red]")
        raise typer.Exit(1)


# For backward compatibility, also allow just `d web` without subcommand
@app.callback(invoke_without_command=True)
def web_callback(
    ctx: typer.Context,
    run_url: Optional[str] = typer.Option(
        None,
        "--run-url",
        help="Datalayer Run URL",
    ),
    disable_xsrf: bool = typer.Option(
        True,
        "--disable-xsrf/--enable-xsrf",
        help="Disable XSRF protection",
    ),
) -> None:
    """Launch the Datalayer web application (default behavior)."""
    if ctx.invoked_subcommand is None:
        # Call web_start with the same parameters
        web_start(run_url=run_url, disable_xsrf=disable_xsrf)


if __name__ == "__main__":
    app()
