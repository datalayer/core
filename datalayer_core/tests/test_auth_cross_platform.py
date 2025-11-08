# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""
Cross-platform authentication tests for keyring compatibility.

Tests authentication behavior across different platforms and keyring availability:
- macOS: Keychain backend
- Linux: SecretService/KWallet backends
- Windows: Windows Credential Locker
- No keyring: Fallback to environment variables only
"""

import os
import sys
from unittest.mock import Mock, patch

import pytest

from datalayer_core.auth.manager import AuthManager
from datalayer_core.client.client import DatalayerClient
from datalayer_core.utils.urls import DatalayerURLs


class TestCrossPlatformKeyring:
    """Test keyring behavior across different platforms and availability scenarios."""

    @pytest.fixture
    def urls(self):
        """Create URLs fixture."""
        return DatalayerURLs.from_environment()

    @pytest.fixture
    def clean_env(self):
        """
        Clean environment before each test.

        Yields
        ------
        None
            Yields control to the test, then restores environment.
        """
        old_env = os.environ.copy()
        # Remove any auth-related env vars
        for key in ["DATALAYER_API_KEY", "DATALAYER_EXTERNAL_TOKEN"]:
            os.environ.pop(key, None)
        yield
        # Restore original environment
        os.environ.clear()
        os.environ.update(old_env)

    def test_keyring_not_installed(self, urls, clean_env):
        """Test graceful degradation when keyring is not installed."""
        # Simulate keyring not being available
        with patch.dict(sys.modules, {"keyring": None}):
            # Force re-check of keyring availability
            auth_manager = AuthManager(urls)

            # Should detect keyring is not available
            assert auth_manager.keyring_enabled is False

            # Should still work with environment variables
            os.environ["DATALAYER_API_KEY"] = "test_token_123"
            token = auth_manager.get_stored_token()
            assert token == "test_token_123"

            # store_token should return False but not crash
            result = auth_manager.store_token("new_token")
            assert result is False

            # delete_token should return False but not crash
            result = auth_manager.delete_token()
            assert result is False

    def test_keyring_import_error(self, urls, clean_env):
        """Test handling when keyring import raises ImportError."""
        # Simpler approach - just set keyring to None in sys.modules
        # This will cause the import to fail in _check_keyring
        with patch.dict(sys.modules, {"keyring": None}):
            auth_manager = AuthManager(urls)
            assert auth_manager.keyring_enabled is False

    def test_keyring_runtime_error(self, urls, clean_env):
        """Test handling when keyring operations fail at runtime."""
        mock_keyring = Mock()

        # Simulate keyring operations failing
        mock_keyring.get_password.side_effect = RuntimeError(
            "Keyring backend unavailable"
        )
        mock_keyring.set_password.side_effect = RuntimeError(
            "Keyring backend unavailable"
        )
        mock_keyring.delete_password.side_effect = RuntimeError(
            "Keyring backend unavailable"
        )

        with patch.dict(sys.modules, {"keyring": mock_keyring}):
            auth_manager = AuthManager(urls)
            auth_manager.keyring_enabled = True  # Force enable

            # get_stored_token should handle error gracefully
            token = auth_manager.get_stored_token()
            assert token is None  # Should return None, not crash

            # store_token should return False on error
            result = auth_manager.store_token("test_token")
            assert result is False

            # delete_token should return False on error
            result = auth_manager.delete_token()
            assert result is False

    def test_keyring_permission_error(self, urls, clean_env):
        """Test handling when keyring operations fail due to permissions."""
        mock_keyring = Mock()

        # Simulate permission errors
        mock_keyring.set_password.side_effect = PermissionError("Access denied")
        mock_keyring.delete_password.side_effect = PermissionError("Access denied")

        with patch.dict(sys.modules, {"keyring": mock_keyring}):
            auth_manager = AuthManager(urls)
            auth_manager.keyring_enabled = True

            # Should handle permission errors gracefully
            result = auth_manager.store_token("test_token")
            assert result is False

            result = auth_manager.delete_token()
            assert result is False

    def test_env_vars_always_work(self, urls, clean_env):
        """Test that environment variables work regardless of keyring."""
        # Test with keyring disabled
        with patch.dict(sys.modules, {"keyring": None}):
            auth_manager = AuthManager(urls)

            # DATALAYER_API_KEY has highest priority
            os.environ["DATALAYER_API_KEY"] = "api_key_token"
            os.environ["DATALAYER_EXTERNAL_TOKEN"] = "external_token"

            token = auth_manager.get_stored_token()
            assert token == "api_key_token"

            # Remove API key, should fall back to external token
            del os.environ["DATALAYER_API_KEY"]
            token = auth_manager.get_stored_token()
            assert token == "external_token"

    def test_logout_clears_everything(self, urls, clean_env):
        """Test that logout clears both env vars and keyring."""
        mock_keyring = Mock()

        with patch.dict(sys.modules, {"keyring": mock_keyring}):
            auth_manager = AuthManager(urls)
            auth_manager.keyring_enabled = True

            # Set up env vars
            os.environ["DATALAYER_API_KEY"] = "test_token"
            os.environ["DATALAYER_EXTERNAL_TOKEN"] = "another_token"

            # Logout should clear everything
            auth_manager.logout()

            # Env vars should be gone
            assert "DATALAYER_API_KEY" not in os.environ
            assert "DATALAYER_EXTERNAL_TOKEN" not in os.environ

            # Keyring delete should have been called
            mock_keyring.delete_password.assert_called_once()

    def test_client_auto_discover_without_keyring(self, urls, clean_env):
        """Test DatalayerClient auto-discovery works without keyring."""
        with patch.dict(sys.modules, {"keyring": None}):
            # Should work with env var
            os.environ["DATALAYER_API_KEY"] = "test_token_456"

            with patch("datalayer_core.auth.manager.fetch") as mock_fetch:
                mock_fetch.return_value.json.return_value = {
                    "profile": {"handle_s": "testuser"}
                }

                client = DatalayerClient(urls=urls, auto_discover=True)
                # Token is stored in private _token attribute
                assert client._token == "test_token_456"

    def test_client_login_stores_token_only_when_keyring_available(
        self, urls, clean_env
    ):
        """Test that login attempts to store token only when keyring is available."""
        # Without keyring
        with patch.dict(sys.modules, {"keyring": None}):
            # Need to mock _get_profile as well since login_token calls it
            with patch.object(DatalayerClient, "_get_profile") as mock_profile:
                with patch("datalayer_core.auth.manager.fetch") as mock_fetch:
                    mock_fetch.return_value.json.return_value = {
                        "profile": {"handle_s": "testuser"}
                    }
                    mock_profile.return_value = {"profile": {"handle_s": "testuser"}}

                    client = DatalayerClient(urls=urls, auto_discover=False)
                    user_info = client.login_token("test_token")

                    # Should work fine, just won't store in keyring
                    assert user_info["handle_s"] == "testuser"
                    assert client._token == "test_token"

        # With keyring
        mock_keyring = Mock()
        with patch.dict(sys.modules, {"keyring": mock_keyring}):
            with patch.object(DatalayerClient, "_get_profile") as mock_profile:
                with patch("datalayer_core.auth.manager.fetch") as mock_fetch:
                    mock_fetch.return_value.json.return_value = {
                        "profile": {"handle_s": "testuser"}
                    }
                    mock_profile.return_value = {"profile": {"handle_s": "testuser"}}

                    client = DatalayerClient(urls=urls, auto_discover=False)
                    # Re-check keyring after patching
                    client.auth.keyring_enabled = True

                    user_info = client.login_token("test_token")

                    # Should store in keyring
                    mock_keyring.set_password.assert_called_once()

    def test_platform_specific_keyring_backends(self, urls, clean_env):
        """Test that different keyring backends are handled correctly."""
        # Mock different backend types
        backends = [
            "keyring.backends.macOS.Keyring",  # macOS Keychain
            "keyring.backends.Windows.WinVaultKeyring",  # Windows Credential Locker
            "keyring.backends.SecretService.Keyring",  # Linux GNOME
            "keyring.backends.kwallet.DBusKeyring",  # Linux KDE
            "keyring.backends.chainer.ChainerBackend",  # Fallback chainer
        ]

        for backend_name in backends:
            mock_keyring = Mock()
            mock_keyring.__class__.__name__ = backend_name.split(".")[-1]

            with patch.dict(sys.modules, {"keyring": mock_keyring}):
                auth_manager = AuthManager(urls)

                # Should work with any backend
                assert auth_manager.keyring_enabled is True

                # Basic operations should work
                mock_keyring.get_password.return_value = "stored_token"
                token = auth_manager.get_stored_token()
                assert token == "stored_token"

    def test_headless_linux_scenario(self, urls, clean_env):
        """Test authentication in headless Linux environment (Docker, CI/CD)."""
        # Simulate headless environment where keyring might not work
        mock_keyring = Mock()
        mock_keyring.get_password.side_effect = RuntimeError("No D-Bus session")
        mock_keyring.set_password.side_effect = RuntimeError("No D-Bus session")

        with patch.dict(sys.modules, {"keyring": mock_keyring}):
            auth_manager = AuthManager(urls)
            auth_manager.keyring_enabled = True

            # Should fall back to environment variables
            os.environ["DATALAYER_API_KEY"] = "ci_token"
            token = auth_manager.get_stored_token()
            assert token == "ci_token"

            # Store should fail gracefully
            result = auth_manager.store_token("new_token")
            assert result is False

    def test_readonly_keyring(self, urls, clean_env):
        """Test handling of read-only keyring access."""
        mock_keyring = Mock()

        # Can read but not write
        mock_keyring.get_password.return_value = "readonly_token"
        mock_keyring.set_password.side_effect = PermissionError("Read-only access")
        mock_keyring.delete_password.side_effect = PermissionError("Read-only access")

        with patch.dict(sys.modules, {"keyring": mock_keyring}):
            auth_manager = AuthManager(urls)
            auth_manager.keyring_enabled = True

            # Should be able to read
            token = auth_manager.get_stored_token()
            assert token == "readonly_token"

            # Write operations should fail gracefully
            result = auth_manager.store_token("new_token")
            assert result is False

            result = auth_manager.delete_token()
            assert result is False


class TestEnvironmentVariablePriority:
    """Test environment variable priority and behavior."""

    @pytest.fixture
    def urls(self):
        """Create URLs fixture."""
        return DatalayerURLs.from_environment()

    @pytest.fixture
    def clean_env(self):
        """
        Clean environment before each test.

        Yields
        ------
        None
            Yields control to the test, then restores environment.
        """
        old_env = os.environ.copy()
        for key in ["DATALAYER_API_KEY", "DATALAYER_EXTERNAL_TOKEN"]:
            os.environ.pop(key, None)
        yield
        os.environ.clear()
        os.environ.update(old_env)

    def test_priority_order(self, urls, clean_env):
        """Test that token sources are checked in correct priority order."""
        mock_keyring = Mock()
        mock_keyring.get_password.return_value = "keyring_token"

        with patch.dict(sys.modules, {"keyring": mock_keyring}):
            auth_manager = AuthManager(urls)
            auth_manager.keyring_enabled = True

            # Only keyring
            token = auth_manager.get_stored_token()
            assert token == "keyring_token"

            # Add EXTERNAL_TOKEN (higher priority than keyring)
            os.environ["DATALAYER_EXTERNAL_TOKEN"] = "external_token"
            token = auth_manager.get_stored_token()
            assert token == "external_token"

            # Add API_KEY (highest priority)
            os.environ["DATALAYER_API_KEY"] = "api_key_token"
            token = auth_manager.get_stored_token()
            assert token == "api_key_token"

    def test_empty_env_vars_treated_as_none(self, urls, clean_env):
        """Test that empty environment variables are not used as tokens."""
        mock_keyring = Mock()
        mock_keyring.get_password.return_value = "keyring_token"

        with patch.dict(sys.modules, {"keyring": mock_keyring}):
            auth_manager = AuthManager(urls)
            auth_manager.keyring_enabled = True

            # Empty string should fall through to keyring
            os.environ["DATALAYER_API_KEY"] = ""
            token = auth_manager.get_stored_token()
            # Empty strings are falsy in Python, so this should fall through
            assert token == "keyring_token"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
