# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

import json
import warnings

from rich.console import Console
from rich.table import Table

from datalayer_core.cli.base import DatalayerCLIBaseApp


def new_env_table():
    table = Table(title="Environments")
    table.add_column("ID", style="magenta", no_wrap=True)
    table.add_column("Cost per seconds", justify="right", style="red", no_wrap=True)
    table.add_column("Name", style="green", no_wrap=True)
    table.add_column("Description", style="green", no_wrap=True)
    table.add_column("Language", style="green", no_wrap=True)
    table.add_column("Resources", justify="right", style="green", no_wrap=True)
    return table


def add_env_to_table(table, environment):
    desc = environment["description"]
    table.add_row(
        environment["name"],
        "{:.3g}".format(environment["burning_rate"]),
        environment["title"],
        desc if len(desc) <= 50 else desc[:50] + "…",
        environment["language"],
        json.dumps(environment["resources"]),
    )


class EnvironmentsListMixin:

    def _list_environments(self):
        """List available environments."""
        response = self._fetch(
            "{}/api/runtimes/v1/environments".format(self.run_url),
        )
        content = response.json()
        return content.get("environments", [])


class EnvironmentsListApp(DatalayerCLIBaseApp, EnvironmentsListMixin):
    """A Kernel application."""

    description = """
      The Datalayer application for Environment.

      jupyter kernels environments
    """

    def start(self):
        if len(self.extra_args) > 0:  # pragma: no cover
            warnings.warn("Too many arguments were provided for kernel create.")
            self.print_help()
            self.exit(1)

        environments = self._list_environments()
        table = new_env_table()
        for environment in environments:
            add_env_to_table(table, environment)
        console = Console()
        console.print(table)
        if (len(environments) > 0):
            print(f"""
Create a Runtime with e.g.
    """)
        for environment in environments:
            print(f"datalayer runtimes create --given-name my-runtime --credits-limit 3 {environment['name']}")
        print()
