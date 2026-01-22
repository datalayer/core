# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.
"""Tests for token storage backends."""

import os
import tempfile
from pathlib import Path

from datalayer_core.authn.storage import (
    EnvironmentStorage,
    FileStorage,
    KeyringStorage,
    get_default_storage,
)


class TestEnvironmentStorage:
    """Tests for EnvironmentStorage."""

    def test_is_available(self) -> None:
        """Test storage is always available."""
        storage = EnvironmentStorage()
        assert storage.is_available()

    def test_set_and_get(self) -> None:
        """Test setting and getting values."""
        storage = EnvironmentStorage(prefix="TEST_")
        storage.set("token", "test-value")
        assert storage.get("token") == "test-value"

        # Cleanup
        storage.delete("token")

    def test_delete(self) -> None:
        """Test deleting values."""
        storage = EnvironmentStorage(prefix="TEST_")
        storage.set("token", "test-value")
        storage.delete("token")
        assert storage.get("token") is None

    def test_get_token_from_api_key(self) -> None:
        """Test getting token from DATALAYER_API_KEY."""
        os.environ["DATALAYER_API_KEY"] = "api-key-token"
        storage = EnvironmentStorage()

        try:
            assert storage.get_token() == "api-key-token"
        finally:
            os.environ.pop("DATALAYER_API_KEY", None)

    def test_clear(self) -> None:
        """Test clearing token."""
        storage = EnvironmentStorage(prefix="TEST_")
        storage.set_token("test-token")
        storage.clear()
        assert storage.get_token() is None


class TestFileStorage:
    """Tests for FileStorage."""

    def test_is_available(self) -> None:
        """Test storage is always available."""
        with tempfile.TemporaryDirectory() as tmpdir:
            storage = FileStorage(config_dir=Path(tmpdir))
            assert storage.is_available()

    def test_set_and_get(self) -> None:
        """Test setting and getting values."""
        with tempfile.TemporaryDirectory() as tmpdir:
            storage = FileStorage(config_dir=Path(tmpdir))
            storage.set("token", "test-value")
            assert storage.get("token") == "test-value"

    def test_delete(self) -> None:
        """Test deleting values."""
        with tempfile.TemporaryDirectory() as tmpdir:
            storage = FileStorage(config_dir=Path(tmpdir))
            storage.set("token", "test-value")
            storage.delete("token")
            assert storage.get("token") is None

    def test_clear(self) -> None:
        """Test clearing all data."""
        with tempfile.TemporaryDirectory() as tmpdir:
            storage = FileStorage(config_dir=Path(tmpdir))
            storage.set_token("test-token")
            storage.set("other-key", "other-value")
            storage.clear()

            # File should be deleted
            assert not storage.config_file.exists()

    def test_token_methods(self) -> None:
        """Test token-specific methods."""
        with tempfile.TemporaryDirectory() as tmpdir:
            storage = FileStorage(config_dir=Path(tmpdir))

            # Set token
            storage.set_token("my-token")
            assert storage.get_token() == "my-token"

            # Delete token
            storage.delete_token()
            assert storage.get_token() is None

    def test_file_permissions(self) -> None:
        """Test that config file has secure permissions."""
        with tempfile.TemporaryDirectory() as tmpdir:
            storage = FileStorage(config_dir=Path(tmpdir))
            storage.set_token("test-token")

            # Check file exists and has 600 permissions
            assert storage.config_file.exists()
            stat = storage.config_file.stat()
            # Permissions should be 0o600 (user read/write only)
            assert stat.st_mode & 0o777 == 0o600


class TestKeyringStorage:
    """Tests for KeyringStorage."""

    def test_is_available(self) -> None:
        """Test availability detection."""
        storage = KeyringStorage()
        # Availability depends on whether keyring is installed
        assert isinstance(storage.is_available(), bool)

    def test_graceful_fallback_without_keyring(self) -> None:
        """Test graceful handling when keyring is not available."""
        storage = KeyringStorage()

        if not storage.is_available():
            # Should not raise errors
            storage.set("token", "test-value")
            assert storage.get("token") is None
            storage.delete("token")  # Should not raise


class TestGetDefaultStorage:
    """Tests for get_default_storage function."""

    def test_returns_storage(self) -> None:
        """Test that it returns a storage instance."""
        storage = get_default_storage()
        assert storage is not None
        assert storage.is_available()

    def test_storage_works(self) -> None:
        """Test that returned storage is functional."""
        storage = get_default_storage()
        storage.set_token("test-token")

        # Should be able to retrieve it (or at least not error)
        token = storage.get_token()

        # Cleanup
        storage.clear()
