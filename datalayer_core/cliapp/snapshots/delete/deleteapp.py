# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""Snapshot deletion application for Datalayer Core."""

import sys
from typing import Any

from datalayer_core.cliapp.base import DatalayerCLIBaseApp
from datalayer_core.mixins.snapshots import SnapshotsDeleteMixin


class SnapshotsDeleteApp(DatalayerCLIBaseApp, SnapshotsDeleteMixin):
    """An application to delete snapshots."""

    description = """
    An application to delete snapshots.

    Usage:
      datalayer snapshots delete SNAPSHOT_UID
    """

    def start(self) -> None:
        """Start the app."""
        if len(self.extra_args) > 1:  # pragma: no cover
            self.log.warn("Too many arguments were provided for snapshots delete.")
            self.print_help()
            self.exit(1)

        if len(self.extra_args) < 1:  # pragma: no cover
            self.log.warn("Too few arguments were provided for snapshots delete.")
            self.print_help()
            self.exit(1)

        snapshot_uid = self.extra_args[0]
        response = self._delete_snapshot(snapshot_uid)
        if response["success"]:
            self.log.info(f"Snapshot {snapshot_uid} deleted successfully.")
            sys.exit(0)
        else:
            self.log.warning(response["message"])
            sys.exit(1)
