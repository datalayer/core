# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""
User configuration persistence for Datalayer Core.

Stores user preferences (IAM URL, Runtimes URL, etc.) in ~/.datalayer/config.json.
"""

import json
import os
from pathlib import Path
from typing import Any, Dict, Optional

DEFAULT_IAM_URL = "https://prod1.datalayer.run"
DEFAULT_RUNTIMES_URL = "https://prod1.datalayer.run"

CONFIG_DIR = Path.home() / ".datalayer"
CONFIG_FILE = CONFIG_DIR / "config.json"


def _load_config() -> Dict[str, Any]:
    """
    Load user configuration from ~/.datalayer/config.json.

    Returns
    -------
    dict
        The configuration dictionary. Empty dict if file doesn't exist or is invalid.
    """
    if not CONFIG_FILE.exists():
        return {}
    try:
        with open(CONFIG_FILE, "r") as f:
            return json.load(f)
    except Exception:
        return {}


def _save_config(config: Dict[str, Any]) -> None:
    """
    Save user configuration to ~/.datalayer/config.json.

    Parameters
    ----------
    config : dict
        The configuration dictionary to save.
    """
    CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    with open(CONFIG_FILE, "w") as f:
        json.dump(config, f, indent=2)
    # Set file permissions to user-only (600)
    os.chmod(CONFIG_FILE, 0o600)


def get_config() -> Dict[str, Any]:
    """
    Get the full user configuration.

    Returns
    -------
    dict
        The configuration dictionary with all stored values.
    """
    return _load_config()


def get_iam_url() -> Optional[str]:
    """
    Get the configured IAM URL.

    Returns
    -------
    Optional[str]
        The IAM URL from the config file, or None if not explicitly set.
    """
    config = _load_config()
    return config.get("iam_url")


def get_runtimes_url() -> Optional[str]:
    """
    Get the configured Runtimes URL.

    Returns
    -------
    Optional[str]
        The Runtimes URL from the config file, or None if not explicitly set.
    """
    config = _load_config()
    return config.get("runtimes_url")


def set_iam_url(url: str) -> None:
    """
    Set the IAM URL in the config file.

    Parameters
    ----------
    url : str
        The IAM URL to store.
    """
    config = _load_config()
    config["iam_url"] = url.rstrip("/")
    _save_config(config)


def set_runtimes_url(url: str) -> None:
    """
    Set the Runtimes URL in the config file.

    Parameters
    ----------
    url : str
        The Runtimes URL to store.
    """
    config = _load_config()
    config["runtimes_url"] = url.rstrip("/")
    _save_config(config)


def set_config(iam_url: Optional[str] = None, runtimes_url: Optional[str] = None) -> None:
    """
    Set multiple config values at once.

    Parameters
    ----------
    iam_url : Optional[str]
        The IAM URL to store.
    runtimes_url : Optional[str]
        The Runtimes URL to store.
    """
    config = _load_config()
    if iam_url is not None:
        config["iam_url"] = iam_url.rstrip("/")
    if runtimes_url is not None:
        config["runtimes_url"] = runtimes_url.rstrip("/")
    _save_config(config)
