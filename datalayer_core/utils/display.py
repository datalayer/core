# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""Utility functions for Datalayer core."""

from __future__ import annotations

import json

from typing import Any
from datetime import datetime, timezone

from rich.console import Console
from rich.table import Table


def display_me(me: dict[str, str], infos: dict[str, str]) -> None:
    """
    Display a my profile.

    Parameters
    ----------
    me : dict[str, str]
        The user's profile information.
    infos : dict[str, str]
        Additional information about the user.
    """
    table = Table(title="Profile")
    table.add_column("ID", style="magenta", no_wrap=True)
    table.add_column("Handle", style="cyan", no_wrap=True)
    table.add_column("First name", style="green", no_wrap=True)
    table.add_column("Last name", style="green", no_wrap=True)
    table.add_column("RUN URL", style="green", no_wrap=True)
    table.add_row(
        me["uid"],
        me["handle_s"],
        me["first_name_t"],
        me["last_name_t"],
        infos.get("run_url"),
    )
    console = Console()
    console.print(table)


def _timestamp_to_local_date(timestamp: str) -> str:
    """
    Convert a timestamp to local date format.

    Parameters
    ----------
    timestamp : str
        Timestamp string to convert.

    Returns
    -------
    str
        Local date in ISO format.
    """
    return (
        datetime.fromtimestamp(float(timestamp), timezone.utc).astimezone().isoformat()
    )


def _new_runtime_table(title: str = "Runtimes") -> Table:
    """
    Create a new table for displaying runtimes.

    Parameters
    ----------
    title : str
        Title for the table.

    Returns
    -------
    Table
        A configured Rich Table object for runtimes.
    """
    table = Table(title=title)
    table.add_column("ID", style="cyan", no_wrap=True)
    table.add_column("Name", style="cyan", no_wrap=True)
    table.add_column("Environment", style="cyan", no_wrap=True)
    table.add_column("Expired At", style="cyan", no_wrap=True)
    return table


def _add_runtime_to_table(table: Table, kernel: dict[str, Any]) -> None:
    """
    Add a runtime row to the display table.

    Parameters
    ----------
    table : Table
        Rich Table object to add the row to.
    kernel : dict[str, Any]
        Runtime/kernel data dictionary to add as a row.
    """
    expired_at = kernel.get("expired_at")
    table.add_row(
        kernel["pod_name"],
        kernel["given_name"],
        kernel["environment_name"],
        "Never" if expired_at is None else _timestamp_to_local_date(expired_at),
    )


def display_runtimes(runtimes: list[dict[str, Any]]) -> None:
    """
    Display a list of Runtimes in the console.

    Parameters
    ----------
    runtimes : list[dict[str, Any]]
        List of runtime dictionaries to display.
    """
    table = _new_runtime_table(title="Runtimes")
    for runtime in runtimes:
        _add_runtime_to_table(table, runtime)
    console = Console()
    console.print(table)


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


def display_environments(environments: list[dict[str, Any]]) -> None:
    """
    Display a list of environments in the console.

    Parameters
    ----------
    environments : list[dict[str, Any]]
        List of environment dictionaries to display.
    """
    table = _new_env_table()
    for environment in environments:
        _add_env_to_table(table, environment)
    console = Console()
    console.print(table)


def _new_env_table() -> Table:
    """
    Create a new table for displaying environments.

    Returns
    -------
    Table
        A configured Rich Table object for environments.
    """
    table = Table(title="Environments")
    table.add_column("ID", style="magenta", no_wrap=True)
    table.add_column("Cost per seconds", justify="right", style="red", no_wrap=True)
    table.add_column("Name", style="green", no_wrap=True)
    table.add_column("Description", style="green", no_wrap=True)
    table.add_column("Language", style="green", no_wrap=True)
    table.add_column("Resources", justify="right", style="green", no_wrap=True)
    return table


def _add_env_to_table(table: Table, environment: dict[str, Any]) -> None:
    """
    Add an environment row to the display table.

    Parameters
    ----------
    table : Table
        Rich Table object to add the row to.
    environment : dict[str, Any]
        Environment data dictionary to add as a row.
    """
    desc = environment["description"]
    table.add_row(
        environment["name"],
        "{:.3g}".format(environment["burning_rate"]),
        environment["title"],
        desc if len(desc) <= 50 else desc[:50] + "…",
        environment["language"],
        json.dumps(environment["resources"]),
    )
