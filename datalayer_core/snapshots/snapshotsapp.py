# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

from datalayer_core.application import NoStart
from datalayer_core.cli.base import DatalayerCLIBaseApp
from datalayer_core.snapshots.create.createapp import SnapshotsCreateApp
from datalayer_core.snapshots.delete.deleteapp import SnapshotsDeleteApp
from datalayer_core.snapshots.list.listapp import SnapshotsListApp


class SnapshotsApp(DatalayerCLIBaseApp):
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
        try:
            super().start()
            self.log.info(
                f"One of `{'` `'.join(SnapshotsApp.subcommands.keys())}` must be specified."
            )
            self.exit(1)
        except NoStart:
            pass
        self.exit(0)
