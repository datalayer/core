# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""Execution application for running code in Datalayer runtimes."""

from __future__ import annotations

import json
import signal
import sys
from pathlib import Path
from typing import Any, Optional

import typer
from rich.console import Console

from datalayer_core.client.client import DatalayerClient
from datalayer_core.console.manager import RuntimeManager
from datalayer_core.utils.notebook import get_cells

# Create the main Typer app for exec functionality
app = typer.Typer(name="exec", help="Execute files or notebooks on runtimes")

console = Console()


class RuntimesExecService:
    """Service for executing files on Datalayer runtimes."""

    def __init__(self, token: Optional[str] = None) -> None:
        """Initialize the exec service."""
        self.kernel_manager: Optional[RuntimeManager] = None
        self.kernel_client = None
        self._executing = False
        self._client = DatalayerClient(token=token)

    def handle_sigint(self, *args: Any) -> None:
        """Handle SIGINT signal during kernel execution."""
        if self._executing:
            if self.kernel_manager:
                self.kernel_manager.interrupt_kernel()
            else:
                console.print(
                    "[red]ERROR: Cannot interrupt kernels we didn't start.[/red]",
                    file=sys.stderr,
                )
        else:
            # raise the KeyboardInterrupt if we aren't waiting for execution,
            # so that the interact loop advances, and prompt is redrawn, etc.
            raise KeyboardInterrupt

    def init_kernel_manager(self, runtime_name: str) -> None:
        """Initialize the kernel manager and connect to runtime."""
        try:
            # Get runtime information using DatalayerClient
            runtimes = self._client.list_runtimes()
            target_runtime = None

            # Find the target runtime
            for runtime in runtimes:
                if runtime.name == runtime_name or runtime.uid == runtime_name:
                    target_runtime = runtime
                    break

            if target_runtime is None:
                raise RuntimeError(f"Runtime '{runtime_name}' not found")

            # Get token using the same method as DatalayerClient
            token = self._client._get_token()

            # Create a RuntimeManager with proper credentials
            self.kernel_manager = RuntimeManager(
                run_url=self._client.urls.run_url,
                token=token or "",
                username="",  # Username is not required for token-based auth
            )

            # Set up signal handler
            signal.signal(signal.SIGINT, self.handle_sigint)

            # Start kernel and get client
            self.kernel_manager.start_kernel(name=runtime_name)
            self.kernel_client = self.kernel_manager.client

            if self.kernel_client:
                self.kernel_client.start_channels()
                console.print(f"[green]Connected to runtime: {runtime_name}[/green]")
            else:
                raise RuntimeError("Failed to create kernel client")

        except Exception as e:
            console.print(
                f"[red]Failed to connect to runtime '{runtime_name}': {e}[/red]"
            )

            # Provide helpful authentication guidance
            if "Token is required" in str(e) or "authentication" in str(e).lower():
                console.print(
                    "[yellow]Hint: Make sure you're authenticated. You can:[/yellow]"
                )
                console.print("[yellow]  1. Run 'dla login' to authenticate[/yellow]")
                console.print(
                    "[yellow]  2. Set DATALAYER_API_KEY environment variable[/yellow]"
                )
                console.print("[yellow]  3. Use --token option if available[/yellow]")

            raise typer.Exit(1)

    def execute_file(
        self,
        filepath: Path,
        silent: bool = True,
        timeout: Optional[float] = None,
        raise_exceptions: bool = False,
    ) -> None:
        """
        Execute a file or notebook on the connected runtime.

        Parameters
        ----------
        filepath : Path
            Path to the file to execute.
        silent : bool
            Whether to suppress cell output.
        timeout : Optional[float]
            Execution timeout for each cell.
        raise_exceptions : bool
            Whether to stop on exceptions.
        """
        if not self.kernel_client:
            raise RuntimeError("Kernel client not initialized")

        try:
            self._executing = True
            console.print(f"[blue]Executing file: {filepath}[/blue]")

            # Get cells from the file
            cells = list(get_cells(filepath))

            if not cells:
                console.print("[yellow]No executable cells found in file[/yellow]")
                return

            total_cells = len(cells)
            console.print(f"[blue]Found {total_cells} cell(s) to execute[/blue]")

            # Execute each cell
            for i, (cell_id, cell_source) in enumerate(cells, 1):
                if not cell_source.strip():
                    continue

                console.print(f"[blue]Executing cell {i}/{total_cells}...[/blue]")

                try:
                    reply = self.kernel_client.execute_interactive(
                        cell_source, silent=silent, timeout=timeout
                    )

                    if raise_exceptions and reply["content"]["status"] != "ok":
                        content = reply["content"]
                        if content["status"] == "error":
                            if cell_id:
                                console.print(
                                    f"[red]Exception when running cell {cell_id}[/red]"
                                )
                            console.print(
                                "[red]" + "\n".join(content["traceback"]) + "[/red]"
                            )
                            raise typer.Exit(1)
                        else:
                            raise RuntimeError(
                                f"Unknown failure: {json.dumps(content)}"
                            )

                    # Show success for each cell if not silent
                    if not silent:
                        status = reply["content"]["status"]
                        if status == "ok":
                            console.print(
                                f"[green]✓ Cell {i} executed successfully[/green]"
                            )
                        else:
                            console.print(
                                f"[yellow]⚠ Cell {i} completed with status: {status}[/yellow]"
                            )

                except Exception as e:
                    if raise_exceptions:
                        raise
                    console.print(f"[yellow]Warning: Cell {i} failed: {e}[/yellow]")

            console.print("[green]✓ Execution completed successfully[/green]")

        except Exception as e:
            if raise_exceptions:
                raise
            console.print(f"[red]Error executing file: {e}[/red]")
            raise typer.Exit(1)
        finally:
            self._executing = False

    def cleanup(self) -> None:
        """Clean up resources."""
        if self.kernel_client:
            try:
                self.kernel_client.stop_channels()
            except Exception as e:
                console.print(f"[yellow]Warning during cleanup: {e}[/yellow]")


