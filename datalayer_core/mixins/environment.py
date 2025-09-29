# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

from typing import Any

"""Datalayer environments management."""

class EnvironmentsListMixin:
    """Mixin class that provides environment listing functionality."""

    def _list_environments(self) -> dict[str, Any]:
        """
        List available environments.

        Returns
        -------
        dict[str, Any]
            Dictionary containing environment information.
        """
        try:
            response = self._fetch(  # type: ignore
                "{}/api/runtimes/v1/environments".format(self.run_url),  # type: ignore
            )
            return response.json()
        except RuntimeError as e:
            return {"success": False, "message": str(e)}


class EnvironmentsMixin(EnvironmentsListMixin):
    """
    Mixin class that provides environment listing functionality.
    """
