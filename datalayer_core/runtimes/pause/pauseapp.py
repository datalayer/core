# Copyright (c) 2023-2024 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

# Copyright (c) Datalayer Development Team.
# Distributed under the terms of the Modified BSD License.

from datalayer_core.application import NoStart

from datalayer_core.cli.base import DatalayerCLIBaseApp


class RuntimesPauseApp(DatalayerCLIBaseApp):
    """Runtime Pause application."""

    description = """
      An application to stop a Runtime.
    """

    def start(self):
        try:
            super().start()
            self.log.info(f"Runtime Pause - not implemented.")
        except NoStart:
            pass
        self.exit(0)
