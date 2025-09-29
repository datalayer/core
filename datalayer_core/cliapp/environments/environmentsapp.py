# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""
The Datalayer environments management application.
"""

from datalayer_core.application import NoStart
from datalayer_core.cliapp.base import DatalayerCLIBaseApp
from datalayer_core.cliapp.environments.list.listapp import EnvironmentsListApp


class EnvironmentsApp(DatalayerCLIBaseApp):
    """The Datalayer environments management application."""

    description = """
      The Datalayer CLI application.
    """

    _requires_auth = False

    subcommands = {
        "list": (EnvironmentsListApp, EnvironmentsListApp.description.splitlines()[0]),
        "ls": (EnvironmentsListApp, EnvironmentsListApp.description.splitlines()[0]),
    }

    def start(self) -> None:
        """Start the app."""
        try:
            super().start()
            self.log.info(
                f"One of `{'` `'.join(EnvironmentsApp.subcommands.keys())}` must be specified."
            )
            self.exit(1)
        except NoStart:
            pass
        self.exit(0)
