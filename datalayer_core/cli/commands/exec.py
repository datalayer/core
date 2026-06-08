# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""Execution application for running code in Datalayer runtimes."""

from __future__ import annotations

import json
import signal
import sys
import tempfile
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional
from uuid import uuid4

import typer
from rich.console import Console

from datalayer_core.client.client import DatalayerClient
from datalayer_core.console.manager import RuntimeManager
from datalayer_core.utils.network import fetch
from datalayer_core.utils.notebook import get_cells

# Create the main Typer app for exec functionality
app = typer.Typer(
    name="exec",
    help="Execute files or notebooks on runtimes",
    invoke_without_command=True,
)

console = Console()

KERNEL_READY_TIMEOUT_SECONDS = 1.0
KERNEL_PROBE_TIMEOUT_SECONDS = 1.0


@app.callback()
def exec_callback(ctx: typer.Context) -> None:
    """Execute files or notebooks on runtimes."""
    if ctx.invoked_subcommand is None:
        typer.echo(ctx.get_help())


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
        max_attempts = 2
        last_error: Exception | None = None
        # Set up signal handler once.
        signal.signal(signal.SIGINT, self.handle_sigint)

        for attempt in range(1, max_attempts + 1):
            try:
                # Validate runtime only when explicitly provided.
                # Empty runtime name delegates selection/creation to RuntimeManager.start_kernel.
                if runtime_name:
                    runtimes = self._client.list_runtimes()
                    target_runtime = None

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

                # Start kernel and get client
                self.kernel_manager.start_kernel(name=runtime_name or "")
                self.kernel_client = self.kernel_manager.client

                if not self.kernel_client:
                    raise RuntimeError("Failed to create kernel client")

                self.kernel_client.start_channels()
                # Fresh runtimes can report healthy before the kernel channels are
                # fully ready for requests. Wait explicitly to avoid hanging on
                # the first execute call.
                self.kernel_client.wait_for_ready(timeout=KERNEL_READY_TIMEOUT_SECONDS)
                self._probe_kernel_execution()
                console.print(
                    f"[green]Connected to runtime: {runtime_name or 'auto-selected'}[/green]"
                )
                return
            except Exception as e:
                last_error = e
                self.cleanup()
                self.kernel_manager = None
                self.kernel_client = None
                if attempt < max_attempts:
                    console.print(
                        "[yellow]Kernel not ready yet, retrying connection...[/yellow]"
                    )
                    time.sleep(1.5 * attempt)
                    continue
                break

        if last_error is None:
            last_error = RuntimeError("Unknown runtime initialization failure")

        e = last_error
        try:
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
        finally:
            raise typer.Exit(1)

    def _probe_kernel_execution(self) -> None:
        """Validate the kernel can execute a trivial statement before running user code."""
        if not self.kernel_client:
            raise RuntimeError("Kernel client not initialized")

        self.kernel_client.execute_interactive(
            "1+1",
            silent=True,
            timeout=KERNEL_PROBE_TIMEOUT_SECONDS,
        )

    def execute_file(
        self,
        filepath: Path,
        silent: bool = True,
        timeout: Optional[float] = None,
        raise_exceptions: bool = False,
    ) -> dict[str, Any]:
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

        report: dict[str, Any] = {
            "input_file": str(filepath),
            "cells": [],
        }

        try:
            self._executing = True
            console.print(f"[blue]Executing file: {filepath}[/blue]")

            # Guardrail: ensure the selected runtime endpoint is reachable
            # before submitting any execute requests.
            self._assert_runtime_alive()

            # Get cells from the file
            cells = list(get_cells(filepath))

            if not cells:
                console.print("[yellow]No executable cells found in file[/yellow]")
                return report

            total_cells = len(cells)
            console.print(f"[blue]Found {total_cells} cell(s) to execute[/blue]")
            failed_cells = 0
            effective_timeout = float(timeout) if timeout is not None else None

            # Execute each cell
            for i, (cell_id, cell_source) in enumerate(cells, 1):
                if not cell_source.strip():
                    continue

                console.print(f"[blue]Executing cell {i}/{total_cells}...[/blue]")
                captured_outputs: list[dict[str, Any]] = []

                def output_hook(msg: dict[str, Any]) -> None:
                    msg_type = str(msg.get("msg_type") or "")
                    content = msg.get("content") or {}

                    if msg_type == "stream":
                        captured_outputs.append(
                            {
                                "output_type": "stream",
                                "name": content.get("name", "stdout"),
                                "text": content.get("text", ""),
                            }
                        )
                        return

                    if msg_type in {"display_data", "execute_result"}:
                        data = content.get("data") or {}
                        captured_outputs.append(
                            {
                                "output_type": msg_type,
                                "data": data,
                                "metadata": content.get("metadata") or {},
                                "execution_count": content.get("execution_count"),
                            }
                        )
                        return

                    if msg_type == "error":
                        captured_outputs.append(
                            {
                                "output_type": "error",
                                "ename": content.get("ename"),
                                "evalue": content.get("evalue"),
                                "traceback": content.get("traceback") or [],
                            }
                        )

                cell_report: dict[str, Any] = {
                    "cell_index": i,
                    "cell_id": cell_id,
                    "status": "ok",
                    "outputs": captured_outputs,
                }

                try:
                    try:
                        reply = self.kernel_client.execute_interactive(
                            cell_source,
                            silent=silent,
                            timeout=effective_timeout,
                            output_hook=output_hook,
                        )
                    except TypeError:
                        # Backward compatibility when output_hook is not available.
                        reply = self.kernel_client.execute_interactive(
                            cell_source,
                            silent=silent,
                            timeout=effective_timeout,
                        )

                    cell_report["reply"] = reply.get("content") if isinstance(reply, dict) else {}

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

                    self._print_cell_outputs(i, captured_outputs)

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

                    if reply["content"].get("status") != "ok":
                        cell_report["status"] = str(reply["content"].get("status") or "error")
                        failed_cells += 1

                except Exception as e:
                    if raise_exceptions:
                        raise
                    failed_cells += 1
                    cell_report["status"] = "error"
                    cell_report["error"] = str(e)
                    console.print(f"[yellow]Warning: Cell {i} failed: {e}[/yellow]")
                finally:
                    report["cells"].append(cell_report)

            if failed_cells > 0:
                console.print(
                    f"[red]Execution completed with {failed_cells} failed cell(s).[/red]"
                )
                report["failed_cells"] = failed_cells
                report["success"] = False
            else:
                console.print("[green]✓ Execution completed successfully[/green]")
                report["failed_cells"] = 0
                report["success"] = True
            return report

        except typer.Exit:
            raise
        except Exception as e:
            if raise_exceptions:
                raise
            console.print(f"[red]Error executing file: {e}[/red]")
            raise typer.Exit(1)
        finally:
            self._executing = False

    def _print_cell_outputs(self, cell_index: int, outputs: list[dict[str, Any]]) -> None:
        """Print collected outputs for a cell after execution."""
        if not outputs:
            console.print(f"[dim]Cell {cell_index} output: (no output)[/dim]")
            return

        console.print(f"[cyan]Cell {cell_index} output:[/cyan]")
        for output in outputs:
            output_type = str(output.get("output_type") or "")
            if output_type == "stream":
                text = str(output.get("text") or "").rstrip("\n")
                if text:
                    console.print(text)
                continue

            if output_type in {"display_data", "execute_result"}:
                data = output.get("data") or {}
                text_plain = ""
                if isinstance(data, dict):
                    text_plain = str(data.get("text/plain") or "").rstrip("\n")
                if text_plain:
                    console.print(text_plain)
                else:
                    console.print(json.dumps(output, ensure_ascii=False))
                continue

            if output_type == "error":
                traceback = output.get("traceback") or []
                if traceback:
                    console.print("[red]" + "\n".join(str(line) for line in traceback) + "[/red]")
                else:
                    ename = str(output.get("ename") or "Error")
                    evalue = str(output.get("evalue") or "")
                    console.print(f"[red]{ename}: {evalue}[/red]")
                continue

            console.print(json.dumps(output, ensure_ascii=False))

    def _assert_runtime_alive(self) -> None:
        """Fail early when the selected runtime endpoint is not reachable."""
        if not self.kernel_manager:
            raise RuntimeError("Runtime manager is not initialized")

        server_url = str(getattr(self.kernel_manager, "server_url", "") or "").rstrip("/")
        runtime_token = str(getattr(self.kernel_manager, "token", "") or "")
        if not server_url:
            raise RuntimeError("Runtime endpoint is not available")

        attempts = 5
        last_error: Exception | None = None
        for attempt in range(1, attempts + 1):
            try:
                fetch(f"{server_url}/api/kernels", token=runtime_token, timeout=15)
                return
            except Exception as e:
                last_error = e
                if attempt < attempts:
                    time.sleep(0.4 * attempt)
                    continue
                break

        raise RuntimeError(
            f"Runtime health check failed for '{server_url}': {last_error}"
        ) from last_error

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
    filename: Optional[str] = typer.Argument(
        None,
        help="Path to the file or notebook to execute",
    ),
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
        None,
        "--timeout",
        "-t",
        help="Execution timeout for each cell in seconds",
    ),
    raise_exceptions: bool = typer.Option(
        False, "--raise", help="Stop executing if an exception occurs"
    ),
    token: Optional[str] = typer.Option(
        None,
        "--token",
        help="Authentication token (Bearer token for API requests).",
    ),
    example_notebook: bool = typer.Option(
        False,
        "--example-notebook",
        help="Create a temporary example notebook, execute it, then remove it.",
    ),
    example_py: bool = typer.Option(
        False,
        "--example-py",
        help="Create a temporary example Python file, execute it, then remove it.",
    ),
    output_name: Optional[str] = typer.Option(
        None,
        "--output-name",
        help="Output report filename/path. Defaults to <input-name>.out.json next to the input file.",
    ),
) -> None:
    """Execute a Python file or Jupyter notebook on a Datalayer runtime."""

    if example_notebook and example_py:
        console.print(
            "[red]Error: --example-notebook and --example-py are mutually exclusive[/red]"
        )
        raise typer.Exit(1)

    if filename and (example_notebook or example_py):
        console.print(
            "[red]Error: provide either a filename or one --example-* flag, not both[/red]"
        )
        raise typer.Exit(1)

    if not filename and not example_notebook and not example_py:
        console.print(
            "[red]Error: missing FILE_PATH or an --example-* option[/red]"
        )
        raise typer.Exit(1)

    generated_example = False
    filepath: Path
    if example_notebook:
        filepath = _create_example_notebook_file()
        generated_example = True
        console.print(f"[blue]Generated example notebook: {filepath}[/blue]")
    elif example_py:
        filepath = _create_example_python_file()
        generated_example = True
        console.print(f"[blue]Generated example Python file: {filepath}[/blue]")
    else:
        # Resolve file path
        filepath = Path(str(filename)).expanduser().resolve()

    try:
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
            execution_report = exec_service.execute_file(
                filepath=filepath,
                silent=not verbose,
                timeout=timeout,
                raise_exceptions=raise_exceptions,
            )

            report_path = _resolve_output_report_path(filepath, output_name)
            execution_report["output_file"] = str(report_path)
            report_path.write_text(
                json.dumps(execution_report, indent=2, ensure_ascii=False),
                encoding="utf-8",
            )
            console.print(f"[green]Saved execution outputs: {report_path}[/green]")
            console.print(f"[green]Full output report path: {report_path.resolve()}[/green]")
            if int(execution_report.get("failed_cells") or 0) > 0:
                raise typer.Exit(1)

        finally:
            # Always cleanup
            exec_service.cleanup()
    finally:
        if generated_example:
            try:
                filepath.unlink(missing_ok=True)
            except Exception as e:
                console.print(
                    f"[yellow]Warning: could not remove temporary example file '{filepath}': {e}[/yellow]"
                )


