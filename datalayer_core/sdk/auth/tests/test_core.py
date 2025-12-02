# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.
"""Tests for AuthenticationManager core functionality."""

from unittest.mock import AsyncMock, patch

import pytest

from datalayer_core.sdk.auth.core import AuthenticationManager
from datalayer_core.sdk.auth.storage import EnvironmentStorage


class TestAuthenticationManager:
    """Tests for AuthenticationManager."""

    def test_initialization(self) -> None:
        """Test manager initialization."""
        auth = AuthenticationManager("https://test.datalayer.run")
        assert auth.iam_url == "https://test.datalayer.run"
        assert auth.storage is not None
        assert len(auth.strategies) > 0

    def test_initialization_with_custom_storage(self) -> None:
        """Test initialization with custom storage."""
        storage = EnvironmentStorage()
        auth = AuthenticationManager("https://test.datalayer.run", storage=storage)
        assert auth.storage == storage

    def test_get_current_user_when_not_authenticated(self) -> None:
        """Test getting user when not authenticated."""
        auth = AuthenticationManager("https://test.datalayer.run")
        assert auth.get_current_user() is None

    def test_get_current_token_when_not_authenticated(self) -> None:
        """Test getting token when not authenticated."""
        auth = AuthenticationManager("https://test.datalayer.run")
        assert auth.get_current_token() is None

    def test_is_authenticated_when_not_authenticated(self) -> None:
        """Test authentication check when not authenticated."""
        auth = AuthenticationManager("https://test.datalayer.run")
        assert not auth.is_authenticated()

    def test_store_token(self) -> None:
        """Test storing token."""
        storage = EnvironmentStorage(prefix="TEST_AUTH_")
        auth = AuthenticationManager("https://test.datalayer.run", storage=storage)

        auth.store_token("test-token")
        assert auth.get_current_token() == "test-token"
        assert storage.get("access_token") == "test-token"

        # Cleanup
        storage.clear()

    def test_clear_stored_token(self) -> None:
        """Test clearing stored token."""
        storage = EnvironmentStorage(prefix="TEST_AUTH_")
        auth = AuthenticationManager("https://test.datalayer.run", storage=storage)

        auth.store_token("test-token")
        auth.clear_stored_token()

        assert auth.get_current_token() is None
        assert storage.get("access_token") is None

    def test_get_stored_token(self) -> None:
        """Test getting stored token."""
        storage = EnvironmentStorage(prefix="TEST_AUTH_")
        auth = AuthenticationManager("https://test.datalayer.run", storage=storage)

        storage.set("access_token", "stored-token")
        assert auth.get_stored_token() == "stored-token"

        # Cleanup
        storage.clear()

    @pytest.mark.asyncio
    async def test_login_without_options_raises_error(self) -> None:
        """Test login without any options raises error."""
        auth = AuthenticationManager("https://test.datalayer.run")

        with pytest.raises(ValueError, match="No authentication strategy found"):
            await auth.login()

    @pytest.mark.asyncio
    async def test_logout_calls_api_and_clears_storage(self) -> None:
        """Test logout calls API and clears storage."""
        storage = EnvironmentStorage(prefix="TEST_AUTH_")
        auth = AuthenticationManager("https://test.datalayer.run", storage=storage)

        # Set up initial state
        auth.current_token = "test-token"
        auth.current_user = {"handle": "testuser"}
        storage.set("access_token", "test-token")

        # Mock the httpx client
        with patch("datalayer_core.sdk.auth.core.httpx.AsyncClient") as mock_client:
            mock_instance = AsyncMock()
            mock_client.return_value.__aenter__.return_value = mock_instance

            await auth.logout()

            # Check API was called
            assert mock_instance.get.called

        # Check state was cleared
        assert auth.current_token is None
        assert auth.current_user is None
        assert storage.get("access_token") is None

    @pytest.mark.asyncio
    async def test_whoami_returns_none_when_not_authenticated(self) -> None:
        """Test whoami returns None when not authenticated."""
        auth = AuthenticationManager("https://test.datalayer.run")
        result = await auth.whoami()
        assert result is None
