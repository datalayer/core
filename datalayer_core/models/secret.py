# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""
Secret models for Datalayer.

Provides data structures for secret management in Datalayer environments.
"""

from enum import Enum
from typing import Any, Dict, Union

from pydantic import BaseModel, Field


class SecretVariant(str, Enum):
    """Enum for secret variants."""

    GENERIC = "generic"
    PASSWORD = "password"
    KEY = "key"
    TOKEN = "token"


class SecretModel(BaseModel):
    """
    Pydantic model representing a secret in Datalayer.
    """

    uid: str = Field(..., description="Unique identifier for the secret")
    name: str = Field(..., description="Name of the secret")
    description: str = Field(..., description="Description of the secret")
    secret_type: Union[str, SecretVariant] = Field(
        default=SecretVariant.GENERIC,
        description='Type of the secret (e.g., "generic", "password", "key", "token")',
    )
    kwargs: Dict[str, Any] = Field(
        default_factory=dict, description="Additional keyword arguments"
    )

    def __repr__(self) -> str:
        return f"SecretModel(uid='{self.uid}', name='{self.name}', description='{self.description}')"
