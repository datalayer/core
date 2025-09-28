# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""
Datalayer client authentication mixin.
"""

from typing import Any, Optional

import requests

from datalayer_core.sdk.utils import DEFAULT_RUN_URL
from datalayer_core.utils.utils import fetch


class DatalayerClientAuthnMixin:
    """
    Mixin class for Datalayer client authentication.

    Provides methods to authenticate and fetch resources from the Datalayer server.
    """

    _token: Optional[str] = None
    _external_token: Optional[str] = None
    _run_url: str = DEFAULT_RUN_URL

    def _fetch(self, request: str, **kwargs: Any) -> requests.Response:
        """
        Fetch a network resource.

        Parameters
        ----------
        request : str
            URL or request object to fetch.
        **kwargs : Any
            Additional keyword arguments passed to fetch function.

        Returns
        -------
        requests.Response
            HTTP response object.

        Raises
        ------
        RuntimeError
            If the request fails.
        """
        try:
            return fetch(
                request,
                token=self._token,
                external_token=self._external_token,
                **kwargs,
            )
        except requests.exceptions.Timeout as e:
            raise e
        except requests.exceptions.HTTPError as e:
            # raw = e.response.json()
            # self.log.debug(raw)
            raise RuntimeError(
                f"Failed to request the URL {request if isinstance(request, str) else request.url!s}"
            ) from e

    def _log_in(self) -> dict[str, Any]:
        """
        Authenticate with the Datalayer server.

        Returns
        -------
        dict[str, Any]
            Authentication response containing success status and user info.
        """
        body = {
            "token": self._token,
        }
        try:
            response = self._fetch(
                "{}/api/iam/v1/login".format(self._run_url),
                method="POST",
                json=body,
            )
            return response.json()
        except RuntimeError as e:
            return {"success": False, "message": str(e)}
