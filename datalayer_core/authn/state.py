# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""Authentication state management for Datalayer core."""

from __future__ import annotations

from typing import Optional

SERVER_PORT: int | None = None

USER_HANDLE: str | None = None

USER_TOKEN: str | None = None


def set_server_port(server_port: int) -> None:
    """
    Set the global server port.

    Parameters
    ----------
    server_port : int
        Port number to set for the server.
    """
    global SERVER_PORT
    SERVER_PORT = server_port


def get_server_port() -> Optional[int]:
    """
    Get the current server port.

    Returns
    -------
    Optional[int]
        The current server port number, or None if not set.
    """
    global SERVER_PORT
    return SERVER_PORT
