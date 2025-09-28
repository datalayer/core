# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""Snapshot management functionality."""

from datalayer_core.cli0.snapshots.create.createapp import SnapshotsCreateMixin
from datalayer_core.cli0.snapshots.delete.deleteapp import SnapshotsDeleteMixin
from datalayer_core.cli0.snapshots.list.listapp import SnapshotsListMixin


class SnapshotsMixin(SnapshotsCreateMixin, SnapshotsDeleteMixin, SnapshotsListMixin):
    """
    Mixin class that provides snapshot management functionality.
    """


__all__ = [
    "SnapshotsMixin",
]