def _example_file_path(suffix: str) -> Path:
    ts = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")
    name = f"datalayer-exec-example-{ts}-{uuid4().hex[:8]}{suffix}"
    return Path(tempfile.gettempdir()) / name


def _create_example_python_file() -> Path:
    path = _example_file_path(".py")
    path.write_text(
        "import json\n"
        "import pandas as pd\n\n"
        "pd.set_option('display.max_rows', None)\n"
        "pd.set_option('display.max_columns', None)\n"
        "pd.set_option('display.width', None)\n\n"
        "print('Python example: building sample sales dataframe')\n"
        "df = pd.DataFrame({\n"
        "    'day': ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],\n"
        "    'region': ['north', 'north', 'south', 'south', 'west', 'west'],\n"
        "    'orders': [12, 14, 8, 11, 9, 15],\n"
        "    'revenue': [240, 310, 175, 220, 190, 360],\n"
        "})\n\n"
        "print('DataFrame:')\n"
        "print(df.to_string(index=False))\n\n"
        "print('Grouped summary by region:')\n"
        "summary = (\n"
        "    df.groupby('region', as_index=False)\n"
        "      .agg(total_orders=('orders', 'sum'), total_revenue=('revenue', 'sum'))\n"
        "      .sort_values('total_revenue', ascending=False)\n"
        ")\n"
        "print(summary.to_string(index=False))\n\n"
        "payload = {\n"
        "    'rows': int(len(df)),\n"
        "    'best_region': str(summary.iloc[0]['region']),\n"
        "    'total_revenue': int(df['revenue'].sum()),\n"
        "}\n"
        "print('JSON summary:')\n"
        "print(json.dumps(payload, indent=2))\n",
        encoding="utf-8",
    )
    return path


