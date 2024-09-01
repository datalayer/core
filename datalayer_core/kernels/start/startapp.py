# Copyright (c) Datalayer Development Team.
# Distributed under the terms of the Modified BSD License.

from datalayer_core.application import NoStart

from datalayer_core.cli.base import DatalayerCLIBaseApp


class KernelsStartApp(DatalayerCLIBaseApp):
    """Kernel Start application."""

    description = """
      An application to start a Kernel.
    """

    def start(self):
        try:
            super().start()
            self.log.info(f"Kernel Start - not implemented.")
        except NoStart:
            pass
        self.exit(0)
