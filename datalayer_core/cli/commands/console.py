# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""Console commands for Datalayer CLI."""

import sys
from typing import Optional, List

import typer
from rich.console import Console

from datalayer_core.console.consoleapp import RuntimesConsoleApp
from datalayer_core.utils.urls import DatalayerURLs

# Create a Typer app for console commands
app = typer.Typer(name="console", help="Runtime console commands")

console = Console()


@app.command(name="connect")
def console_connect(
    runtime_name: Optional[str] = typer.Option(
        None,
        "--runtime",
        help="The name of the Runtime to connect to",
    ),
    run_url: Optional[str] = typer.Option(
        None,
        "--run-url",
        help="Datalayer Run URL",
    ),
    token: Optional[str] = typer.Option(
        None,
        "--token",
        help="Authentication token",
    ),
    external_token: Optional[str] = typer.Option(
        None,
        "--external-token",
        help="External authentication token",
    ),
    no_browser: bool = typer.Option(
        False,
        "--no-browser",
        help="Will prompt for user and password on the CLI",
    ),
    kernel_name: Optional[str] = typer.Option(
        None,
        "--kernel-name",
        help="The name of the kernel to connect to",
    ),
    kernel_path: Optional[str] = typer.Option(
        None,
        "--kernel-path", 
        help="The path where the kernel should be started",
    ),
    existing: Optional[str] = typer.Option(
        None,
        "--existing",
        help="Connect to an existing kernel instead of starting a new one",
    ),
    extra_args: Optional[List[str]] = typer.Argument(
        None,
        help="Additional arguments to pass to the console application"
    ),
) -> None:
    """Connect to a Datalayer runtime console."""
    try:
        # Get URLs configuration
        urls = DatalayerURLs.from_environment(run_url=run_url)
        
        console.print("[green]Starting Datalayer runtime console...[/green]")
        console.print(f"Run URL: {urls.run_url}")
        if runtime_name:
            console.print(f"Runtime: {runtime_name}")
        console.print("[yellow]Press Ctrl+D or Ctrl+C to exit the console[/yellow]")
        
        # Prepare sys.argv for the RuntimesConsoleApp
        args = []
        
        if runtime_name:
            args.extend(["--runtime", runtime_name])
        if urls.run_url:
            args.extend(["--run-url", urls.run_url])
        if token:
            args.extend(["--token", token])
        if external_token:
            args.extend(["--external-token", external_token])
        if no_browser:
            args.append("--no-browser")
        if kernel_name:
            args.extend(["--kernel-name", kernel_name])
        if kernel_path:
            args.extend(["--kernel-path", kernel_path])
        if existing:
            args.extend(["--existing", existing])
        
        # Add any extra arguments
        if extra_args:
            args.extend(extra_args)
        
        # Modify sys.argv to pass arguments to RuntimesConsoleApp
        original_argv = sys.argv.copy()
        sys.argv = ["datalayer-console"] + args
        
        try:
            # Launch the RuntimesConsoleApp
            app_instance = RuntimesConsoleApp()
            app_instance.initialize()
            app_instance.start()
        finally:
            # Restore original sys.argv
            sys.argv = original_argv
        
    except KeyboardInterrupt:
        console.print("\n[yellow]Console session ended.[/yellow]")
    except Exception as e:
        console.print(f"[red]Error connecting to runtime console: {e}[/red]")
        raise typer.Exit(1)


# For backward compatibility, make connect the default command
@app.callback(invoke_without_command=True)
def console_callback(
    ctx: typer.Context,
    runtime_name: Optional[str] = typer.Option(
        None,
        "--runtime",
        help="The name of the Runtime to connect to",
    ),
    run_url: Optional[str] = typer.Option(
        None,
        "--run-url",
        help="Datalayer Run URL",
    ),
    token: Optional[str] = typer.Option(
        None,
        "--token",
        help="Authentication token",
    ),
    external_token: Optional[str] = typer.Option(
        None,
        "--external-token",
        help="External authentication token",
    ),
    no_browser: bool = typer.Option(
        False,
        "--no-browser",
        help="Will prompt for user and password on the CLI",
    ),
    kernel_name: Optional[str] = typer.Option(
        None,
        "--kernel-name",
        help="The name of the kernel to connect to",
    ),
    kernel_path: Optional[str] = typer.Option(
        None,
        "--kernel-path", 
        help="The path where the kernel should be started",
    ),
    existing: Optional[str] = typer.Option(
        None,
        "--existing",
        help="Connect to an existing kernel instead of starting a new one",
    ),
) -> None:
    """Connect to a Datalayer runtime console (default behavior)."""
    if ctx.invoked_subcommand is None:
        # Get any remaining arguments that weren't parsed
        extra_args = []
        if hasattr(ctx, 'params') and ctx.params:
            # Add any extra arguments from context
            pass
            
        # Call console_connect with the parameters
        console_connect(
            runtime_name=runtime_name,
            run_url=run_url,
            token=token,
            external_token=external_token,
            no_browser=no_browser,
            kernel_name=kernel_name,
            kernel_path=kernel_path,
            existing=existing,
            extra_args=extra_args
        )


if __name__ == "__main__":
    app()