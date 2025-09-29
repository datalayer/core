# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""
Datalayer client authentication mixin.
"""

import os
from typing import Any, Optional

import requests

from datalayer_core.utils.defaults import DEFAULT_RUN_URL
from datalayer_core.utils.network import fetch


class AuthnMixin:
    """
    Mixin class for Datalayer client authentication.

    Provides methods to authenticate and fetch resources from the Datalayer server.
    """

    _token: Optional[str] = None
    _external_token: Optional[str] = None
    _run_url: str = DEFAULT_RUN_URL

    def _get_token(self) -> Optional[str]:
        """
        Get authentication token with fallback mechanisms.
        
        Tries in this order:
        1. Instance token (_token)
        2. Environment variable DATALAYER_API_KEY
        3. External token environment variable
        4. Keyring stored token
        
        Returns
        -------
        Optional[str]
            Authentication token if found, None otherwise.
        """
        # 1. Check instance token
        if self._token:
            return self._token
            
        # 2. Check environment variable
        env_token = os.environ.get("DATALAYER_API_KEY")
        if env_token:
            self._token = env_token
            return self._token
            
        # 3. Check external token environment variable
        external_token = os.environ.get("DATALAYER_EXTERNAL_TOKEN")
        if external_token:
            self._external_token = external_token
            return external_token
            
        # 4. Try to get token from keyring
        try:
            import keyring
            stored_token = keyring.get_password(self._run_url, "access_token")
            if stored_token:
                self._token = stored_token
                return self._token
        except ImportError:
            # keyring not available
            pass
        except Exception:
            # keyring access failed
            pass
            
        return None

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
            # Get token using fallback mechanisms
            token = self._get_token()
            
            return fetch(
                request,
                token=token,
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
        token = self._get_token()
        if not token:
            return {"success": False, "message": "No authentication token available"}
            
        body = {
            "token": token,
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
