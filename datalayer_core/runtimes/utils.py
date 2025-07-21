# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

from datetime import datetime, timezone
from typing import Any

from rich.console import Console
from rich.table import Table


def _timestamp_to_local_date(timestamp: str) -> str:
    return (
        datetime.fromtimestamp(float(timestamp), timezone.utc).astimezone().isoformat()
    )


def _new_runtime_table(title: str = "Runtimes") -> Table:
    table = Table(title=title)
    table.add_column("ID", style="cyan", no_wrap=True)
    table.add_column("Name", style="cyan", no_wrap=True)
    table.add_column("Environment", style="cyan", no_wrap=True)
    table.add_column("Expired At", style="cyan", no_wrap=True)
    return table


def _add_runtime_to_table(table: Table, kernel: dict[str, Any]) -> None:
    expired_at = kernel.get("expired_at")
    table.add_row(
        kernel["pod_name"],
        kernel["given_name"],
        kernel["environment_name"],
        "Never" if expired_at is None else _timestamp_to_local_date(expired_at),
    )


def display_runtimes(runtimes: list[dict[str, Any]]) -> None:
    """Display a list of Runtimes in the console."""
    table = _new_runtime_table(title="Runtimes")
    for runtime in runtimes:
        _add_runtime_to_table(table, runtime)
    console = Console()
    console.print(table)


def get_default_credits_limit(
    reservations: list[dict[str, Any]], credits: dict[str, Any]
) -> float:
    """Get the default credits limit based on the available credits and reservations."""
    available = (
        credits["credits"]
        if credits.get("quota") is None
        else credits["quota"] - credits["credits"]
    )
    available -= sum(r["credits"] for r in reservations)
    return max(0.0, available * 0.5)
