# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.
 
from typing import Any


class WhoamiAppMixin:
    """Mixin for Who Am I application."""

    def _get_profile(self) -> dict[str, Any]:
        """
        Get user profile information.

        Returns
        -------
        dict[str, Any]
            Dictionary containing user profile information.
        """
        try:
            response = self._fetch(  # type: ignore
                "{}/api/iam/v1/whoami".format(self.iam_url),  # type: ignore
            )
            return response.json()
        except RuntimeError as e:
            return {"success": False, "message": str(e)}

