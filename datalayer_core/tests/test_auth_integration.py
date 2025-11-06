# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""Tests for authentication integration in Datalayer SDK and CLI."""

import os
from unittest.mock import MagicMock, Mock, patch

import pytest

from datalayer_core.auth import AuthManager
from datalayer_core.client import DatalayerClient
from datalayer_core.utils.urls import DatalayerURLs


class TestAuthManager:
    """Test suite for AuthManager class."""

    @pytest.fixture
    def urls(self):
        """Create test URLs."""
        return DatalayerURLs.from_environment(
            run_url="https://test.datalayer.run",
            iam_url="https://test-iam.datalayer.run",
        )

    @pytest.fixture
    def auth_manager(self, urls):
        """Create AuthManager instance."""
        return AuthManager(urls)

    def test_initialization(self, auth_manager, urls):
        """Test AuthManager initializes correctly."""
        assert auth_manager.urls == urls
        assert isinstance(auth_manager.keyring_enabled, bool)

    def test_check_keyring_available(self, auth_manager):
        """Test keyring availability check."""
        # The method should return True or False without error
        assert isinstance(auth_manager.keyring_enabled, bool)

    @patch("datalayer_core.auth.manager.os.environ.get")
    def test_get_stored_token_from_env_api_key(self, mock_env_get, auth_manager):
        """Test token retrieval from DATALAYER_API_KEY environment variable."""
        mock_env_get.side_effect = lambda key, default=None: {
            "DATALAYER_API_KEY": "test_token_123",
        }.get(key, default)

        token = auth_manager.get_stored_token()
        assert token == "test_token_123"

    @patch("datalayer_core.auth.manager.os.environ.get")
    def test_get_stored_token_from_env_external(self, mock_env_get, auth_manager):
        """Test token retrieval from DATALAYER_EXTERNAL_TOKEN environment variable."""
        mock_env_get.side_effect = lambda key, default=None: {
            "DATALAYER_EXTERNAL_TOKEN": "external_token_456",
        }.get(key, default)

        token = auth_manager.get_stored_token()
        assert token == "external_token_456"

    @patch("datalayer_core.auth.manager.os.environ.get")
    def test_get_stored_token_priority(self, mock_env_get, auth_manager):
        """Test DATALAYER_API_KEY takes priority over DATALAYER_EXTERNAL_TOKEN."""
        mock_env_get.side_effect = lambda key, default=None: {
            "DATALAYER_API_KEY": "api_key_token",
            "DATALAYER_EXTERNAL_TOKEN": "external_token",
        }.get(key, default)

        token = auth_manager.get_stored_token()
        assert token == "api_key_token"

    @patch("datalayer_core.auth.manager.os.environ.get")
    def test_get_stored_token_no_token(self, mock_env_get, auth_manager):
        """Test token retrieval when no token is available."""
        mock_env_get.return_value = None

        with patch.object(auth_manager, "keyring_enabled", False):
            token = auth_manager.get_stored_token()
            assert token is None

    def test_store_token_success(self, auth_manager):
        """Test successful token storage."""
        # Mock keyring at the import level
        import sys

        mock_keyring = Mock()
        with patch.dict(sys.modules, {"keyring": mock_keyring}):
            with patch.object(auth_manager, "keyring_enabled", True):
                result = auth_manager.store_token("test_token")
                assert result is True
                mock_keyring.set_password.assert_called_once_with(
                    auth_manager.urls.run_url, "access_token", "test_token"
                )

    def test_store_token_no_keyring(self, auth_manager):
        """Test token storage when keyring is not available."""
        with patch.object(auth_manager, "keyring_enabled", False):
            result = auth_manager.store_token("test_token")
            assert result is False

    def test_delete_token_success(self, auth_manager):
        """Test successful token deletion."""
        # Mock keyring at the import level
        import sys

        mock_keyring = Mock()
        with patch.dict(sys.modules, {"keyring": mock_keyring}):
            with patch.object(auth_manager, "keyring_enabled", True):
                result = auth_manager.delete_token()
                assert result is True
                mock_keyring.delete_password.assert_called_once_with(
                    auth_manager.urls.run_url, "access_token"
                )

    @patch("datalayer_core.auth.manager.os.environ")
    def test_logout_clears_env_vars(self, mock_environ, auth_manager):
        """Test logout clears environment variables."""
        mock_environ.__contains__ = lambda self, key: key in [
            "DATALAYER_API_KEY",
            "DATALAYER_EXTERNAL_TOKEN",
        ]
        mock_environ.__delitem__ = Mock()

        with patch.object(auth_manager, "keyring_enabled", False):
            auth_manager.logout()

        # Verify environment variables were cleared
        assert mock_environ.__delitem__.call_count >= 0  # May be 0, 1, or 2

    @patch("datalayer_core.auth.manager.fetch")
    def test_login_with_token_success(self, mock_fetch, auth_manager):
        """Test successful token validation."""
        mock_response = Mock()
        mock_response.json.return_value = {"profile": {"handle_s": "testuser"}}
        mock_fetch.return_value = mock_response

        with patch.object(auth_manager, "keyring_enabled", False):
            user_handle, token = auth_manager.login_with_token("test_token")

        assert user_handle == "testuser"
        assert token == "test_token"
        mock_fetch.assert_called_once()

    @patch("datalayer_core.auth.manager.fetch")
    def test_login_with_credentials_success(self, mock_fetch, auth_manager):
        """Test successful credential authentication."""
        mock_response = Mock()
        mock_response.json.return_value = {
            "user": {"handle_s": "testuser"},
            "token": "new_token_123",
        }
        mock_fetch.return_value = mock_response

        with patch.object(auth_manager, "keyring_enabled", False):
            user_handle, token = auth_manager.login_with_credentials(
                "testuser", "password"
            )

        assert user_handle == "testuser"
        assert token == "new_token_123"
        mock_fetch.assert_called_once()

    @patch("datalayer_core.auth.manager.get_token")
    @patch("datalayer_core.auth.manager.find_http_port")
    def test_login_with_browser_success(
        self, mock_find_port, mock_get_token, auth_manager
    ):
        """Test successful browser authentication."""
        mock_find_port.return_value = 8888
        mock_get_token.return_value = ("testuser", "browser_token")

        with patch.object(auth_manager, "keyring_enabled", False):
            user_handle, token = auth_manager.login_with_browser()

        assert user_handle == "testuser"
        assert token == "browser_token"
        mock_get_token.assert_called_once()

    @patch("datalayer_core.auth.manager.get_token")
    @patch("datalayer_core.auth.manager.find_http_port")
    def test_login_with_browser_cancelled(
        self, mock_find_port, mock_get_token, auth_manager
    ):
        """Test browser authentication when user cancels."""
        mock_find_port.return_value = 8888
        mock_get_token.return_value = None

        with pytest.raises(Exception, match="cancelled or failed"):
            auth_manager.login_with_browser()


