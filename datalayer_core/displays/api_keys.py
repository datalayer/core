# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""Display functions for Datalayer core."""

from __future__ import annotations

from rich.console import Console
from rich.table import Table


def _new_api_keys_table(title: str = "API Keys") -> Table:
    """
    Create a new API keys table.

    Parameters
    ----------
    title : str, default "API Keys"
        The title for the table.

    Returns
    -------
    Table
        A rich Table configured for displaying API keys.
    """
    table = Table(title=title)
    table.add_column("ID", style="cyan", no_wrap=True)
    table.add_column("Name", style="cyan", no_wrap=True)
    table.add_column("Variant", style="cyan", no_wrap=True)
    return table


def _add_api_key_to_table(table: Table, api_key: dict[str, str]) -> None:
    """
    Add an API key row to the table.

    Parameters
    ----------
    table : Table
        The rich Table to add the row to.
    api_key : dict[str, str]
        Dictionary containing API key information with keys: uid, name_s, description_t, variant_s.
    """
    table.add_row(
        api_key["uid"],
        api_key["name_s"],
        api_key["variant_s"],
    )


def display_api_keys(api_keys: list[dict[str, str]]) -> None:
    """
    Display a list of API keys in the console.

    Parameters
    ----------
    api_keys : list[dict[str, str]]
        List of API key dictionaries to display.
    """
    table = _new_api_keys_table(title="API Keys")
    for api_key in api_keys:
        _add_api_key_to_table(table, api_key)
    console = Console()
    console.print(table)
