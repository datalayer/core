# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

from datalayer_core.application import NoStart
from datalayer_core.environments.list.listapp import EnvironmentsListApp
from datalayer_core.cli.base import DatalayerCLIBaseApp


class EnvironmentsApp(DatalayerCLIBaseApp):
    description = """
      The Datalayer CLI application.
    """

    _requires_auth = False

    subcommands = {
        "list": (EnvironmentsListApp, EnvironmentsListApp.description.splitlines()[0]),
        "ls": (EnvironmentsListApp, EnvironmentsListApp.description.splitlines()[0]),
    }

    def start(self):
        try:
            super().start()
            self.log.info(
                f"One of `{'` `'.join(EnvironmentsApp.subcommands.keys())}` must be specified."
            )
            self.exit(1)
        except NoStart:
            pass
        self.exit(0)
