# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""Snapshots list application for Datalayer Core."""

import sys
from typing import Any

from datalayer_core.cli0.base import DatalayerCLIBaseApp
from datalayer_core.utils.utils import display_snapshots


class SnapshotsListMixin:
    """
    Mixin class to provide functionality for listing snapshots.
    """

    def _list_snapshots(self) -> dict[str, Any]:
        """
        List all available snapshots.

        Returns
        -------
        dict[str, Any]
            Dictionary containing snapshot information or error details.
        """
        try:
            response = self._fetch(  # type: ignore
                "{}/api/runtimes/v1/runtime-snapshots".format(self.run_url),  # type: ignore
            )
            return response.json()
        except RuntimeError as e:
            return {"sucess": False, "message": str(e)}


class SnapshotsListApp(DatalayerCLIBaseApp, SnapshotsListMixin):
    """An application to list the Snapshots."""

    description = """
      An application to list the snapshots.

    Usage:
      datalayer snapshots list
    """

    def start(self) -> None:
        """Start the app."""
        if len(self.extra_args) > 0:  # pragma: no cover
            self.log.warn("Too many arguments were provided for snapshots list.")
            self.print_help()
            self.exit(1)

        response = self._list_snapshots()
        if response["success"]:
            display_snapshots(response["snapshots"])
            sys.exit(0)
        else:
            self.log.warning(response["message"])
            sys.exit(1)