def _create_example_notebook_file() -> Path:
    path = _example_file_path(".ipynb")
    notebook_payload = {
        "cells": [
            {
                "id": f"cell-{uuid4().hex[:8]}",
                "cell_type": "code",
                "execution_count": None,
                "metadata": {"id": f"cell-{uuid4().hex[:8]}", "language": "python"},
                "outputs": [],
                "source": [
                    "import pandas as pd\n",
                    "pd.set_option('display.max_rows', None)\n",
                    "pd.set_option('display.max_columns', None)\n",
                    "pd.set_option('display.width', None)\n",
                    "print('Notebook example: pandas setup complete')\n",
                ],
            },
            {
                "id": f"cell-{uuid4().hex[:8]}",
                "cell_type": "code",
                "execution_count": None,
                "metadata": {"id": f"cell-{uuid4().hex[:8]}", "language": "python"},
                "outputs": [],
                "source": [
                    "df = pd.DataFrame({\n",
                    "    'day': ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],\n",
                    "    'region': ['north', 'north', 'south', 'south', 'west', 'west'],\n",
                    "    'orders': [12, 14, 8, 11, 9, 15],\n",
                    "    'revenue': [240, 310, 175, 220, 190, 360],\n",
                    "})\n",
                    "print('Raw dataframe:')\n",
                    "print(df.to_string(index=False))\n",
                ],
            },
            {
                "id": f"cell-{uuid4().hex[:8]}",
                "cell_type": "code",
                "execution_count": None,
                "metadata": {"id": f"cell-{uuid4().hex[:8]}", "language": "python"},
                "outputs": [],
                "source": [
                    "summary = (\n",
                    "    df.groupby('region', as_index=False)\n",
                    "      .agg(total_orders=('orders', 'sum'), total_revenue=('revenue', 'sum'))\n",
                    "      .sort_values('total_revenue', ascending=False)\n",
                    ")\n",
                    "print('Revenue summary by region:')\n",
                    "print(summary.to_string(index=False))\n",
                    "print('Top region:', summary.iloc[0]['region'])\n",
                ],
            },
        ],
        "metadata": {},
        "nbformat": 4,
        "nbformat_minor": 5,
    }
    path.write_text(json.dumps(notebook_payload), encoding="utf-8")
    return path


def _resolve_output_report_path(filepath: Path, output_name: Optional[str]) -> Path:
    """Compute output report path for collected execution outputs."""
    if output_name:
        candidate = Path(output_name).expanduser()
        if candidate.is_absolute():
            return candidate
        return filepath.parent / candidate

    # notebook-name.ipynb -> notebook-name.out.json
    # script.py -> script.out.json
    return filepath.with_suffix(".out.json")


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
            # Return an empty runtime name to trigger RuntimeManager's built-in
            # interactive flow that can launch a runtime from an environment.
            return ""

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
