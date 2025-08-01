# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""Login application for Datalayer Core authentication."""

import warnings

from datalayer_core.cli.base import DatalayerCLIBaseApp


class DatalayerLoginApp(DatalayerCLIBaseApp):
    """An application to log into a Runtime provider."""

    description = """
      An application to log into a Runtime provider.

      datalayer login
    """

    def start(self) -> None:
        """Start the app."""
        if len(self.extra_args) > 0:  # pragma: no cover
            warnings.warn("Too many arguments were provided for login.")
            self.print_help()
            self.exit(1)

        if self.token and self.user_handle:
            self.log.info(
                f"🎉 Successfully authenticated as {self.user_handle} on {self.run_url}"
            )
            print()
