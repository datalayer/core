# Copyright (c) Datalayer Development Team.
# Distributed under the terms of the Modified BSD License.

import json
import warnings

from rich.console import Console
from rich.table import Table

from datalayer_core.cli.base import DatalayerCLIBaseApp


def new_kernel_table():
    table = Table(title="Jupyter Environments")
    table.add_column("ID", style="magenta", no_wrap=True)
    table.add_column("Cost per seconds", justify="right", style="red", no_wrap=True)
    table.add_column("Name", style="green", no_wrap=True)
    table.add_column("Description", style="green", no_wrap=True)
    table.add_column("Language", style="green", no_wrap=True)
    table.add_column("Resources", justify="right", style="green", no_wrap=True)
    return table


def add_kernel_to_table(table, environment):
    desc = environment["description"]
    table.add_row(
        environment["name"],
        "{:.3g}".format(environment["burning_rate"]),
        environment["title"],
        desc if len(desc) <= 50 else desc[:50] + "…",
        environment["language"],
        json.dumps(environment["resources"]),
    )


class KernelEnvironmentsListApp(DatalayerCLIBaseApp):
    """A Kernel application."""

    description = """
      The Jupyter Kernels application for Kernels.

      jupyter kernels environments
    """

    def start(self):
        if len(self.extra_args) > 0:  # pragma: no cover
            warnings.warn("Too many arguments were provided for kernel create.")
            self.print_help()
            self.exit(1)

        response = self._fetch(
            "{}/api/jupyter/v1/environments".format(self.kernels_url),
        )
        content = response.json()
        table = new_kernel_table()
        for environment in content.get("environments", []):
            add_kernel_to_table(table, environment)
        console = Console()
        console.print(table)
