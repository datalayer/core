# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""Main CLI application for Datalayer Core."""

from pathlib import Path

from datalayer_core.base.application import NoStart
from datalayer_core.cliapp.benchmarks.benchmarksapp import BenchmarksApp
from datalayer_core.cliapp.base import DatalayerCLIBaseApp
from datalayer_core.cliapp.runtimes.console.consoleapp import RuntimesConsoleApp
from datalayer_core.web.webapp import DatalayerWebApp

HERE = Path(__file__).parent


class DatalayerCLI(DatalayerCLIBaseApp):
    """The main Datalayer CLI application."""

    description = """
      The Datalayer CLI application.
    """

    _requires_auth = False

    subcommands = {
        "benchmarks": (BenchmarksApp, BenchmarksApp.description.splitlines()[0]),
        "console": (RuntimesConsoleApp, RuntimesConsoleApp.description.splitlines()[0]),
        "web": (DatalayerWebApp, DatalayerWebApp.description.splitlines()[0]),
    }

    def start(self) -> None:
        """Start the CLI application."""
        try:
            super().start()
            self.log.info(
                f"One of `{'` `'.join(DatalayerCLI.subcommands.keys())}` must be specified."
            )
            self.exit(1)
        except NoStart:
            pass
        self.exit(0)


# -----------------------------------------------------------------------------
# Main entry point
# -----------------------------------------------------------------------------


main = launch_new_instance = DatalayerCLI.launch_instance


if __name__ == "__main__":
    main()
