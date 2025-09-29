# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""Display functions for Datalayer core."""

from __future__ import annotations

from rich.console import Console
from rich.table import Table


def _new_secrets_table(title: str = "Secrets") -> Table:
    """
    Create a new secrets table.

    Parameters
    ----------
    title : str, default "Secrets"
        The title for the table.

    Returns
    -------
    Table
        A rich Table configured for displaying secrets.
    """
    table = Table(title=title)
    table.add_column("ID", style="cyan", no_wrap=True)
    table.add_column("Name", style="cyan", no_wrap=True)
    table.add_column("Description", style="cyan", no_wrap=True)
    table.add_column("Variant", style="cyan", no_wrap=True)
    return table


def _add_secret_to_table(table: Table, secret: dict[str, str]) -> None:
    """
    Add a secret row to the table.

    Parameters
    ----------
    table : Table
        The rich Table to add the row to.
    secret : dict[str, str]
        Dictionary containing secret information with keys: uid, name_s, description_t, variant_s.
    """
    table.add_row(
        secret["uid"],
        secret["name_s"],
        secret["description_t"],
        secret["variant_s"],
    )


def display_secrets(secrets: list[dict[str, str]]) -> None:
    """
    Display a list of secrets in the console.

    Parameters
    ----------
    secrets : list[dict[str, str]]
        List of secret dictionaries to display.
    """
    table = _new_secrets_table(title="Secrets")
    for secret in secrets:
        _add_secret_to_table(table, secret)
    console = Console()
    console.print(table)
