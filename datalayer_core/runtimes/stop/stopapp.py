# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

from datalayer_core.application import NoStart

from datalayer_core.cli.base import DatalayerCLIBaseApp


class RuntimesStopApp(DatalayerCLIBaseApp):
    """Runtime Stop application."""

    description = """
      An application to stop a Runtime.
    """

    def start(self):
        try:
            super().start()
            self.log.info("Runtime Stop - not implemented.")
        except NoStart:
            pass
        self.exit(0)
