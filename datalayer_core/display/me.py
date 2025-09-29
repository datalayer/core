# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""Display functions for Datalayer core."""

from __future__ import annotations

import json

from typing import Any

from rich.console import Console
from rich.table import Table

from datalayer_core.utils.date import timestamp_to_local_date


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
