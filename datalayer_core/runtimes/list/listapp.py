# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

import sys
from typing import Any

from datalayer_core.cli.base import DatalayerCLIBaseApp
from datalayer_core.runtimes.utils import display_runtimes


class RuntimesListMixin:
    """
    Mixin for listing Datalayer runtimes.
    """

    def _list_runtimes(self) -> dict[str, Any]:
        """List all available runtimes."""
        try:
            response = self._fetch(  # type: ignore
                "{}/api/runtimes/v1/runtimes".format(self.run_url),  # type: ignore
            )
            return response.json()
        except RuntimeError as e:
            return {"success": False, "message": str(e)}


class RuntimesListApp(DatalayerCLIBaseApp, RuntimesListMixin):
    """An application to list the Runtimes."""

    description = """
      An application to list the runtimes.

      datalayer runtimes list
    """

    def start(self) -> None:
        """Start the app."""
        if len(self.extra_args) > 0:  # pragma: no cover
            self.log.warning("Too many arguments were provided for kernel list.")
            self.print_help()
            self.exit(1)

        response = self._list_runtimes()
        if response["success"]:
            display_runtimes(response["runtimes"])
        else:
            self.log.warning("The runtimes could not be listed!")
            sys.exit(1)
