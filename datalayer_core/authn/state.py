# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

from __future__ import annotations


SERVER_PORT: int | None = None

USER_HANDLE: str | None = None

USER_TOKEN: str | None = None


def set_server_port(server_port):
    global SERVER_PORT
    SERVER_PORT = server_port


def get_server_port():
    global SERVER_PORT
    return SERVER_PORT
