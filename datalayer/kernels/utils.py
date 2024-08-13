# Copyright (c) Datalayer Development Team.
# Distributed under the terms of the Modified BSD License.

from datetime import datetime, timezone

from rich.console import Console
from rich.table import Table


def timestamp_to_local_date(timestamp: str) -> str:
    return (
        datetime.fromtimestamp(float(timestamp), timezone.utc).astimezone().isoformat()
    )


def new_kernel_table(title="Jupyter Kernel"):
    table = Table(title=title)
    table.add_column("Kernel ID", style="magenta", no_wrap=True)
    table.add_column("Kernel Name", style="cyan", no_wrap=True)
    table.add_column("Environment", style="green", no_wrap=True)
    table.add_column("Expired At", style="red", no_wrap=True)
    return table


def add_kernel_to_table(table, kernel):
    expired_at = kernel.get("expired_at")
    table.add_row(
        kernel["jupyter_pod_name"],
        kernel["kernel_given_name"],
        kernel["environment_name"],
        "Never" if expired_at is None else timestamp_to_local_date(expired_at),
    )


def display_kernels(kernels: list) -> None:
    """Display a list of kernels in the console."""
    table = new_kernel_table(title="Jupyter Kernels")
    for kernel in kernels:
        add_kernel_to_table(table, kernel)
    console = Console()
    console.print(table)


def display_me(me: dict) -> None:
    """Display a my profile."""
    table = Table(title="Profile")
    table.add_column("ID", style="magenta", no_wrap=True)
    table.add_column("Handle", style="cyan", no_wrap=True)
    table.add_column("First name", style="green", no_wrap=True)
    table.add_column("Last name", style="green", no_wrap=True)
    table.add_row(
        me["uid"],
        me["handle_s"],
        me["first_name_t"],
        me["last_name_t"],
    )
    console = Console()
    console.print(table)
