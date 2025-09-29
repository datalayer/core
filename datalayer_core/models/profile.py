# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""Profile management models for Datalayer SDK."""

from typing import Any, Dict, List

from pydantic import BaseModel, Field, field_validator


class ProfileModel(BaseModel):
    """
    Pydantic model representing a user profile in the DataLayer SDK.
    """

    display_name: str = Field(..., description="Display name of the user")
    email: str = Field(..., description="Email address of the user")
    first_name: str = Field(..., description="First name of the user")
    handle: str = Field(..., description="User handle")
    last_name: str = Field(..., description="Last name of the user")
    uid: str = Field(..., description="Unique identifier of the user")
    id: str = Field(..., description="ID of the user")
    roles: List[str] = Field(..., description="List of user roles")

    @field_validator("display_name", "handle", mode="before")
    @classmethod
    def extract_handle(cls, v: Any, info) -> str:
        """Extract handle from data dict if needed for backward compatibility."""
        if isinstance(v, dict) and info.field_name in ["display_name", "handle"]:
            return v.get("handle_s", "")
        return v

    @classmethod
    def from_data(cls, data: Dict[str, Any]) -> "ProfileModel":
        """
        Create a ProfileModel from raw data dictionary.

        This method provides backward compatibility with the original constructor
        that accepted a data dictionary.

        Parameters
        ----------
        data : Dict[str, Any]
            Dictionary containing profile data with keys.

        Returns
        -------
        ProfileModel
            A ProfileModel instance.
        """
        return cls(
            display_name=data["handle_s"],
            email=data["email_s"],
            first_name=data["first_name_t"],
            handle=data["handle_s"],
            last_name=data["last_name_t"],
            uid=data["uid"],
            id=data["id"],
            roles=data["roles_ss"],
        )

    def __repr__(self) -> str:
        return (
            f"ProfileModel(display_name='{self.display_name}', email='{self.email}', "
            f"first_name='{self.first_name}', handle='{self.handle}', "
            f"last_name='{self.last_name}', uid='{self.uid}', roles={self.roles})"
        )
