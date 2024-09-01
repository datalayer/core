# Copyright (c) Datalayer Development Team.
# Distributed under the terms of the Modified BSD License.

from datetime import datetime, timezone

from rich.console import Console
from rich.table import Table


def _timestamp_to_local_date(timestamp: str) -> str:
    return (
        datetime.fromtimestamp(float(timestamp), timezone.utc).astimezone().isoformat()
    )


def _new_kernel_table(title="Jupyter Kernel"):
    table = Table(title=title)
    table.add_column("Kernel ID", style="magenta", no_wrap=True)
    table.add_column("Kernel Name", style="cyan", no_wrap=True)
    table.add_column("Environment", style="green", no_wrap=True)
    table.add_column("Expired At", style="red", no_wrap=True)
    return table


def _add_kernel_to_table(table, kernel):
    expired_at = kernel.get("expired_at")
    table.add_row(
        kernel["jupyter_pod_name"],
        kernel["kernel_given_name"],
        kernel["environment_name"],
        "Never" if expired_at is None else _timestamp_to_local_date(expired_at),
    )


def display_kernels(kernels: list) -> None:
    """Display a list of kernels in the console."""
    table = _new_kernel_table(title="Jupyter Kernels")
    for kernel in kernels:
        _add_kernel_to_table(table, kernel)
    console = Console()
    console.print(table)
