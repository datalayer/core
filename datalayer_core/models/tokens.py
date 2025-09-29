# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""
Token classes for the Datalayer SDK.
"""

from enum import Enum
from typing import Union


class TokenType(str, Enum):
    """Enum for secret variants."""

    USER = "user_token"


class TokenModel:
    """
    Represents a token in Datalayer.

    Parameters
    ----------
    uid : str
        Unique identifier for the token.
    name : str
        Name of the token.
    description : str
        Description of the token.
    token_type : str
        Type of the token (e.g., "user", "admin").
    **kwargs : dict[str, str]
        Additional keyword arguments.
    """

    def __init__(
        self,
        uid: str,
        name: str,
        description: str,
        token_type: Union[str, TokenType] = TokenType.USER,
        **kwargs: dict[str, str],
    ) -> None:
        """
        Initialize a token object.

        Parameters
        ----------
        uid : str
            Unique identifier for the token.
        name : str
            Name of the token.
        description : str
            Description of the token.
        token_type : str
            Type of the token (e.g., "generic", "password", "key", "token").
        **kwargs : dict[str, str]
            Additional keyword arguments.
        """
        self.uid = uid
        self.name = name
        self.description = description
        self.token_type = token_type
        self.kwargs = kwargs

    def __repr__(self) -> str:
        return f"Token(uid='{self.uid}', name='{self.name}')"
