# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""Profile management for Datalayer SDK."""

from typing import Any


class Profile:
    """
    Represents a user profile in the DataLayer SDK.

    Parameters
    ----------
    data : dict[str, Any]
        Dictionary containing profile data with keys.
    """

    def __init__(self, data: dict[str, Any]) -> None:
        """
        Initialize a Profile object.

        Parameters
        ----------
        data : dict[str, Any]
            Dictionary containing profile data with keys.
        """
        self.display_name = data["handle_s"]
        self.email = data["email_s"]
        self.first_name = data["first_name_t"]
        self.handle = data["handle_s"]
        self.last_name = data["last_name_t"]
        self.uid = data["uid"]
        self.id = data["id"]
        self.roles = data["roles_ss"]

    def __repr__(self) -> str:
        return f"Profile(display_name='{self.display_name}', email='{self.email}', first_name='{self.first_name}', handle='{self.handle}', last_name='{self.last_name}', uid='{self.uid}', roles={self.roles})"
