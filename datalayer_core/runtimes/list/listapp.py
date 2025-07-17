# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

import warnings

from datalayer_core.cli.base import DatalayerCLIBaseApp
from datalayer_core.runtimes.utils import display_kernels


class RuntimesListMixin:

    def _list_runtimes(self):
        """List all available runtimes."""
        response = self._fetch(
            "{}/api/jupyter/v1/kernels".format(self.run_url),
        )
        return response.json()


class RuntimesListApp(DatalayerCLIBaseApp, RuntimesListMixin):
    """An application to list the Runtimes."""

    description = """
      An application to list the runtimes.

      datalayer runtimes list
    """

    def start(self):
        """Start the app."""
        if len(self.extra_args) > 0:  # pragma: no cover
            warnings.warn("Too many arguments were provided for kernel list.")
            self.print_help()
            self.exit(1)

        display_kernels(self._list_runtimes().get("runtimes", []))
