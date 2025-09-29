# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""
Snapshot services for Datalayer.

Provides runtime snapshot management and operations in Datalayer environments.
"""

import uuid
from typing import Any, List, Optional, Tuple

from datalayer_core.models.runtime_snapshot import RuntimeSnapshotModel


class RuntimeSnapshotsService:
    """
    Service for managing Datalayer runtime snapshot operations.

    This service handles runtime snapshot operations while the snapshot data
    is managed through the RuntimeSnapshotModel.

    Parameters
    ----------
    snapshot_model : RuntimeSnapshotModel
        The snapshot model containing all configuration and state data.
    """

    def __init__(
        self,
        uid: str,
        name: str,
        description: str,
        environment: str,
        metadata: dict[str, Any],
    ):
        """
        Initialize a runtime snapshot service.

        Parameters
        ----------
        uid : str
            Unique identifier for the snapshot.
        name : str
            Name of the snapshot.
        description : str
            Description of the snapshot.
        environment : str
            Environment associated with the snapshot.
        metadata : dict[str, Any]
            Metadata related to the snapshot.
        """
        # Initialize the snapshot model with all the data fields
        self.model = RuntimeSnapshotModel(
            uid=uid,
            name=name,
            description=description,
            environment=environment,
            metadata=metadata,
        )

    def __repr__(self) -> str:
        return (
            f"RuntimeSnapshotService(uid='{self.model.uid}', name='{self.model.name}', "
            f"description='{self.model.description}', environment='{self.model.environment}')"
        )

    @property
    def environment(self) -> str:
        """
        Get the environment of the snapshot.

        Returns
        -------
        str
            The environment associated with the snapshot.
        """
        return self.model.environment

    @property
    def uid(self) -> str:
        """
        Get the unique identifier of the snapshot.

        Returns
        -------
        str
            The unique identifier of the snapshot.
        """
        return self.model.uid

    @property
    def name(self) -> str:
        """
        Get the name of the snapshot.

        Returns
        -------
        str
            The name of the snapshot.
        """
        return self.model.name

    @property
    def description(self) -> str:
        """
        Get the description of the snapshot.

        Returns
        -------
        str
            The description of the snapshot.
        """
        return self.model.description

    @property
    def metadata(self) -> dict[str, Any]:
        """
        Get the metadata of the snapshot.

        Returns
        -------
        dict[str, Any]
            The metadata associated with the snapshot.
        """
        return self.model.metadata


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


def as_runtime_snapshots(response: dict[str, Any]) -> List["RuntimeSnapshotsService"]:
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
                RuntimeSnapshotsService(
                    uid=snapshot["uid"],
                    name=snapshot["name"],
                    description=snapshot["description"],
                    environment=snapshot["environment"],
                    metadata=snapshot["metadata"],
                )
            )
    return snapshot_objects
