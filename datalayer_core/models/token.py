# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""
Token models for the Datalayer SDK.

Provides data structures for token management in Datalayer environments.
"""

from enum import Enum
from typing import Any, Dict, Union

from pydantic import BaseModel, Field


class TokenType(str, Enum):
    """Enum for token variants."""

    USER = "user_token"


class TokenModel(BaseModel):
    """
    Pydantic model representing a token in Datalayer.
    """

    uid: str = Field(..., description="Unique identifier for the token")
    name: str = Field(..., description="Name of the token")
    description: str = Field(..., description="Description of the token")
    token_type: Union[str, TokenType] = Field(
        default=TokenType.USER,
        description='Type of the token (e.g., "user", "admin")',
    )
    kwargs: Dict[str, Any] = Field(
        default_factory=dict, description="Additional keyword arguments"
    )

    def __repr__(self) -> str:
        return f"TokenModel(uid='{self.uid}', name='{self.name}')"
