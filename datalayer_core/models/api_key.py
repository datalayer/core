# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""
API key models for Datalayer.

Provides data structures for API key management in Datalayer environments.
"""

from enum import Enum
from typing import Any, Dict, Union

from pydantic import BaseModel, Field


class ApiKeyType(str, Enum):
    """Enum for API key variants."""

    USER = "user_token"


class ApiKeyModel(BaseModel):
    """
    Pydantic model representing an API key in Datalayer.
    """

    uid: str = Field(..., description="Unique identifier for the API key")
    name: str = Field(..., description="Name of the API key")
    description: str = Field(..., description="Description of the API key")
    api_key_type: Union[str, ApiKeyType] = Field(
        default=ApiKeyType.USER,
        description='Type of the API key (e.g., "user", "admin")',
    )
    kwargs: Dict[str, Any] = Field(
        default_factory=dict, description="Additional keyword arguments"
    )

    def __repr__(self) -> str:
        return f"ApiKeyModel(uid='{self.uid}', name='{self.name}')"
