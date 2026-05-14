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

    def _get_subscription(self) -> dict[str, Any]:
        """
        Fetch subscription status and portal details.

        Returns
        -------
        dict[str, Any]
            Dictionary containing subscription data.
        """
        try:
            response = self._fetch(  # type: ignore
                "{}/api/iam/v1/subscription".format(self.urls.iam_url),  # type: ignore
            )
            return response.json()
        except RuntimeError as e:
            return {"success": False, "message": str(e)}

    def _cancel_subscription(self) -> dict[str, Any]:
        """
        Start cancellation flow for current subscription.

        Returns
        -------
        dict[str, Any]
            Dictionary containing cancellation response and optional portal.
        """
        try:
            response = self._fetch(  # type: ignore
                "{}/api/iam/v1/subscription/cancel".format(self.urls.iam_url),  # type: ignore
                method="POST",
            )
            return response.json()
        except RuntimeError as e:
            return {"success": False, "message": str(e)}

    def _get_subscription_plans(self) -> dict[str, Any]:
        """
        Fetch available monthly subscription plans.

        Returns
        -------
        dict[str, Any]
            Dictionary containing plans data.
        """
        try:
            response = self._fetch(  # type: ignore
                "{}/api/iam/v1/subscription/plans".format(self.urls.iam_url),  # type: ignore
            )
            return response.json()
        except RuntimeError as e:
            return {"success": False, "message": str(e)}

    def _create_checkout_portal(self, return_url: str) -> dict[str, Any]:
        """
        Create a checkout portal session.

        Parameters
        ----------
        return_url : str
            URL to return to after checkout operations.

        Returns
        -------
        dict[str, Any]
            Dictionary containing checkout portal response.
        """
        try:
            response = self._fetch(  # type: ignore
                "{}/api/iam/v1/checkout/portal".format(self.urls.iam_url),  # type: ignore
                method="POST",
                json={"return_url": return_url},
            )
            return response.json()
        except RuntimeError as e:
            return {"success": False, "message": str(e)}
