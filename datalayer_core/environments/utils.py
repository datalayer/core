# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

import json
from typing import Any

from rich.console import Console
from rich.table import Table


def display_environments(environments: list[dict[str, Any]]) -> None:
    """Display a list of environments in the console."""
    table = _new_env_table()
    for environment in environments:
        _add_env_to_table(table, environment)
    console = Console()
    console.print(table)


def _new_env_table() -> Table:
    table = Table(title="Environments")
    table.add_column("ID", style="magenta", no_wrap=True)
    table.add_column("Cost per seconds", justify="right", style="red", no_wrap=True)
    table.add_column("Name", style="green", no_wrap=True)
    table.add_column("Description", style="green", no_wrap=True)
    table.add_column("Language", style="green", no_wrap=True)
    table.add_column("Resources", justify="right", style="green", no_wrap=True)
    return table


def _add_env_to_table(table: Table, environment: dict[str, Any]) -> None:
    desc = environment["description"]
    table.add_row(
        environment["name"],
        "{:.3g}".format(environment["burning_rate"]),
        environment["title"],
        desc if len(desc) <= 50 else desc[:50] + "…",
        environment["language"],
        json.dumps(environment["resources"]),
    )
