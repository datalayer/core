# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

from datalayer_core.application import NoStart

from datalayer_core.cli.base import DatalayerCLIBaseApp


class RuntimesStartApp(DatalayerCLIBaseApp):
    """Runtime Start application."""

    description = """
      An application to start a Runtime.
    """

    def start(self):
        try:
            super().start()
            self.log.info("Runtime Start - not implemented.")
        except NoStart:
            pass
        self.exit(0)
