# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

from typing import Any

from rich import print_json

from datalayer_core.cli.base import DatalayerCLIBaseApp
from datalayer_core.snapshots.utils import display_snapshots


class SnapshotsCreateMixin:
    """Mixin class for creating snapshots."""

    def _create_snapshot(
        self, pod_name: str, name: str, description: str, stop: bool = True
    ) -> dict[str, Any]:
        body = {
            "pod_name": pod_name,
            "name": name,
            "description": description,
            "stop": stop,
        }
        try:
            response = self._fetch(  # type: ignore
                "{}/api/runtimes/v1/runtime-snapshots".format(self.run_url),  # type: ignore
                method="POST",
                json=body,
            )
            return response.json()
        except RuntimeError as e:
            return {"success": False, "message": str(e)}


class SnapshotsCreateApp(DatalayerCLIBaseApp, SnapshotsCreateMixin):
    """An application to create a Snapshot."""

    description = """
    An application to create a Snapshot.

    usage:
      jupyter snapshots create POD_NAME NAME DESCRIPTION [STOP]
    """

    def start(self) -> None:
        """Start the app."""
        if len(self.extra_args) > 4:  # pragma: no cover
            self.log.warning("Too many arguments were provided for snapshots create.")
            self.print_help()
            self.exit(1)

        if len(self.extra_args) < 3:  # pragma: no cover
            self.log.warning("Too few arguments were provided for snapshots create.")
            self.print_help()
            self.exit(1)

        pod_name = self.extra_args[0]
        raw = self._create_runtime(pod_name)
        if raw is None:
            self.exit(1)

        kernel = raw["kernel"]
        if kernel:
            display_snapshots([kernel])
        else:
            print_json(data=raw)