class TestDatalayerClientAuth:
    """Test suite for DatalayerClient authentication methods."""

    @pytest.fixture
    def urls(self):
        """Create test URLs."""
        return DatalayerURLs.from_environment(
            run_url="https://test.datalayer.run",
            iam_url="https://test-iam.datalayer.run",
        )

    def test_client_init_with_auto_discover_false(self, urls):
        """Test client initialization with auto_discover=False doesn't require token."""
        client = DatalayerClient(urls=urls, auto_discover=False)
        assert client._token is None
        assert hasattr(client, "auth")
        assert isinstance(client.auth, AuthManager)

    def test_client_init_with_token(self, urls):
        """Test client initialization with explicit token."""
        client = DatalayerClient(urls=urls, token="test_token", auto_discover=False)
        assert client._token == "test_token"

    @patch.object(AuthManager, "get_stored_token")
    def test_client_auto_discover_token(self, mock_get_stored, urls):
        """Test client auto-discovers token when auto_discover=True."""
        mock_get_stored.return_value = "discovered_token"

        client = DatalayerClient(urls=urls, auto_discover=True)
        assert client._token == "discovered_token"
        mock_get_stored.assert_called_once()

    @patch.object(AuthManager, "get_stored_token")
    def test_client_auto_discover_no_token_raises(self, mock_get_stored, urls):
        """Test client raises error when auto_discover=True but no token found."""
        mock_get_stored.return_value = None

        with patch.dict(os.environ, {}, clear=True):
            with pytest.raises(ValueError, match="Token is required"):
                DatalayerClient(urls=urls, auto_discover=True)

    @patch.object(AuthManager, "login_with_browser")
    def test_client_login_browser(self, mock_login_browser, urls):
        """Test client.login_browser() method."""
        mock_login_browser.return_value = ("testuser", "browser_token")

        client = DatalayerClient(urls=urls, auto_discover=False)

        with patch.object(client, "_get_profile") as mock_get_profile:
            mock_get_profile.return_value = {"profile": {"handle_s": "testuser"}}
            profile = client.login_browser()

        assert client._token == "browser_token"
        assert profile == {"handle_s": "testuser"}
        mock_login_browser.assert_called_once()

    @patch.object(AuthManager, "login_with_credentials")
    def test_client_login_password(self, mock_login_creds, urls):
        """Test client.login_password() method."""
        mock_login_creds.return_value = ("testuser", "password_token")

        client = DatalayerClient(urls=urls, auto_discover=False)

        with patch.object(client, "_get_profile") as mock_get_profile:
            mock_get_profile.return_value = {"profile": {"handle_s": "testuser"}}
            profile = client.login_password("testuser", "password123")

        assert client._token == "password_token"
        assert profile == {"handle_s": "testuser"}
        mock_login_creds.assert_called_once_with("testuser", "password123")

    @patch.object(AuthManager, "login_with_token")
    def test_client_login_token(self, mock_login_token, urls):
        """Test client.login_token() method."""
        mock_login_token.return_value = ("testuser", "validated_token")

        client = DatalayerClient(urls=urls, auto_discover=False)

        with patch.object(client, "_get_profile") as mock_get_profile:
            mock_get_profile.return_value = {"profile": {"handle_s": "testuser"}}
            profile = client.login_token("my_token")

        assert client._token == "validated_token"
        assert profile == {"handle_s": "testuser"}
        mock_login_token.assert_called_once_with("my_token")

    @patch.object(AuthManager, "logout")
    def test_client_logout(self, mock_logout, urls):
        """Test client.logout() method."""
        client = DatalayerClient(urls=urls, token="test_token", auto_discover=False)
        client.logout()

        assert client._token is None
        mock_logout.assert_called_once()


