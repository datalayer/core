# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

from typing import Any

from datalayer_core.cli.base import DatalayerCLIBaseApp
from datalayer_core.runtimes.utils import display_kernels


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

        display_kernels(self._list_runtimes().get("runtimes", []))
