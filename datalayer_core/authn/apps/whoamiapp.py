# Copyright (c) Datalayer Development Team.
# Distributed under the terms of the Modified BSD License.

import warnings

from datalayer_core.cli.base import DatalayerCLIBaseApp
from datalayer_core.authn.apps.utils import display_me


class WhoamiApp(DatalayerCLIBaseApp):
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
            "{}/api/iam/v1/whoami".format(self.run_url),
        )
        raw = response.json()
        infos =  {
            "run_url": self.run_url,
        }
        display_me(raw.get("profile", {}), infos)
