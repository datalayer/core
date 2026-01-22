# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""Authentication manager for Datalayer Core."""

from typing import Any, Dict, List, Optional, Tuple

import httpx

from .storage import FileStorage, KeyringStorage, TokenStorage
from .strategies import (
    AuthStrategy,
    BrowserAuthStrategy,
    CredentialsAuthStrategy,
    StorageAuthStrategy,
    TokenAuthStrategy,
)


class AuthenticationManager:
    """
    Authentication Manager for Datalayer Core.

    Provides a unified interface for all authentication methods using the strategy pattern.

    Examples
    --------
    >>> auth = AuthenticationManager("https://prod1.datalayer.run")
    >>> user, token = await auth.login(token="abc123")
    >>> user, token = await auth.login(handle="user", password="pass")
    >>> await auth.logout()
    """

    def __init__(self, iam_url: str, storage: Optional[TokenStorage] = None):
        """Initialize AuthenticationManager.

        Args:
            iam_url: IAM service URL (e.g., "https://prod1.datalayer.run")
            storage: Optional token storage backend. Defaults to auto-detected storage.
        """
        self.iam_url = iam_url

        # Extract run_url from iam_url (remove /api/iam/v1 suffix if present)
        run_url = iam_url.replace("/api/iam/v1", "")

        # CRITICAL: Pass run_url as service_name to KeyringStorage for backwards compatibility
        self.storage: TokenStorage
        if storage is None:
            keyring_storage = KeyringStorage(service_name=run_url)
            if keyring_storage.is_available():
                self.storage = keyring_storage
            else:
                self.storage = FileStorage()
        else:
            self.storage = storage

        self.current_user: Optional[Dict[str, Any]] = None
        self.current_token: Optional[str] = None

        # Initialize strategies
        self.strategies: List[AuthStrategy] = [
            TokenAuthStrategy(self.iam_url, self.storage),
            CredentialsAuthStrategy(self.iam_url, self.storage),
            StorageAuthStrategy(self.iam_url, self.storage),
            BrowserAuthStrategy(self.iam_url, self.storage),
        ]

    async def login(
        self,
        token: Optional[str] = None,
        handle: Optional[str] = None,
        password: Optional[str] = None,
        use_browser: bool = False,
        no_store: bool = False,
    ) -> Tuple[Dict[str, Any], str]:
        """
        Login using various authentication methods.

        Automatically selects the appropriate strategy based on provided options.

        Parameters
        ----------
        token : str, optional
            Existing authentication token.
        handle : str, optional
            User handle for credentials auth.
        password : str, optional
            Password for credentials auth.
        use_browser : bool, default False
            Use browser-based OAuth flow.
        no_store : bool, default False
            Don't store the token after authentication.

        Returns
        -------
        tuple of (dict, str)
            Tuple of (user_dict, token_string).

        Raises
        ------
        ValueError
            If no suitable authentication strategy found
        Exception
            If authentication fails

        Examples
        --------
        Token auth:

        >>> user, token = await auth.login(token="abc123")

        Credentials auth:

        >>> user, token = await auth.login(handle="user", password="pass")

        Storage auth (uses stored token):

        >>> user, token = await auth.login()
        """
        # Build kwargs for strategy selection
        kwargs = {
            "token": token,
            "handle": handle,
            "password": password,
            "use_browser": use_browser,
            "no_store": no_store,
        }

        # Find first strategy that can handle these options
        strategy = None
        for s in self.strategies:
            if s.can_handle(**kwargs):
                strategy = s
                break

        if not strategy:
            raise ValueError(
                "No authentication strategy found for the provided options. "
                "Please provide a token, credentials (handle + password), or use browser OAuth."
            )

        try:
            # Authenticate using the selected strategy
            user, token = await strategy.authenticate(**kwargs)

            # Cache user and token
            self.current_user = user
            self.current_token = token

            return user, token

        except Exception as error:
            # Clear cached data on failure
            self.current_user = None
            self.current_token = None
            raise

    async def logout(self) -> None:
        """
        Logout the current user.

        Calls the logout API and clears stored tokens.
        """
        if self.current_token:
            try:
                async with httpx.AsyncClient() as client:
                    await client.get(
                        f"{self.iam_url}/api/iam/v1/authentication/logout",
                        headers={"Authorization": f"Bearer {self.current_token}"},
                    )
            except Exception as error:
                # Continue with local cleanup even if API call fails
                print(f"Error during logout API call: {error}")

        # Clear stored data
        if self.storage:
            self.storage.clear()

        # Clear cached data
        self.current_user = None
        self.current_token = None

    async def whoami(self) -> Optional[Dict[str, Any]]:
        """
        Get the current user profile.

        Uses cached user if available, otherwise fetches from API using
        cached token or stored token.

        Returns
        -------
        dict or None
            User dictionary or None if not authenticated.
        """
        if self.current_user:
            return self.current_user

        # Try current token first
        if self.current_token:
            try:
                # Re-authenticate using current token
                user, _ = await self.login(token=self.current_token, no_store=True)
                return user
            except Exception:
                pass  # Continue to try stored token

        # Try stored token if no current token
        stored_token = self.get_stored_token()
        if stored_token:
            try:
                # Re-authenticate using stored token
                user, _ = await self.login(token=stored_token, no_store=True)
                return user
            except Exception:
                return None

        return None

    async def validate_token(self, token: str) -> Dict[str, Any]:
        """
        Validate a token.

        Checks if a token is valid by attempting to get the user profile.

        Parameters
        ----------
        token : str
            Token to validate.

        Returns
        -------
        dict
            Dictionary with 'valid' key and optionally 'user' or 'error' keys.

        Examples
        --------
        >>> result = await auth.validate_token("abc123")
        >>> if result['valid']:
        >>>     print(f"Token is valid for user: {result['user']}")
        """
        try:
            user, _ = await self.login(token=token, no_store=True)
            return {"valid": True, "user": user}
        except Exception as error:
            return {"valid": False, "error": str(error)}

    def get_stored_token(self) -> Optional[str]:
        """
        Get the stored token from storage.

        Returns
        -------
        str or None
            Stored token or None.
        """
        if not self.storage:
            return None
        return self.storage.get_token()

    def store_token(self, token: str) -> None:
        """
        Store a token in storage.

        Parameters
        ----------
        token : str
            Token to store.
        """
        if self.storage:
            self.storage.set_token(token)
        self.current_token = token

    def clear_stored_token(self) -> None:
        """
        Clear the stored token.
        """
        if self.storage:
            self.storage.delete_token()
        self.current_token = None

    def get_current_user(self) -> Optional[Dict[str, Any]]:
        """
        Get the current cached user.

        Returns
        -------
        dict or None
            User dictionary or None.
        """
        return self.current_user

    def get_current_token(self) -> Optional[str]:
        """
        Get the current token.

        Returns
        -------
        str or None
            Current token or None.
        """
        return self.current_token

    def is_authenticated(self) -> bool:
        """
        Check if user is currently authenticated.

        Returns
        -------
        bool
            True if user is authenticated.
        """
        return self.current_token is not None and self.current_user is not None
