# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

# Copyright (c) 2023-2026 Datalayer, Inc.
# Datalayer License

"""Sharing a runtime: who else may use a sandbox, and what they may do."""

from __future__ import annotations

from typing import Any


class RuntimeSharingMixin:
    """Runtimes' sharing routes, as the caller."""

    def _runtime_sharing(self, runtime_name: str) -> dict[str, Any]:
        """The grants on a runtime, per level and kind of principal. The owner's to see."""
        try:
            response = self._fetch(  # type: ignore
                "{}/api/runtimes/v1/runtimes/{}/sharing".format(self.urls.runtimes_url, runtime_name),  # type: ignore
                method="GET",
            )
            return response.json()
        except RuntimeError as e:
            return {"success": False, "message": str(e)}

    def _share_runtime(self, runtime_name: str, access: dict[str, Any]) -> dict[str, Any]:
        """Replace the grants at the levels named; levels not named are kept."""
        try:
            response = self._fetch(  # type: ignore
                "{}/api/runtimes/v1/runtimes/{}/sharing".format(self.urls.runtimes_url, runtime_name),  # type: ignore
                method="PUT",
                json={"access": access},
            )
            return response.json()
        except RuntimeError as e:
            return {"success": False, "message": str(e)}

    def _runtime_permissions(self, runtime_name: str) -> dict[str, Any]:
        """What the caller may do with a runtime: `view`, `update`, `execute`."""
        try:
            response = self._fetch(  # type: ignore
                "{}/api/runtimes/v1/runtimes/{}/permissions".format(self.urls.runtimes_url, runtime_name),  # type: ignore
                method="GET",
            )
            return response.json()
        except RuntimeError as e:
            return {"success": False, "message": str(e)}
