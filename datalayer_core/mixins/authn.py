# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""
Datalayer client authentication mixin.
"""

import os
from typing import Any, Optional

import requests

from datalayer_core.utils.network import fetch


class AuthnMixin:
    """
    Provide authentication methods for Datalayer client.

    This mixin expects the implementing class to provide:
    - urls property: DatalayerURLs instance with run_url and iam_url
    """

    @property
    def urls(self) -> Any:
        """Return URLs property that must be implemented by the inheriting class."""
        raise NotImplementedError("Implementing class must provide urls property")

    _token: Optional[str] = None
    _external_token: Optional[str] = None

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

            stored_token = keyring.get_password(self.urls.run_url, "access_token")
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
            url = request if isinstance(request, str) else request.url
            status = None
            body = None
            if getattr(e, "response", None) is not None:
                status = e.response.status_code
                try:
                    body = e.response.text
                except Exception:
                    body = None
            details = []
            if status is not None:
                details.append(f"status={status}")
            if body:
                details.append(f"body={body}")
            detail_msg = f" ({', '.join(details)})" if details else ""
            raise RuntimeError(
                f"Failed to request the URL {url!s}{detail_msg}"
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
                "{}/api/iam/v1/login".format(self.urls.iam_url),
                method="POST",
                json=body,
            )
            return response.json()
        except RuntimeError as e:
            return {"success": False, "message": str(e)}
