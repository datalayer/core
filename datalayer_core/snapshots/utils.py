# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

from rich.console import Console
from rich.table import Table


def _new_snapshots_table(title="Snapshots"):
    table = Table(title=title)
    table.add_column("ID", style="cyan", no_wrap=True)
    table.add_column("Name", style="cyan", no_wrap=True)
    table.add_column("Description", style="cyan", no_wrap=True)
    table.add_column("Environment", style="cyan", no_wrap=True)
    return table


def _add_snapshot_to_table(table, snapshot):
    table.add_row(
        snapshot["uid"],
        snapshot["name"],
        snapshot["description"],
        snapshot["environment"],
    )


def display_snapshots(snapshots: list) -> None:
    """Display a list of snapshots in the console."""
    table = _new_snapshots_table(title="Snapshots")
    for snapshot in snapshots:
        _add_snapshot_to_table(table, snapshot)
    console = Console()
    console.print(table)
