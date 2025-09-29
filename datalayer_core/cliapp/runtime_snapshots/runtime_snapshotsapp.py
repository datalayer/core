# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""Snapshots CLI application for managing snapshots."""

from datalayer_core.base.application import NoStart
from datalayer_core.cliapp.base import DatalayerCLIBaseApp
from datalayer_core.cliapp.runtime_snapshots.create.createapp import RuntimeSnapshotsCreateApp
from datalayer_core.cliapp.runtime_snapshots.delete.deleteapp import RuntimeSnapshotsDeleteApp
from datalayer_core.cliapp.runtime_snapshots.list.listapp import RuntimeSnapshotsListApp


class RuntimeSnapshotsApp(DatalayerCLIBaseApp):
    """CLI application for managing snapshots with subcommands."""

    description = """
      The Runtimes CLI application.
    """

    _requires_auth = False

    subcommands = {
        "create": (RuntimeSnapshotsCreateApp, RuntimeSnapshotsListApp.description.splitlines()[0]),
        "delete": (RuntimeSnapshotsDeleteApp, RuntimeSnapshotsListApp.description.splitlines()[0]),
        "list": (RuntimeSnapshotsListApp, RuntimeSnapshotsListApp.description.splitlines()[0]),
        "ls": (RuntimeSnapshotsListApp, RuntimeSnapshotsListApp.description.splitlines()[0]),
    }

    def start(self) -> None:
        """Start the snapshots application and handle subcommand selection."""
        try:
            super().start()
            self.log.info(
                f"One of `{'` `'.join(RuntimeSnapshotsApp.subcommands.keys())}` must be specified."
            )
            self.exit(1)
        except NoStart:
            pass
        self.exit(0)
