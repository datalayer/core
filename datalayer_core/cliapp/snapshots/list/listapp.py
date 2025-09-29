# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""Snapshots list application for Datalayer Core."""

import sys

from datalayer_core.cliapp.base import DatalayerCLIBaseApp
from datalayer_core.mixins.snapshots import SnapshotsListMixin
from datalayer_core.display.snapshots import display_snapshots


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
