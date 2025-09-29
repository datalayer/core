# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""Utility functions for Datalayer core."""

from __future__ import annotations

import socket
import typing as t
import requests


def fetch(
    request: str,
    token: str | None = None,
    external_token: str | None = None,
    **kwargs: t.Any,
) -> requests.Response:
    """
    Fetch a network resource as a context manager.

    Parameters
    ----------
    request : str
        The URL to fetch.
    token : str or None, default None
        Bearer token for authentication.
    external_token : str or None, default None
        External token for authentication.
    **kwargs : Any
        Additional keyword arguments passed to requests.

    Returns
    -------
    requests.Response
        The HTTP response object.
    """
    method = kwargs.pop("method", "GET")
    f = getattr(requests, method.lower())
    headers = kwargs.pop("headers", {})
    if len(headers) == 0:
        headers = {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "User-Agent": "Jupyter kernels CLI",
        }
    if token:
        headers["Authorization"] = f"Bearer {token}"
    if external_token:
        headers["X-External-Token"] = external_token
    if "timeout" not in kwargs:
        kwargs["timeout"] = 60
    response = f(request, headers=headers, **kwargs)
    response.raise_for_status()
    return response


def find_http_port() -> int:
    """
    Find an available http port.

    Returns
    -------
    int
        An available port number.
    """
    # Xref https://stackoverflow.com/questions/1365265/on-localhost-how-do-i-pick-a-free-port-number
    sock = socket.socket()
    sock.bind(("", 0))
    return sock.getsockname()[1]
