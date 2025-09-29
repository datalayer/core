# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""Runtime management module for Datalayer Core."""

import sys
from typing import Any, Optional

from datalayer_core.utils.defaults import get_default_credits_limit


class RuntimesCreateMixin:
    """Mixin for creating a Datalayer Runtime."""

    def _create_runtime(
        self,
        environment_name: str = "python-env",
        given_name: Optional[str] = None,
        credits_limit: Optional[float] = None,
        from_snapshot_uid: Optional[str] = None,
    ) -> dict[str, Any]:
        """
        Create a Runtime with the given environment name.

        Parameters
        ----------
        environment_name : str
            Name of the environment to use.
        given_name : Optional[str]
            Custom name for the runtime.
        credits_limit : Optional[float]
            Credit limit for the runtime.
        from_snapshot_uid : Optional[str]
            UID of snapshot to create runtime from.

        Returns
        -------
        dict[str, Any]
            Response containing runtime creation details.
        """
        body = {
            "type": "notebook",
            "environment_name": environment_name,
        }

        if given_name:
            body["given_name"] = given_name

        try:
            if credits_limit is None:
                response = self._fetch(  # type: ignore
                    "{}/api/iam/v1/usage/credits".format(self.run_url),  # type: ignore
                    method="GET",
                )

                raw_credits = response.json()
                credits_limit = get_default_credits_limit(
                    raw_credits["reservations"], raw_credits["credits"]
                )
                # self.log.warning(
                #     "The Runtime will be allowed to consumed half of your remaining credits: {:.2f} credit.".format(
                #         self.credits_limit
                #     )
                # )

            if credits_limit < sys.float_info.epsilon:
                # self.log.warning("Credits reservation is not positive. Exiting…")
                return {}

            body["credits_limit"] = credits_limit  # type: ignore

            if from_snapshot_uid:
                body["from"] = from_snapshot_uid

            response = self._fetch(  # type: ignore
                "{}/api/runtimes/v1/runtimes".format(self.run_url),  # type: ignore
                method="POST",
                json=body,
            )
            return response.json()
        except RuntimeError as e:
            return {"success": False, "message": str(e)}



class RuntimesListMixin:
    """Mixin for listing Datalayer runtimes."""

    def _list_runtimes(self) -> dict[str, Any]:
        """
        List all available runtimes.

        Returns
        -------
        dict
            A dictionary containing the response.
        """
        try:
            response = self._fetch(  # type: ignore
                "{}/api/runtimes/v1/runtimes".format(self.run_url),  # type: ignore
            )
            return response.json()
        except RuntimeError as e:
            return {"success": False, "message": str(e)}


class RuntimesTerminateMixin:
    """
    Mixin for terminating Datalayer runtimes.
    """

    def _terminate_runtime(self, pod_name: str) -> dict[str, Any]:
        """
        Terminate a Runtime with the given kernel ID.

        Parameters
        ----------
        pod_name : str
            The pod name of the runtime to terminate.

        Returns
        -------
        dict[str, Any]
            Response containing termination status.
        """
        try:
            response = self._fetch(  # type: ignore
                "{}/api/runtimes/v1/runtimes/{}".format(self.run_url, pod_name),  # type: ignore
                method="DELETE",
            )
            return {
                "success": response.status_code == 204,
                "message": "Runtime terminated successfully.",
            }

        except RuntimeError:
            return {"success": False, "message": "Failed to terminate the runtime."}


class RuntimesMixin(
    RuntimesCreateMixin,
    RuntimesListMixin,
    RuntimesTerminateMixin,
):
    """
    Mixin class that provides runtime management functionality.
    """
