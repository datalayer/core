# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""Unified authentication manager for Datalayer clients."""

from __future__ import annotations

import logging
import os
from typing import Optional

from datalayer_core.services.authn.http_server import get_token
from datalayer_core.utils.network import fetch, find_http_port
from datalayer_core.utils.urls import DatalayerURLs

logger = logging.getLogger(__name__)


class AuthManager:
    """
    Unified authentication manager for all Datalayer Python clients.

    Provides multiple authentication methods:
    - Browser-based OAuth flow
    - Username/password authentication
    - Direct token authentication
    - Token discovery from keyring and environment variables

    Parameters
    ----------
    urls : DatalayerURLs
        URLs configuration for Datalayer services.
    """

    def __init__(self, urls: DatalayerURLs):
        """Initialize the authentication manager."""
        self.urls = urls
        self.keyring_enabled = self._check_keyring()
        logger.debug(f"AuthManager initialized (keyring: {self.keyring_enabled})")

    def _check_keyring(self) -> bool:
        """Check if keyring module is available."""
        try:
            import keyring

            return True
        except ImportError:
            return False

    def login_with_browser(self, port: Optional[int] = None) -> tuple[str, str]:
        """
        Launch browser-based OAuth flow.

        Opens a local HTTP server and browser for OAuth authentication.

        Parameters
        ----------
        port : int, optional
            Port for local HTTP server. If None, finds an available port.

        Returns
        -------
        tuple[str, str]
            (user_handle, token) tuple.

        Raises
        ------
        Exception
            If authentication fails or is cancelled
        """
        if port is None:
            port = find_http_port()

        logger.info(f"Starting browser authentication on port {port}")

        # Use existing http_server logic
        result = get_token(self.urls.run_url, port)

        if result is None:
            raise Exception("Authentication was cancelled or failed")

        user_handle, token = result

        # Store token if keyring is available
        if self.keyring_enabled:
            self.store_token(token)

        logger.info(f"Browser authentication successful for user: {user_handle}")
        return user_handle, token

    def login_with_credentials(self, handle: str, password: str) -> tuple[str, str]:
        """
        Authenticate with username/password.

        Parameters
        ----------
        handle : str
            User handle/username.
        password : str
            User password.

        Returns
        -------
        tuple[str, str]
            (user_handle, token) tuple.

        Raises
        ------
        Exception
            If authentication fails
        """
        logger.info(f"Attempting credential authentication for user: {handle}")

        try:
            response = fetch(
                f"{self.urls.iam_url}/api/iam/v1/login",
                method="POST",
                json={"handle": handle, "password": password},
                timeout=10,
            )
            content = response.json()
            user_handle = content["user"]["handle_s"]
            token = content["token"]

            # Store token if keyring is available
            if self.keyring_enabled:
                self.store_token(token)

            logger.info(f"Credential authentication successful for user: {user_handle}")
            return user_handle, token

        except Exception as e:
            logger.error(f"Credential authentication failed: {e}")
            raise

    def login_with_token(self, token: str) -> tuple[str, str]:
        """
        Validate and use an existing token.

        Parameters
        ----------
        token : str
            Authentication token to validate.

        Returns
        -------
        tuple[str, str]
            (user_handle, token) tuple.

        Raises
        ------
        Exception
            If token validation fails
        """
        logger.info("Validating provided token")

        try:
            # Validate token by making a whoami call directly to avoid circular import
            response = fetch(
                f"{self.urls.iam_url}/api/iam/v1/whoami",
                method="GET",
                headers={"Authorization": f"Bearer {token}"},
                timeout=10,
            )
            content = response.json()
            profile = content.get("profile", {})
            user_handle = profile.get("handle_s", "unknown")

            # Store token if keyring is available
            if self.keyring_enabled:
                self.store_token(token)

            logger.info(f"Token validation successful for user: {user_handle}")
            return user_handle, token

        except Exception as e:
            logger.error(f"Token validation failed: {e}")
            raise

    def get_stored_token(self) -> Optional[str]:
        """
        Try to find token from multiple sources in priority order.

        Priority:
        1. DATALAYER_API_KEY environment variable
        2. DATALAYER_EXTERNAL_TOKEN environment variable
        3. Keyring/keychain storage

        Returns
        -------
        str or None
            Authentication token if found, None otherwise.
        """
        # Check environment variables first
        token = os.environ.get("DATALAYER_API_KEY")
        if token:
            logger.debug("Token found in DATALAYER_API_KEY")
            return token

        token = os.environ.get("DATALAYER_EXTERNAL_TOKEN")
        if token:
            logger.debug("Token found in DATALAYER_EXTERNAL_TOKEN")
            return token

        # Check keyring if available
        if self.keyring_enabled:
            try:
                import keyring

                token = keyring.get_password(self.urls.run_url, "access_token")
                if token:
                    logger.debug(f"Token found in keyring for {self.urls.run_url}")
                    return token
            except Exception as e:
                logger.warning(f"Failed to retrieve token from keyring: {e}")

        logger.debug("No stored token found")
        return None

    def store_token(self, token: str) -> bool:
        """
        Store token in keyring if available.

        Parameters
        ----------
        token : str
            Authentication token to store.

        Returns
        -------
        bool
            True if stored successfully, False otherwise.
        """
        if not self.keyring_enabled:
            logger.debug("Keyring not available, cannot store token")
            return False

        try:
            import keyring

            keyring.set_password(self.urls.run_url, "access_token", token)
            logger.debug(f"Token stored in keyring for {self.urls.run_url}")
            return True
        except Exception as e:
            logger.warning(f"Failed to store token in keyring: {e}")
            return False

    def delete_token(self) -> bool:
        """
        Delete stored token from keyring.

        Returns
        -------
        bool
            True if deleted successfully, False otherwise.
        """
        if not self.keyring_enabled:
            logger.debug("Keyring not available, cannot delete token")
            return False

        try:
            import keyring

            keyring.delete_password(self.urls.run_url, "access_token")
            logger.debug(f"Token deleted from keyring for {self.urls.run_url}")
            return True
        except Exception as e:
            logger.warning(f"Failed to delete token from keyring: {e}")
            return False

    def logout(self) -> None:
        """
        Clear all stored authentication.

        Removes token from:
        - Keyring/keychain
        - Environment variables (DATALAYER_API_KEY, DATALAYER_EXTERNAL_TOKEN)
        """
        logger.info("Logging out - clearing stored authentication")

        # Clear environment variables
        if "DATALAYER_API_KEY" in os.environ:
            del os.environ["DATALAYER_API_KEY"]
            logger.debug("Cleared DATALAYER_API_KEY")

        if "DATALAYER_EXTERNAL_TOKEN" in os.environ:
            del os.environ["DATALAYER_EXTERNAL_TOKEN"]
            logger.debug("Cleared DATALAYER_EXTERNAL_TOKEN")

        # Clear keyring
        self.delete_token()

        logger.info("Logout complete")
