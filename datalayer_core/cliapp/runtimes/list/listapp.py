# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""Runtime listing application for the Datalayer Core CLI."""

import sys

from datalayer_core.cliapp.base import DatalayerCLIBaseApp
from datalayer_core.mixins.runtimes import RuntimesListMixin
from datalayer_core.display.display import display_runtimes


class RuntimesListApp(DatalayerCLIBaseApp, RuntimesListMixin):
    """An application to list the Runtimes."""

    description = """
      An application to list the runtimes.

      datalayer runtimes list
    """

    def start(self) -> None:
        """Start the app."""
        if len(self.extra_args) > 0:  # pragma: no cover
            self.log.warning("Too many arguments were provided for kernel list.")
            self.print_help()
            self.exit(1)

        response = self._list_runtimes()
        if response["success"]:
            display_runtimes(response["runtimes"])
        else:
            self.log.warning("The runtimes could not be listed!")
            sys.exit(1)
