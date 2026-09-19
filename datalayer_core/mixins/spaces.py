# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""Reading the spaces of a user, and the items they hold."""

from typing import Any


class SpacesListMixin:
    """Mixin for listing spaces in Datalayer."""

    def _list_spaces(self) -> dict[str, Any]:
        """
        List the spaces of the authenticated user.

        The items of each space come back nested in the response, so this one
        call answers both "which spaces" and "what is in them".

        Returns
        -------
        dict
            The platform response, carrying a ``spaces`` list on success.
        """
        try:
            response = self._fetch(  # type: ignore
                "{}/api/spacer/v1/spaces/users/me".format(self.urls.spacer_url),  # type: ignore
                method="GET",
            )
            return response.json()
        except RuntimeError as e:
            return {"success": False, "message": str(e)}


class NotebookVersionsMixin:
    """The spacer's notebook versions: kept moments, each naming its actor."""

    def _list_notebook_versions(self, notebook_uid: str) -> dict[str, Any]:
        """The notebook's versions, newest first, as the spacer answers them."""
        try:
            response = self._fetch(  # type: ignore
                "{}/api/spacer/v1/notebooks/{}/versions".format(self.urls.spacer_url, notebook_uid),  # type: ignore
                method="GET",
            )
            return response.json()
        except RuntimeError as e:
            return {"success": False, "message": str(e)}

    def _snapshot_notebook(self, notebook_uid: str, message: str = "") -> dict[str, Any]:
        """Keep the notebook as it is now, with a message for the listing."""
        try:
            response = self._fetch(  # type: ignore
                "{}/api/spacer/v1/notebooks/{}/versions".format(self.urls.spacer_url, notebook_uid),  # type: ignore
                method="POST",
                json={"message": message or ""},
            )
            return response.json()
        except RuntimeError as e:
            return {"success": False, "message": str(e)}

    def _restore_notebook_version(self, notebook_uid: str, version_uid: str) -> dict[str, Any]:
        """Make a kept version current; the spacer keeps what it replaces."""
        try:
            response = self._fetch(  # type: ignore
                "{}/api/spacer/v1/notebooks/{}/versions/{}/restore".format(
                    self.urls.spacer_url, notebook_uid, version_uid  # type: ignore
                ),
                method="POST",
            )
            return response.json()
        except RuntimeError as e:
            return {"success": False, "message": str(e)}


class SpacesMixin(SpacesListMixin, NotebookVersionsMixin):
    """Mixin bringing together the space operations."""
