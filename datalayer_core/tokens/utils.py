# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""Utility functions for token management and display."""

from rich.console import Console
from rich.table import Table


def _new_tokens_table(title: str = "Tokens") -> Table:
    """
    Create a new tokens table.

    Parameters
    ----------
    title : str, default "tokens"
        The title for the table.

    Returns
    -------
    Table
        A rich Table configured for displaying tokens.
    """
    table = Table(title=title)
    table.add_column("ID", style="cyan", no_wrap=True)
    table.add_column("Name", style="cyan", no_wrap=True)
    table.add_column("Variant", style="cyan", no_wrap=True)
    return table


def _add_token_to_table(table: Table, token: dict[str, str]) -> None:
    """
    Add a token row to the table.

    Parameters
    ----------
    table : Table
        The rich Table to add the row to.
    token : dict[str, str]
        Dictionary containing token information with keys: uid, name_s, description_t, variant_s.
    """
    table.add_row(
        token["uid"],
        token["name_s"],
        token["variant_s"],
    )


def display_tokens(tokens: list[dict[str, str]]) -> None:
    """
    Display a list of tokens in the console.

    Parameters
    ----------
    tokens : list[dict[str, str]]
        List of token dictionaries to display.
    """
    table = _new_tokens_table(title="Tokens")
    for token in tokens:
        _add_token_to_table(table, token)
    console = Console()
    console.print(table)
