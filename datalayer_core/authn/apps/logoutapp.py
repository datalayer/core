# Copyright (c) Datalayer Development Team.
# Distributed under the terms of the Modified BSD License.

import warnings

from datalayer_core.cli.base import DatalayerCLIBaseApp


class DatalayerLogoutApp(DatalayerCLIBaseApp):
    """An application to logout of a remote kernel provider."""

    description = """
      An application to logout of a remote kernel provider.

      jupyter kernels logout
    """

    _requires_auth = False


    def start(self):
        """Start the app."""
        if len(self.extra_args) > 0:  # pragma: no cover
            warnings.warn("Too many arguments were provided for logout.")
            self.print_help()
            self.exit(1)
        """
        FIXME
        self._fetch(
            "{}/api/iam/v1/logout".format(self.run_url),
        )
        """

        self._log_out()
