# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""Snapshot deletion application for Datalayer Core."""

import sys
from typing import Any

from datalayer_core.cli0.base import DatalayerCLIBaseApp


class SnapshotsDeleteMixin:
    """
    Mixin class that provides snapshot deletion functionality.
    """

    def _delete_snapshot(self, snapshot_uid: str) -> dict[str, Any]:
        """
        Delete snapshots of the current runtime.

        Parameters
        ----------
        snapshot_uid : str
            The unique identifier of the snapshot to delete.

        Returns
        -------
        dict[str, Any]
            Dictionary containing success status and message.
        """
        try:
            response = self._fetch(  # type: ignore
                "{}/api/runtimes/v1/runtime-snapshots/{}".format(
                    self.run_url,  # type: ignore
                    snapshot_uid,
                ),
                method="DELETE",
            )
            return {
                "success": response.status_code == 204,
                "message": "Snapshot deleted successfully.",
            }
        except RuntimeError as e:
            return {"sucess": False, "message": str(e)}


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
