# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""Snapshots CLI application for managing snapshots."""

from datalayer_core.application import NoStart
from datalayer_core.cli0.base import DatalayerCLIBaseApp
from datalayer_core.cli0.snapshots.create.createapp import SnapshotsCreateApp
from datalayer_core.cli0.snapshots.delete.deleteapp import SnapshotsDeleteApp
from datalayer_core.cli0.snapshots.list.listapp import SnapshotsListApp


class SnapshotsApp(DatalayerCLIBaseApp):
    """CLI application for managing snapshots with subcommands."""

    description = """
      The Runtimes CLI application.
    """

    _requires_auth = False

    subcommands = {
        "create": (SnapshotsCreateApp, SnapshotsListApp.description.splitlines()[0]),
        "delete": (SnapshotsDeleteApp, SnapshotsListApp.description.splitlines()[0]),
        "list": (SnapshotsListApp, SnapshotsListApp.description.splitlines()[0]),
        "ls": (SnapshotsListApp, SnapshotsListApp.description.splitlines()[0]),
    }

    def start(self) -> None:
        """Start the snapshots application and handle subcommand selection."""
        try:
            super().start()
            self.log.info(
                f"One of `{'` `'.join(SnapshotsApp.subcommands.keys())}` must be specified."
            )
            self.exit(1)
        except NoStart:
            pass
        self.exit(0)
