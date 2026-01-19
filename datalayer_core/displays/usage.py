# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""Display functions for usage/credits."""

from __future__ import annotations

from typing import Any

from rich.console import Console
from rich.table import Table


def _new_summary_table() -> Table:
    table = Table(title="Credits Summary")
    table.add_column("Metric", style="cyan", no_wrap=True)
    table.add_column("Value", style="cyan")
    return table


def _new_reservations_table() -> Table:
    table = Table(title="Reservations")
    table.add_column("Resource", style="cyan")
    table.add_column("Credits", style="cyan", justify="right")
    table.add_column("State", style="cyan")
    table.add_column("Created", style="cyan")
    return table


def display_usage(usage: dict[str, Any]) -> None:
    """Display usage credits and reservations."""
    console = Console()

    credits = usage.get("credits", {}) or {}
    reservations = usage.get("reservations", []) or []

    credits_value = credits.get("credits", 0.0)
    quota = credits.get("quota")
    used = credits.get("used", credits.get("credits_used"))

    if quota is None:
        available_before_reservations = credits_value
        used_value = used
    else:
        used_value = credits_value
        available_before_reservations = quota - credits_value

    reserved_total = sum(r.get("credits", 0.0) for r in reservations)
    available_after_reservations = available_before_reservations - reserved_total

    summary = _new_summary_table()
    summary.add_row("Used", "N/A" if used_value is None else f"{used_value}")
    summary.add_row("Quota", "Unlimited" if quota is None else f"{quota}")
    summary.add_row("Available (before reservations)", f"{available_before_reservations}")
    summary.add_row("Reserved", f"{reserved_total}")
    summary.add_row("Available (after reservations)", f"{available_after_reservations}")

    console.print(summary)

    reservations_table = _new_reservations_table()
    for reservation in reservations:
        resource = (
            reservation.get("resource_given_name")
            or reservation.get("resource_type")
            or reservation.get("resource")
            or reservation.get("name")
            or reservation.get("uid")
            or reservation.get("id")
            or "-"
        )
        reservations_table.add_row(
            str(resource),
            str(reservation.get("credits", "-")),
            str(reservation.get("resource_state", "-")),
            str(reservation.get("created_at") or reservation.get("created_ts") or "-"),
        )

    console.print(reservations_table)

    if available_after_reservations < 0:
        console.print(
            f"[yellow]Warning: reservations exceed available credits by {-available_after_reservations}.[/yellow]"
        )
