# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""Datalayer logout application."""

from datalayer_core.cliapp.base import DatalayerCLIBaseApp


class DatalayerLogoutApp(DatalayerCLIBaseApp):
    """An application to logout of a remote kernel provider."""

    description = """
      An application to logout of a remote kernel provider.

      jupyter kernels logout
    """

    _requires_auth = False

    def start(self) -> None:
        """Start the app."""
        if len(self.extra_args) > 0:  # pragma: no cover
            self.log.warn("Too many arguments were provided for logout.")
            self.print_help()
            self.exit(1)

        self._log_out()
