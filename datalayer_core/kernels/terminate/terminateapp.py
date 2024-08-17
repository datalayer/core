# Copyright (c) Datalayer Development Team.
# Distributed under the terms of the Modified BSD License.

import warnings

from datalayer_core.cli.base import DatalayerCLIBaseApp


class KernelsTerminateApp(DatalayerCLIBaseApp):
    """Kernel Terminate application."""

    description = """
      An application to terminate a Kernel.

      jupyter kernels terminate SERVER_NAME
    """

    def start(self):
        """Start the app."""
        if len(self.extra_args) > 1:  # pragma: no cover
            warnings.warn("Too many arguments were provided for kernel list.")
            self.print_help()
            self.exit(1)

        kernel_id = self.extra_args[0]

        self._fetch(
            "{}/api/jupyter/v1/kernel/{}".format(self.run_url, kernel_id),
            method="DELETE",
        )
        self.log.info(f"Kernel '{kernel_id}' deleted.")
