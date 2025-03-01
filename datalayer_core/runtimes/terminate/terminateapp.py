# Copyright (c) 2023-2024 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

# Copyright (c) Datalayer Development Team.
# Distributed under the terms of the Modified BSD License.

import warnings

from datalayer_core.cli.base import DatalayerCLIBaseApp


class RuntimesTerminateApp(DatalayerCLIBaseApp):
    """Runtime Terminate application."""

    description = """
      An application to terminate a Runtime.

      jupyter kernels terminate RUNTIME_ID
    """

    def start(self):
        """Start the app."""
        if len(self.extra_args) > 1:  # pragma: no cover
            warnings.warn("Too many arguments were provided for Runtime terminate.")
            self.print_help()
            self.exit(1)

        kernel_id = self.extra_args[0]

        self._fetch(
            "{}/api/jupyter/v1/kernels/{}".format(self.run_url, kernel_id),
            method="DELETE",
        )
        self.log.info(f"Runtime '{kernel_id}' deleted.")
