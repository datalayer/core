# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""Who Am I application for Datalayer Core authentication."""

from datalayer_core.mixins.whoami import WhoamiAppMixin
from datalayer_core.displays.me import display_me
from datalayer_core.cliapp.base import DatalayerCLIBaseApp


class WhoamiApp(DatalayerCLIBaseApp, WhoamiAppMixin):
    """An application to get the current authenticated user profile."""

    description = """
      An application to get the current authenticated user profile.

      datalayer whoami
    """

    def start(self) -> None:
        """Start the app."""
        if len(self.extra_args) > 0:  # pragma: no cover
            self.log.warn("Too many arguments were provided for runtimes list.")
            self.print_help()
            self.exit(1)

        response = self._get_profile()
        infos = {
            "run_url": self.run_url,
        }
        display_me(response["profile"], infos)
