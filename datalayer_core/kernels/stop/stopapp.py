# Copyright (c) Datalayer Development Team.
# Distributed under the terms of the Modified BSD License.

from datalayer_core.application import NoStart

from datalayer_core.cli.base import DatalayerCLIBaseApp


class KernelsStopApp(DatalayerCLIBaseApp):
    """Kernel Stop application."""

    description = """
      An application to stop a Kernel.
    """

    def start(self):
        try:
            super().start()
            self.log.info(f"Kernel Stop - not implemented.")
        except NoStart:
            pass
        self.exit(0)
