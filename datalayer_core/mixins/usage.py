# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""Usage/credits endpoints for Datalayer Core."""

from typing import Any


class UsageMixin:
    """Mixin for usage and credits."""

    def _get_usage_credits(self) -> dict[str, Any]:
        """
        Fetch usage credits and reservations.

        Returns
        -------
        dict[str, Any]
            Dictionary containing usage credits data.
        """
        try:
            response = self._fetch(  # type: ignore
                "{}/api/iam/v1/usage/credits".format(self.urls.iam_url),  # type: ignore
            )
            return response.json()
        except RuntimeError as e:
            return {"success": False, "message": str(e)}
