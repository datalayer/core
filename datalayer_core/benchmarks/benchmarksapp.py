# Copyright (c) Datalayer Development Team.
# Distributed under the terms of the Modified BSD License.

from datalayer_core.application import NoStart

from datalayer_core.cli.base import DatalayerCLIBaseApp
from datalayer_core.benchmarks.web.webapp import BenchmarksWebApp

class BenchmarksApp(DatalayerCLIBaseApp):
    """An application to run benchmarks."""

    description = """
      An application to run benchmarks.
    """

    _requires_auth = False

    subcommands = {
        "web": (BenchmarksWebApp, BenchmarksWebApp.description.splitlines()[0]),
    }

    def start(self):
        try:
            super().start()
            self.log.info(f"One of `{'` `'.join(BenchmarksApp.subcommands.keys())}` must be specified.")
            self.exit(1)
        except NoStart:
            pass
        self.exit(0)
