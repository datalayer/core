# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""
Snapshot services for Datalayer.

Provides runtime snapshot management and operations in Datalayer environments.
"""

import uuid
from typing import Any, List, Optional, Tuple

from datalayer_core.models.runtime_snapshot import RuntimeSnapshotModel


def create_snapshot(name: Optional[str], description: Optional[str]) -> Tuple[str, str]:
    """
    Create snapshot name and description with defaults.

    Parameters
    ----------
    name : Optional[str]
        Name for the snapshot, or None for auto-generated name.
    description : Optional[str]
        Description for the snapshot, or None for auto-generated description.

    Returns
    -------
    Tuple[str, str]
        Tuple of (name, description) strings.
    """
    uid = uuid.uuid4()
    if name is None:
        name = f"snapshot-{uid}"

    if description is None:
        description = f"snapshot-{uid}"

    return name, description


def as_runtime_snapshots(response: dict[str, Any]) -> List["RuntimeSnapshotModel"]:
    """
    Parse API response and create RuntimeSnapshot objects.

    Parameters
    ----------
    response : dict[str, Any]
        API response dictionary containing snapshots data.

    Returns
    -------
    List[RuntimeSnapshot]
        List of RuntimeSnapshot objects parsed from the response.
    """
    snapshot_objects = []
    if response["success"]:
        snapshots = response["snapshots"]
        for snapshot in snapshots:
            snapshot_objects.append(
                RuntimeSnapshotModel(
                    uid=snapshot["uid"],
                    name=snapshot["name"],
                    description=snapshot["description"],
                    environment=snapshot["environment"],
                    metadata=snapshot["metadata"],
                )
            )
    return snapshot_objects