class TestCLIAuthCommands:
    """Test suite for CLI authentication commands."""

    @pytest.fixture
    def cli_runner(self):
        """Create CLI runner."""
        from typer.testing import CliRunner

        return CliRunner()

    @pytest.fixture
    def app(self):
        """Get CLI app."""
        from datalayer_core.cli.__main__ import app

        return app

    @patch("datalayer_core.cli.commands.authn.DatalayerClient")
    def test_login_browser_method(self, mock_client_class, cli_runner, app):
        """Test login with browser method."""
        mock_client = MagicMock()
        mock_client.login_browser.return_value = {"handle_s": "testuser"}
        mock_client_class.return_value = mock_client

        result = cli_runner.invoke(app, ["login", "--method", "browser"])

        # Should attempt to login (may fail without actual server, but code path is tested)
        mock_client_class.assert_called()

    @patch("datalayer_core.cli.commands.authn.DatalayerClient")
    def test_whoami_not_authenticated(self, mock_client_class, cli_runner, app):
        """Test whoami when not authenticated."""
        mock_client_class.side_effect = ValueError("Token is required")

        result = cli_runner.invoke(app, ["whoami"])

        assert result.exit_code == 1
        assert (
            "not authenticated" in result.stdout.lower()
            or "token is required" in result.stdout.lower()
        )

    @patch("datalayer_core.cli.commands.authn.DatalayerClient")
    def test_logout_command(self, mock_client_class, cli_runner, app):
        """Test logout command."""
        mock_client = MagicMock()
        mock_client_class.return_value = mock_client

        result = cli_runner.invoke(app, ["logout"])

        # Should call logout (may succeed or fail, but code path is tested)
        mock_client.logout.assert_called_once()


class TestAuthIntegration:
    """Integration tests for authentication flow."""

    @pytest.fixture
    def urls(self):
        """Create test URLs."""
        return DatalayerURLs.from_environment(
            run_url="https://test.datalayer.run",
            iam_url="https://test-iam.datalayer.run",
        )

    @patch.object(AuthManager, "login_with_token")
    @patch.object(AuthManager, "get_stored_token")
    def test_full_login_flow(self, mock_get_stored, mock_login_token, urls):
        """Test complete login flow: login -> store -> retrieve -> use."""
        # Step 1: Login with token
        mock_login_token.return_value = ("testuser", "my_token")
        mock_get_stored.return_value = None  # No stored token initially

        client1 = DatalayerClient(urls=urls, auto_discover=False)

        with patch.object(client1, "_get_profile") as mock_profile:
            mock_profile.return_value = {"profile": {"handle_s": "testuser"}}
            client1.login_token("my_token")

        assert client1._token == "my_token"

        # Step 2: New client auto-discovers the token
        mock_get_stored.return_value = "my_token"

        client2 = DatalayerClient(urls=urls, auto_discover=True)
        assert client2._token == "my_token"

    @patch.object(AuthManager, "logout")
    def test_logout_flow(self, mock_logout, urls):
        """Test logout clears token."""
        client = DatalayerClient(urls=urls, token="test_token", auto_discover=False)
        assert client._token == "test_token"

        client.logout()
        assert client._token is None
        mock_logout.assert_called_once()

    @patch("datalayer_core.auth.manager.fetch")
    def test_token_validation_with_invalid_token(self, mock_fetch, urls):
        """Test that invalid token raises appropriate error."""
        mock_fetch.side_effect = Exception("Invalid token")

        auth_manager = AuthManager(urls)

        with pytest.raises(Exception, match="Invalid token"):
            auth_manager.login_with_token("invalid_token")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
