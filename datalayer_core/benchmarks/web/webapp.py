# Copyright (c) Datalayer Development Team.
# Distributed under the terms of the Modified BSD License.

import sys

from datalayer_core.cli.base import DatalayerCLIBaseApp
from datalayer_core.serverapplication import launch_new_instance


class BenchmarksWebApp(DatalayerCLIBaseApp):
    """An application to show the benchmarks webapp."""

    description = """
      An application to show the benchmarks webapp.
    """

    _requires_auth = False

    def start(self):
        """Start the app."""
        if len(self.extra_args) > 1:  # pragma: no cover
            self.log.warning("Too many arguments were provided for kernel create.")
            self.print_help()
            self.exit(1)
        self.clear_instance()
        sys.argv = [
            '',
            '--ServerApp.disable_check_xsrf=True',
            '--DatalayerExtensionApp.benchmarks=True',
            f'--DatalayerExtensionApp.run_url={self.run_url}',
        ]
        launch_new_instance()
