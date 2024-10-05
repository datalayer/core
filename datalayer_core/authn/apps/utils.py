# Copyright (c) Datalayer Development Team.
# Distributed under the terms of the Modified BSD License.

from rich.console import Console
from rich.table import Table

def display_me(me: dict, infos: dict) -> None:
    """Display a my profile."""
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
        infos.get("run_url")
    )
    console = Console()
    console.print(table)
