# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

import base64

from rich.console import Console
from rich.table import Table


def _new_secrets_table(title="Secrets"):
    table = Table(title=title)
    table.add_column("ID", style="cyan", no_wrap=True)
    table.add_column("Name", style="cyan", no_wrap=True)
    table.add_column("Description", style="cyan", no_wrap=True)
    table.add_column("Variant", style="cyan", no_wrap=True)
    return table


def _add_secret_to_table(table, secret):
    table.add_row(
        secret["uid"],
        secret["name_s"],
        secret["description_t"],
        secret["variant_s"],
    )


def display_secrets(secrets: list) -> None:
    """Display a list of secrets in the console."""
    table = _new_secrets_table(title="Secrets")
    for secret in secrets:
        _add_secret_to_table(table, secret)
    console = Console()
    console.print(table)


def btoa(value: str) -> str:
    """
    Encode a string to base64.

    Parameters
    ----------
    value: str
        The string to encode.

    Returns
    -------
        str: Base64 encoded ascii string.
    """
    return base64.b64encode(value.encode("utf-8")).decode("ascii")
