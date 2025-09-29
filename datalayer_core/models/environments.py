# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""
Environment classes for the Datalayer SDK.
"""

from typing import Any, Optional

from datalayer_core.utils.types import CreditsPerSecond


class EnvironmentModel:
    """
    Represents a Datalayer environment.

    Provides information about available computing environments
    including resources, packages, and configuration details.

    Parameters
    ----------
    name : str
        Name of the environment.
    title : str
        Title of the environment.
    burning_rate : float
        The cost of running the environment per hour.
    language : str
        Programming language for the environment.
    owner : str
        Owner of the environment.
    visibility : str
        Environment visibility (public/private).
    metadata : Optional[dict[str, Any]]
        Additional metadata for the environment.
    """

    def __init__(
        self,
        name: str,
        title: str,
        burning_rate: CreditsPerSecond,
        language: str,
        owner: str,
        visibility: str,
        metadata: Optional[dict[str, Any]] = None,
    ):
        """
        Initialize an environment.

        Parameters
        ----------
        name : str
            Name of the environment.
        title : str
            Title of the environment.
        burning_rate : float
            The cost of running the environment per hour.
        language : str
            Programming language for the environment.
        owner : str
            Owner of the environment.
        visibility : str
            Environment visibility (public/private).
        metadata : dict[str, Any], optional
            Additional metadata for the environment.
        """
        self.name = name
        self.title = title
        self.burning_rate = burning_rate
        self.language = language
        self.owner = owner
        self.visibility = visibility
        self.metadata = metadata

    def __repr__(self) -> str:
        return f"Environment(name='{self.name}', title='{self.title}')"
