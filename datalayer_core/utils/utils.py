# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""Utility functions for Datalayer core."""

from __future__ import annotations

import socket
import typing as t

import requests

from datetime import datetime, timezone
from typing import Any

from rich.console import Console
from rich.table import Table


def fetch(
    request: str,
    token: str | None = None,
    external_token: str | None = None,
    **kwargs: t.Any,
) -> requests.Response:
    """
    Fetch a network resource as a context manager.

    Parameters
    ----------
    request : str
        The URL to fetch.
    token : str or None, default None
        Bearer token for authentication.
    external_token : str or None, default None
        External token for authentication.
    **kwargs : Any
        Additional keyword arguments passed to requests.

    Returns
    -------
    requests.Response
        The HTTP response object.
    """
    method = kwargs.pop("method", "GET")
    f = getattr(requests, method.lower())
    headers = kwargs.pop("headers", {})
    if len(headers) == 0:
        headers = {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "User-Agent": "Jupyter kernels CLI",
        }
    if token:
        headers["Authorization"] = f"Bearer {token}"
    if external_token:
        headers["X-External-Token"] = external_token
    if "timeout" not in kwargs:
        kwargs["timeout"] = 60
    response = f(request, headers=headers, **kwargs)
    response.raise_for_status()
    return response


def find_http_port() -> int:
    """
    Find an available http port.

    Returns
    -------
    int
        An available port number.
    """
    # Xref https://stackoverflow.com/questions/1365265/on-localhost-how-do-i-pick-a-free-port-number
    sock = socket.socket()
    sock.bind(("", 0))
    return sock.getsockname()[1]


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


def get_default_credits_limit(
    reservations: list[dict[str, Any]], credits: dict[str, Any]
) -> float:
    """
    Get the default credits limit based on the available credits and reservations.

    Parameters
    ----------
    reservations : list[dict[str, Any]]
        List of current reservations.
    credits : dict[str, Any]
        Current credits information.

    Returns
    -------
    float
        The calculated default credits limit.
    """
    available = (
        credits["credits"]
        if credits.get("quota") is None
        else credits["quota"] - credits["credits"]
    )
    available -= sum(r["credits"] for r in reservations)
    return max(0.0, available * 0.5)
