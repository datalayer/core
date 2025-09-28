# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""Benchmarks application for Datalayer Core."""

from datalayer_core.application import NoStart
from datalayer_core.cli0.benchmarks.web.webapp import BenchmarksWebApp
from datalayer_core.cli0.base import DatalayerCLIBaseApp


class BenchmarksApp(DatalayerCLIBaseApp):
    """An application to run benchmarks."""

    description = """
      An application to run benchmarks.
    """

    _requires_auth = False

    subcommands = {
        "web": (BenchmarksWebApp, BenchmarksWebApp.description.splitlines()[0]),
    }

    def start(self) -> None:
        """Start the benchmarks application."""
        try:
            super().start()
            self.log.info(
                f"One of `{'` `'.join(BenchmarksApp.subcommands.keys())}` must be specified."
            )
            self.exit(1)
        except NoStart:
            pass
        self.exit(0)
