# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""Utility functions for snapshot management and display."""

from typing import Any

from rich.console import Console
from rich.table import Table


def _new_snapshots_table(title: str = "Snapshots") -> Table:
    """
    Create a new snapshots table.

    Parameters
    ----------
    title : str, default "Snapshots"
        The title for the table.

    Returns
    -------
    Table
        A rich Table configured for displaying snapshots.
    """
    table = Table(title=title)
    table.add_column("ID", style="cyan", no_wrap=True)
    table.add_column("Name", style="cyan", no_wrap=True)
    table.add_column("Description", style="cyan", no_wrap=True)
    table.add_column("Environment", style="cyan", no_wrap=True)
    return table


def _add_snapshot_to_table(table: Table, snapshot: dict[str, Any]) -> None:
    """
    Add a snapshot row to the table.

    Parameters
    ----------
    table : Table
        The rich Table to add the row to.
    snapshot : dict[str, Any]
        Dictionary containing snapshot information with keys: uid, name, description, environment.
    """
    table.add_row(
        snapshot["uid"],
        snapshot["name"],
        snapshot["description"],
        snapshot["environment"],
    )


def display_snapshots(snapshots: list[dict[str, Any]]) -> None:
    """
    Display a list of snapshots in the console.

    Parameters
    ----------
    snapshots : list[dict[str, Any]]
        List of snapshot dictionaries to display.
    """
    table = _new_snapshots_table(title="Snapshots")
    for snapshot in snapshots:
        _add_snapshot_to_table(table, snapshot)
    console = Console()
    console.print(table)
