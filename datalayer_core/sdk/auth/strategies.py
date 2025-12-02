# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""
Copyright (c) 2023-2025 Datalayer, Inc.

Datalayer License
"""

"""Authentication strategy implementations for Python SDK."""

from abc import ABC, abstractmethod
from typing import Any, Dict, Optional, Tuple

import httpx

from .storage import TokenStorage


class AuthStrategy(ABC):
    """Base authentication strategy interface."""

    def __init__(self, iam_url: str, storage: Optional[TokenStorage] = None):
        """Initialize strategy.

        Args:
            iam_url: IAM service URL
            storage: Optional token storage backend
        """
        self.iam_url = iam_url
        self.storage = storage

    @abstractmethod
    async def authenticate(self, **kwargs: Any) -> Tuple[Dict[str, Any], str]:
        """
        Authenticate and return (user, token) tuple.

        Returns
        -------
        tuple of (dict, str)
            Tuple of (user_dict, token_string).

        Raises
        ------
        Exception
            If authentication fails
        """
        pass

    @abstractmethod
    def can_handle(self, **kwargs: Any) -> bool:
        """
        Check if this strategy can handle the given options.

        Returns
        -------
        bool
            True if this strategy can authenticate with given options.
        """
        pass

    async def _validate_token(self, token: str) -> Dict[str, Any]:
        """
        Validate a token by calling whoami API.

        Parameters
        ----------
        token : str
            Token to validate.

        Returns
        -------
        dict
            User dictionary.

        Raises
        ------
        Exception
            If token is invalid
        """
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.iam_url}/api/iam/v1/whoami",
                headers={"Authorization": f"Bearer {token}"},
            )
            response.raise_for_status()
            data = response.json()

            # The whoami endpoint returns {success, message, profile}
            if not data or "profile" not in data:
                raise ValueError("Invalid response from whoami API")

            return data["profile"]


class TokenAuthStrategy(AuthStrategy):
    """Token-based authentication strategy."""

    def can_handle(self, **kwargs: Any) -> bool:
        """Check if token is provided."""
        return "token" in kwargs and kwargs["token"] is not None

    async def authenticate(self, **kwargs: Any) -> Tuple[Dict[str, Any], str]:
        """Authenticate using existing token."""
        token = kwargs.get("token")
        if not token:
            raise ValueError("Token is required for token authentication")

        # Validate the token
        user = await self._validate_token(token)

        # Store token if requested
        no_store = kwargs.get("no_store", False)
        if not no_store and self.storage:
            self.storage.set_token(token)

        return user, token


class CredentialsAuthStrategy(AuthStrategy):
    """Credentials-based authentication strategy."""

    def can_handle(self, **kwargs: Any) -> bool:
        """Check if handle and password are provided."""
        return (
            "handle" in kwargs
            and kwargs["handle"]
            and "password" in kwargs
            and kwargs["password"]
        )

    async def authenticate(self, **kwargs: Any) -> Tuple[Dict[str, Any], str]:
        """Authenticate using handle and password."""
        handle = kwargs.get("handle")
        password = kwargs.get("password")

        if not handle or not password:
            raise ValueError(
                "Handle and password are required for credentials authentication"
            )

        # Call login API
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.iam_url}/api/iam/v1/authentication/login",
                json={"handle": handle, "password": password},
            )
            response.raise_for_status()
            data = response.json()

            if not data or not data.get("success") or not data.get("token"):
                raise ValueError(data.get("message", "Login failed"))

            token = data["token"]

        # Get user profile
        user = await self._validate_token(token)

        # Store token if requested
        no_store = kwargs.get("no_store", False)
        if not no_store and self.storage:
            self.storage.set_token(token)

        return user, token


class StorageAuthStrategy(AuthStrategy):
    """Storage-based authentication strategy."""

    def can_handle(self, **kwargs: Any) -> bool:
        """Check if storage has a token."""
        if not self.storage or not self.storage.is_available():
            return False
        token = self.storage.get_token()
        return token is not None

    async def authenticate(self, **kwargs: Any) -> Tuple[Dict[str, Any], str]:
        """Authenticate using token from storage."""
        if not self.storage:
            raise ValueError("Storage is required for storage-based authentication")

        token = self.storage.get_token()
        if not token:
            raise ValueError("No token found in storage")

        # Validate the token
        user = await self._validate_token(token)

        return user, token


class BrowserAuthStrategy(AuthStrategy):
    """Browser OAuth authentication strategy."""

    def can_handle(self, **kwargs: Any) -> bool:
        """Check if browser auth is requested."""
        return kwargs.get("use_browser", False)

    async def authenticate(self, **kwargs: Any) -> Tuple[Dict[str, Any], str]:
        """Authenticate using browser OAuth flow."""
        # TODO: Implement browser OAuth flow
        # This would involve:
        # 1. Starting local HTTP server
        # 2. Opening browser with OAuth URL
        # 3. Handling callback with authorization code
        # 4. Exchanging code for token
        raise NotImplementedError("Browser OAuth authentication not yet implemented")
