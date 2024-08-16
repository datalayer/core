# Copyright (c) Datalayer Development Team.
# Distributed under the terms of the Modified BSD License.

import warnings

from datalayer_core.cli.base import DatalayerCLIBaseApp


class DatalayerLoginApp(DatalayerCLIBaseApp):
    """An application to log into a remote kernel provider."""

    description = """
      An application to log into a remote kernel provider.

      jupyter kernels login
    """

    def start(self):
        """Start the app."""
        if len(self.extra_args) > 0:  # pragma: no cover
            warnings.warn("Too many arguments were provided for login.")
            self.print_help()
            self.exit(1)

        if self.token and self.user_handle:
            self.log.info(f"🎉 Successfully authenticated as {self.user_handle} on {self.run_url}")
            print()
