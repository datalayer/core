# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""
Datalayer authentication mixin.
"""

import os
from typing import Any, Optional

import requests

from datalayer_core.utils.network import fetch


class AuthnMixin:
    """
    Provide authentication methods for Datalayer client.

    This mixin expects the implementing class to provide:
    - urls property: DatalayerURLs instance with iam_url and the other service URLs
    """

    @property
    def urls(self) -> Any:
        """Return URLs property that must be implemented by the inheriting class."""
        raise NotImplementedError("Implementing class must provide urls property")

    _api_key: Optional[str] = None
    _external_token: Optional[str] = None

    def _get_api_key(self) -> Optional[str]:
        """
        Get the Datalayer API key with fallback mechanisms.

        Tries in this order:
        1. Instance API key (_api_key)
        2. Environment variable DATALAYER_API_KEY
        3. Environment variable TEST_DATALAYER_API_KEY
        4. External token environment variable
        5. Keyring stored API key

        Returns
        -------
        Optional[str]
            Datalayer API key if found, None otherwise.
        """
        # 1. Check instance API key
        if self._api_key:
            return self._api_key

        # 2. Check environment variable
        env_api_key = os.environ.get("DATALAYER_API_KEY")
        if env_api_key:
            self._api_key = env_api_key
            return self._api_key

        # 3. Check test environment variable
        test_env_api_key = os.environ.get("TEST_DATALAYER_API_KEY")
        if test_env_api_key:
            self._api_key = test_env_api_key
            return self._api_key

        # 4. Check external token environment variable
        external_token = os.environ.get("DATALAYER_EXTERNAL_TOKEN")
        if external_token:
            self._external_token = external_token
            return external_token

        # 5. Try to get API key from keyring
        try:
            import keyring

            # The credentials are stored under the IAM URL, which is what
            # issued them.
            stored_api_key = keyring.get_password(self.urls.iam_url, "access_token")
            if stored_api_key:
                self._api_key = stored_api_key
                return self._api_key
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
            # Get the Datalayer API key using fallback mechanisms
            api_key = self._get_api_key()

            return fetch(
                request,
                token=api_key,
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
            raise RuntimeError(f"Failed to request the URL {url!s}{detail_msg}") from e

    def _log_in(self) -> dict[str, Any]:
        """
        Authenticate with the Datalayer server.

        Returns
        -------
        dict[str, Any]
            Authentication response containing success status and user info.
        """
        api_key = self._get_api_key()
        if not api_key:
            return {"success": False, "message": "No authentication token available"}

        body = {
            "token": api_key,
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
