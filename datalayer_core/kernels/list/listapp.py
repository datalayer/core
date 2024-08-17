# Copyright (c) Datalayer Development Team.
# Distributed under the terms of the Modified BSD License.

import warnings

from datalayer_core.cli.base import DatalayerCLIBaseApp
from datalayer_core.kernels.utils import display_kernels


class KernelsListApp(DatalayerCLIBaseApp):
    """An application to list the kernels."""

    description = """
      An application to list the kernels.

      jupyter kernels list
    """

    def start(self):
        """Start the app."""
        if len(self.extra_args) > 0:  # pragma: no cover
            warnings.warn("Too many arguments were provided for kernel list.")
            self.print_help()
            self.exit(1)

        response = self._fetch(
            "{}/api/jupyter/v1/kernels".format(self.run_url),
        )
        raw = response.json()
        display_kernels(raw.get("kernels", []))
