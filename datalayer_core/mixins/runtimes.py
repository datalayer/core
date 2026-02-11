# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""Runtime management module for Datalayer Core."""

import logging
import sys
from typing import Any, Optional

from datalayer_core.utils.defaults import get_default_credits_limit

logger = logging.getLogger(__name__)


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
                    "{}/api/iam/v1/usage/credits".format(self.urls.iam_url),  # type: ignore
                    method="GET",
                )

                if response.status_code != 200:
                    error_msg = f"Failed to fetch credits: HTTP {response.status_code}"
                    logger.error(error_msg)
                    return {"success": False, "message": error_msg}

                try:
                    raw_credits = response.json()
                except Exception as e:
                    error_msg = f"Failed to parse credits response: {str(e)}"
                    logger.error(error_msg)
                    return {"success": False, "message": error_msg}

                if "success" in raw_credits and not raw_credits["success"]:
                    error_msg = f"Credits API returned error: {raw_credits.get('message', 'Unknown error')}"
                    logger.error(error_msg)
                    return {"success": False, "message": error_msg}

                credits_limit = get_default_credits_limit(
                    raw_credits.get("reservations", []), raw_credits.get("credits", 0)
                )
                logger.debug("Runtime will use credits limit: %.2f", credits_limit)

            if credits_limit < sys.float_info.epsilon:
                error_msg = (
                    "Credits reservation is not positive. Cannot create runtime."
                )
                logger.error(error_msg)
                return {"success": False, "message": error_msg}

            body["credits_limit"] = credits_limit  # type: ignore

            if from_snapshot_uid:
                body["from"] = from_snapshot_uid

            runtime_url = "{}/api/runtimes/v1/runtimes".format(self.urls.run_url)  # type: ignore
            logger.debug(
                "Creating runtime via %s with payload keys=%s",
                runtime_url,
                sorted(body.keys()),
            )
            logger.debug("Runtime create payload: %s", body)

            response = self._fetch(  # type: ignore
                runtime_url,
                method="POST",
                json=body,
            )

            if response.status_code not in [200, 201]:
                error_msg = f"Failed to create runtime: HTTP {response.status_code}"
                logger.error(error_msg)
                try:
                    error_details = response.json()
                    if "message" in error_details:
                        error_msg += f" - {error_details['message']}"
                        logger.error("Details: %s", error_details["message"])
                except Exception:
                    pass
                return {"success": False, "message": error_msg}

            try:
                result = response.json()
                if "success" in result and not result["success"]:
                    error_msg = f"Runtime creation failed: {result.get('message', 'Unknown error')}"
                    logger.error(error_msg)
                    return {"success": False, "message": error_msg}

                logger.debug(
                    "Runtime created successfully: %s",
                    result.get("runtime", {}).get("uid", "N/A"),
                )
                return result
            except Exception as e:
                error_msg = f"Failed to parse runtime creation response: {str(e)}"
                logger.error(error_msg)
                return {"success": False, "message": error_msg}

        except Exception as e:
            error_msg = f"Unexpected error during runtime creation: {str(e)}"
            logger.error(error_msg)
            return {"success": False, "message": error_msg}


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
                "{}/api/runtimes/v1/runtimes".format(self.urls.run_url),  # type: ignore
            )

            if response.status_code != 200:
                error_msg = f"Failed to list runtimes: HTTP {response.status_code}"
                logger.error(error_msg)
                return {"success": False, "message": error_msg}

            try:
                result = response.json()
                if "success" in result and not result["success"]:
                    error_msg = f"List runtimes failed: {result.get('message', 'Unknown error')}"
                    logger.error(error_msg)
                    return {"success": False, "message": error_msg}

                return result
            except Exception as e:
                error_msg = f"Failed to parse runtimes list response: {str(e)}"
                logger.error(error_msg)
                return {"success": False, "message": error_msg}

        except Exception as e:
            error_msg = f"Unexpected error listing runtimes: {str(e)}"
            logger.error(error_msg)
            return {"success": False, "message": error_msg}


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
                "{}/api/runtimes/v1/runtimes/{}".format(self.urls.run_url, pod_name),  # type: ignore
                method="DELETE",
            )

            if response.status_code in [200, 204]:
                logger.debug("Runtime %s terminated successfully", pod_name)
                return {
                    "success": True,
                    "message": "Runtime terminated successfully.",
                }
            else:
                error_msg = f"Failed to terminate runtime: HTTP {response.status_code}"
                logger.error(error_msg)
                try:
                    error_details = response.json()
                    if "message" in error_details:
                        error_msg += f" - {error_details['message']}"
                        logger.error("Details: %s", error_details["message"])
                except Exception:
                    pass
                return {"success": False, "message": error_msg}

        except Exception as e:
            error_msg = f"Unexpected error terminating runtime {pod_name}: {str(e)}"
            logger.error(error_msg)
            return {"success": False, "message": error_msg}


class RuntimesMixin(
    RuntimesCreateMixin,
    RuntimesListMixin,
    RuntimesTerminateMixin,
):
    """
    Mixin class that provides runtime management functionality.
    """
