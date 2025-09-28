# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""Who Am I application for Datalayer Core authentication."""

from typing import Any

from datalayer_core.utils.utils import display_me
from datalayer_core.cli0.base import DatalayerCLIBaseApp


class WhoamiAppMixin:
    """Mixin for Who Am I application."""

    def _get_profile(self) -> dict[str, Any]:
        """
        Get user profile information.

        Returns
        -------
        dict[str, Any]
            Dictionary containing user profile information.
        """
        try:
            response = self._fetch(  # type: ignore
                "{}/api/iam/v1/whoami".format(self.run_url),  # type: ignore
            )
            return response.json()
        except RuntimeError as e:
            return {"success": False, "message": str(e)}


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
