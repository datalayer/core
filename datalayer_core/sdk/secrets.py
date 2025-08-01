# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""
Secret classes for the Datalayer SDK.
"""

from typing import Union

from datalayer_core.secrets import SecretType


class Secret:
    """
    Represents a secret in Datalayer.

    Parameters
    ----------
    uid : str
        Unique identifier for the secret.
    name : str
        Name of the secret.
    description : str
        Description of the secret.
    secret_type : str
        Type of the secret (e.g., "generic", "password", "key", "token").
    **kwargs : dict[str, str]
        Additional keyword arguments.
    """

    def __init__(
        self,
        uid: str,
        name: str,
        description: str,
        secret_type: Union[str, SecretType] = SecretType.GENERIC,
        **kwargs: dict[str, str],
    ) -> None:
        """
        Initialize a secret object.

        Parameters
        ----------
        uid : str
            Unique identifier for the secret.
        name : str
            Name of the secret.
        description : str
            Description of the secret.
        secret_type : str
            Type of the secret (e.g., "generic", "password", "key", "token").
        **kwargs : dict[str, str]
            Additional keyword arguments.
        """
        self.uid = uid
        self.name = name
        self.description = description
        self.secret_type = secret_type
        self.kwargs = kwargs

    def __repr__(self) -> str:
        return f"Secret(uid='{self.uid}', name='{self.name}', description='{self.description}')"
