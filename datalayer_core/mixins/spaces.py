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


class SpacesMixin(SpacesListMixin):
    """Mixin bringing together the space operations."""