# Main execution function decorated as the default command
@app.command()
def main(
    filename: str = typer.Argument(..., help="Path to the file or notebook to execute"),
    runtime: Optional[str] = typer.Option(
        None,
        "--runtime",
        "-r",
        help="Name of the runtime to execute on (uses first available if not specified)",
    ),
    verbose: bool = typer.Option(
        False, "--verbose", "-v", help="Show all cell outputs"
    ),
    timeout: Optional[float] = typer.Option(
        None, "--timeout", "-t", help="Execution timeout for each cell in seconds"
    ),
    raise_exceptions: bool = typer.Option(
        False, "--raise", help="Stop executing if an exception occurs"
    ),
    token: Optional[str] = typer.Option(
        None,
        "--token",
        help="Authentication token (Bearer token for API requests).",
    ),
) -> None:
    """Execute a Python file or Jupyter notebook on a Datalayer runtime."""

    # Resolve file path
    filepath = Path(filename).expanduser().resolve()

    # Check if file exists and is readable
    if not filepath.exists():
        console.print(f"[red]Error: File '{filepath}' does not exist[/red]")
        raise typer.Exit(1)

    if not filepath.is_file():
        console.print(f"[red]Error: '{filepath}' is not a file[/red]")
        raise typer.Exit(1)

    try:
        with filepath.open("rb"):
            pass
    except Exception as e:
        console.print(
            f"[red]Error: Could not open file '{filepath}' for reading: {e}[/red]"
        )
        raise typer.Exit(1)

    # Check file extension
    if filepath.suffix not in [".py", ".ipynb"]:
        console.print(
            f"[yellow]Warning: File extension '{filepath.suffix}' is not .py or .ipynb[/yellow]"
        )

    # Determine which runtime to use
    selected_runtime = runtime
    if selected_runtime is None:
        selected_runtime = _select_runtime(token=token)

    # Create exec service and execute
    exec_service = RuntimesExecService(token=token)

    try:
        # Initialize connection to runtime
        exec_service.init_kernel_manager(selected_runtime)

        # Execute the file
        exec_service.execute_file(
            filepath=filepath,
            silent=not verbose,
            timeout=timeout,
            raise_exceptions=raise_exceptions,
        )

    finally:
        # Always cleanup
        exec_service.cleanup()


def _select_runtime(token: Optional[str] = None) -> str:
    """
    Select a runtime to use for execution.

    Returns the first available runtime, or prompts to create one if none exist.

    Parameters
    ----------
    token : Optional[str]
        Authentication token for API requests.

    Returns
    -------
    str
        The name/ID of the runtime to use.
    """
    try:
        client = DatalayerClient(token=token)
        runtimes = client.list_runtimes()

        if not runtimes:
            # No runtimes available, prompt to create one
            console.print("[yellow]No runtimes are currently available.[/yellow]")
            console.print("[blue]You can create a runtime using:[/blue]")
            console.print("  [cyan]dla runtimes create <environment>[/cyan]")
            console.print("\n[blue]Or list available environments with:[/blue]")
            console.print("  [cyan]dla envs list[/cyan]")
            raise typer.Exit(1)

        # Use the first available runtime
        selected = runtimes[0]
        console.print(
            f"[blue]No runtime specified, using: {selected.name} ({selected.uid})[/blue]"
        )
        return selected.name or selected.uid or ""

    except typer.Exit:
        # Re-raise typer.Exit without modification
        raise
    except Exception as e:
        console.print(f"[red]Error checking available runtimes: {e}[/red]")
        console.print(
            "[yellow]Hint: Make sure you're authenticated with 'dla login'[/yellow]"
        )
        raise typer.Exit(1)


if __name__ == "__main__":
    app()
