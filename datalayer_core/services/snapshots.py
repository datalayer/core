# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""
Snapshot classes for the Datalayer SDK.
"""

import uuid
from typing import Any, List, Optional, Tuple


class RuntimeSnapshot:
    """
    Represents a snapshot of a Datalayer runtime state.

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

    def __init__(
        self,
        uid: str,
        name: str,
        description: str,
        environment: str,
        metadata: dict[str, Any],
    ):
        """
        Initialize a runtime snapshot.

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
        self._uid = uid
        self.name = name
        self.description = description
        self._environment = environment
        self._metadata = metadata

    def __repr__(self) -> str:
        return (
            f"RuntimeSnapshot(uid='{self._uid}', name='{self.name}', "
            f"description='{self.description}', environment='{self._environment}')"
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
        return self._environment

    @property
    def uid(self) -> str:
        """
        Get the unique identifier of the snapshot.

        Returns
        -------
        str
            The unique identifier of the snapshot.
        """
        return self._uid

    @property
    def metadata(self) -> dict[str, Any]:
        """
        Get the metadata of the snapshot.

        Returns
        -------
        dict[str, Any]
            The metadata associated with the snapshot.
        """
        return self._metadata


def _create_snapshot(
    name: Optional[str], description: Optional[str]
) -> Tuple[str, str]:
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


def _list_snapshots(response: dict[str, Any]) -> List["RuntimeSnapshot"]:
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
                RuntimeSnapshot(
                    uid=snapshot["uid"],
                    name=snapshot["name"],
                    description=snapshot["description"],
                    environment=snapshot["environment"],
                    metadata=snapshot["metadata"],
                )
            )
    return snapshot_objects
