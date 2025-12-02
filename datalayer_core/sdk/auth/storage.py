# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.


"""Token storage backend implementations for Python SDK."""

import json
import os
from abc import ABC, abstractmethod
from pathlib import Path
from typing import Any, Dict, Optional


class TokenStorage(ABC):
    """Abstract base class for token storage backends."""

    @abstractmethod
    def get(self, key: str) -> Optional[str]:
        """Get value from storage."""
        pass

    @abstractmethod
    def set(self, key: str, value: str) -> None:
        """Set value in storage."""
        pass

    @abstractmethod
    def delete(self, key: str) -> None:
        """Delete value from storage."""
        pass

    @abstractmethod
    def is_available(self) -> bool:
        """Check if storage backend is available."""
        pass

    def get_token(self) -> Optional[str]:
        """Get stored authentication token."""
        return self.get("access_token")

    def set_token(self, token: str) -> None:
        """Store authentication token."""
        self.set("access_token", token)

    def delete_token(self) -> None:
        """Delete authentication token."""
        self.delete("access_token")

    def clear(self) -> None:
        """Clear all authentication data."""
        self.delete_token()


class KeyringStorage(TokenStorage):
    """System keyring-based token storage using keyring library."""

    def __init__(self, service_name: str = "https://prod1.datalayer.run"):
        """Initialize keyring storage.

        Args:
            service_name: Service name for keyring entries (MUST be run_url for backwards compatibility)
        """
        self.service_name = service_name
        self._keyring: Any = None
        try:
            import keyring

            self._keyring = keyring
        except ImportError:
            # keyring is optional; if not available, this storage backend will be disabled
            pass

    def is_available(self) -> bool:
        """Check if keyring is available."""
        return self._keyring is not None

    def get(self, key: str) -> Optional[str]:
        """Get value from keyring."""
        if not self.is_available():
            return None
        try:
            return self._keyring.get_password(self.service_name, key)
        except Exception:
            return None

    def set(self, key: str, value: str) -> None:
        """Set value in keyring."""
        if not self.is_available():
            return
        try:
            self._keyring.set_password(self.service_name, key, value)
        except Exception:
            pass

    def delete(self, key: str) -> None:
        """Delete value from keyring."""
        if not self.is_available():
            return
        try:
            self._keyring.delete_password(self.service_name, key)
        except Exception:
            pass


class EnvironmentStorage(TokenStorage):
    """Environment variable-based token storage."""

    def __init__(self, prefix: str = "DATALAYER_"):
        """Initialize environment storage.

        Args:
            prefix: Prefix for environment variable names
        """
        self.prefix = prefix

    def is_available(self) -> bool:
        """Environment storage is always available."""
        return True

    def get(self, key: str) -> Optional[str]:
        """Get value from environment variable."""
        env_key = f"{self.prefix}{key.upper()}"
        return os.environ.get(env_key)

    def set(self, key: str, value: str) -> None:
        """Set value in environment variable."""
        env_key = f"{self.prefix}{key.upper()}"
        os.environ[env_key] = value

    def delete(self, key: str) -> None:
        """Delete value from environment variable."""
        env_key = f"{self.prefix}{key.upper()}"
        os.environ.pop(env_key, None)

    def get_token(self) -> Optional[str]:
        """Get token from DATALAYER_API_KEY or DATALAYER_TOKEN."""
        return os.environ.get("DATALAYER_API_KEY") or self.get("access_token")


class FileStorage(TokenStorage):
    """File-based token storage with JSON format."""

    def __init__(self, config_dir: Optional[Path] = None):
        """Initialize file storage.

        Args:
            config_dir: Directory for config files. Defaults to ~/.datalayer
        """
        if config_dir is None:
            config_dir = Path.home() / ".datalayer"
        self.config_dir = Path(config_dir)
        self.config_file = self.config_dir / "auth.json"

    def is_available(self) -> bool:
        """File storage is always available."""
        return True

    def _load_data(self) -> Dict[str, Any]:
        """Load data from config file."""
        if not self.config_file.exists():
            return {}
        try:
            with open(self.config_file, "r") as f:
                return json.load(f)
        except Exception:
            return {}

    def _save_data(self, data: Dict[str, Any]) -> None:
        """Save data to config file."""
        self.config_dir.mkdir(parents=True, exist_ok=True)
        try:
            with open(self.config_file, "w") as f:
                json.dump(data, f, indent=2)
            # Set file permissions to user-only (600)
            os.chmod(self.config_file, 0o600)
        except Exception:
            pass

    def get(self, key: str) -> Optional[str]:
        """Get value from file."""
        data = self._load_data()
        return data.get(key)

    def set(self, key: str, value: str) -> None:
        """Set value in file."""
        data = self._load_data()
        data[key] = value
        self._save_data(data)

    def delete(self, key: str) -> None:
        """Delete value from file."""
        data = self._load_data()
        data.pop(key, None)
        self._save_data(data)

    def clear(self) -> None:
        """Clear all data from file."""
        if self.config_file.exists():
            try:
                self.config_file.unlink()
            except Exception:
                pass


def get_default_storage() -> TokenStorage:
    """
    Get the default storage backend for the current environment.

    Returns
    -------
    TokenStorage
        The appropriate storage backend.
    """
    # Try keyring first (most secure)
    keyring_storage = KeyringStorage()
    if keyring_storage.is_available():
        return keyring_storage

    # Fall back to file storage
    return FileStorage()
