# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

import warnings

from datalayer_core.cli.base import DatalayerCLIBaseApp
from datalayer_core.authn.apps.utils import display_me


class WhoamiApp(DatalayerCLIBaseApp):
    """An application to get the current authenticated user profile."""

    description = """
      An application to get the current authenticated user profile.

      datalayer whoami
    """
    
    def get_profile(self):
        response = self._fetch(
            "{}/api/iam/v1/whoami".format(self.run_url),
        )
        return response.json()

        
    def start(self):
        """Start the app."""
        if len(self.extra_args) > 0:  # pragma: no cover
            warnings.warn("Too many arguments were provided for runtimes list.")
            self.print_help()
            self.exit(1)

        response = self.get_profile()
        infos =  {
            "run_url": self.run_url,
        }
        display_me(response.get("profile", {}), infos)
