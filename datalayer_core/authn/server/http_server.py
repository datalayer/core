# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""HTTP server for authentication in Datalayer Core."""

from __future__ import annotations

import contextlib
import json
import logging
import signal
import socket
import sys
import typing as t
import urllib
import urllib.parse
from http import HTTPStatus
from http.server import HTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from socketserver import BaseRequestHandler
from typing import Optional, Union

from datalayer_core.__version import __version__
from datalayer_core.authn.server.keys import (
    DATALAYER_IAM_TOKEN_KEY,
    DATALAYER_IAM_USER_KEY,
)
from datalayer_core.authn.server.pages import (
    AUTH_SUCCESS_PAGE,
    LANDING_PAGE,
    OAUTH_ERROR_PAGE,
)
from datalayer_core.authn.server.state import set_server_port
from datalayer_core.base.serverapplication import launch_new_instance
from datalayer_core.utils.network import find_http_port
from datalayer_core.utils.urls import DatalayerURLs

HERE = Path(__file__).parent


# Do not set it to True, the Jupyter Server
# handlers are not yet implemented.
USE_JUPYTER_SERVER_FOR_LOGIN: bool = False


logger = logging.getLogger(__name__)


def _normalize_navigation_target(candidate: str | None) -> str | None:
    if candidate is None:
        return None
    value = str(candidate).strip()
    if not value:
        return None
    parsed = urllib.parse.urlparse(value)
    if parsed.scheme or parsed.netloc:
        return None
    if not value.startswith("/") or value.startswith("//"):
        return None
    return value


class LoginRequestHandler(SimpleHTTPRequestHandler):
    """
    Handle HTTP requests for authentication flow.

    This handler serves static files from a directory and handles
    receiving the authentication token for CLI usage.
    """

    server_version = "LoginHTTP/" + __version__

    def _save_token(self, query: str) -> None:
        """
        Save authentication token from OAuth callback.

        Parameters
        ----------
        query : str
            The query string from the OAuth callback URL.
        """
        arguments = urllib.parse.parse_qs(query)
        error = arguments.get("error", [""])[0]
        if error:
            provider = arguments.get("provider", ["<unknown>"])[0]
            content = OAUTH_ERROR_PAGE.format(
                error=error,
                provider=provider,
                base_url="/",
            ).encode("utf-8")
            self.send_error(HTTPStatus.UNAUTHORIZED)
            self.send_header("Content-type", "text/html")
            self.send_header("Content-Length", str(sys.getsizeof(content)))
            self.end_headers()
            self.wfile.write(content)
            return

        user_raw = arguments.get("user", [""])[0]
        token = arguments.get("token", [""])[0]
        navigation_candidate = (
            arguments.get("navigate_to", [""])[0]
            or arguments.get("navigation", [""])[0]
            or arguments.get("post_auth_redirect", [""])[0]
            or arguments.get("redirect_url", [""])[0]
        )
        navigation_target = _normalize_navigation_target(navigation_candidate)

        if not user_raw or not token:
            self.send_error(HTTPStatus.BAD_REQUEST, "User and token must be provided.")

        user = json.loads(urllib.parse.unquote(user_raw))
        content = (
            AUTH_SUCCESS_PAGE
            .replace("__USER_KEY__", DATALAYER_IAM_USER_KEY)
            .replace("__TOKEN_KEY__", DATALAYER_IAM_TOKEN_KEY)
            .replace("__UID_JSON__", json.dumps(user.get("uid", "")))
            .replace("__HANDLE_JSON__", json.dumps(user.get("handle_s", "")))
            .replace(
                "__FIRST_NAME_JSON__", json.dumps(user.get("first_name_t", ""))
            )
            .replace(
                "__LAST_NAME_JSON__", json.dumps(user.get("last_name_t", ""))
            )
            .replace("__EMAIL_JSON__", json.dumps(user.get("email_s", "")))
            .replace(
                "__DISPLAY_NAME_JSON__",
                json.dumps(
                    " ".join(
                        (
                            user.get("first_name_t", ""),
                            user.get("last_name_t", ""),
                        )
                    ).strip()
                ),
            )
            .replace("__TOKEN_JSON__", json.dumps(token))
            .replace(
                "__NAVIGATION_TARGET_JSON__", json.dumps(navigation_target or "")
            )
        ).encode("UTF-8", "replace")
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-type", "text/html")
        self.send_header("Content-Length", str(len(content)))
        self.end_headers()
        self.wfile.write(content)

    def do_GET(self) -> None:
        """Handle GET requests for authentication flow."""
        (scheme, netloc, path, query, fragment) = urllib.parse.urlsplit(self.path)
        if path.strip("/").endswith("callback"):
            self._save_token(query)
        elif path in {"/", "/datalayer/login/cli"}:
            config_json = json.dumps(
                {
                    "runUrl": self.server.run_url,  # type: ignore
                    "iamRunUrl": self.server.iam_url,  # type: ignore
                    "whiteLabel": False,
                }
            )
            content = LANDING_PAGE.replace(
                "__DATALAYER_CONFIG_JSON__", config_json
            ).encode("UTF-8", "replace")
            self.send_response(HTTPStatus.OK)
            self.send_header("Content-type", "text/html")
            self.send_header("Content-Length", str(len(content)))
            self.end_headers()
            self.wfile.write(content)
        else:
            super().do_GET()

    def do_POST(self) -> None:
        """Handle POST requests with authentication data."""
        content_length = int(self.headers["Content-Length"])
        post_data = self.rfile.read(content_length)
        response = post_data.decode("utf-8")
        content = json.loads(response)
        self.server.token = content["token"]  # type: ignore
        self.server.user_handle = content["user_handle"]  # type: ignore

        self.send_response(HTTPStatus.CREATED)
        self.send_header("Content-Length", "0")
        self.end_headers()

        signal.raise_signal(signal.SIGINT)

    def log_message(self, format: str, *args: t.Tuple[t.Any]) -> None:
        """
        Log HTTP server messages.

        Parameters
        ----------
        format : str
            Format string for the log message.
        *args : tuple[Any]
            Arguments for the format string.
        """
        message = format % args
        logger.debug(
            "%s - - [%s] %s\n"
            % (
                self.address_string(),
                self.log_date_time_string(),
                message.translate(self._control_char_table),  # type: ignore
            )
        )


class AuthHTTPServer(HTTPServer):
    """
    HTTP server supporting authentication.

    Parameters
    ----------
    server_address : tuple[Union[str, bytes, bytearray], int]
        The server address and port.
    RequestHandlerClass : Callable
        The request handler class.
    run_url : str
        The runtime URL.
    bind_and_activate : bool, default True
        Whether to bind and activate the server.
    """

    def __init__(
        self,
        server_address: tuple[Union[str, bytes, bytearray], int],
        RequestHandlerClass: t.Callable[[t.Any, t.Any, t.Self], BaseRequestHandler],
        run_url: str,
        bind_and_activate: bool = True,
    ) -> None:
        """
        Initialize the dual stack HTTP server.

        Parameters
        ----------
        server_address : tuple[Union[str, bytes, bytearray], int]
            The server address and port.
        RequestHandlerClass : Callable
            The request handler class.
        run_url : str
            The runtime URL.
        bind_and_activate : bool, default True
            Whether to bind and activate the server.
        """
        # Use DatalayerURLs for proper URL configuration
        self._urls = DatalayerURLs.from_environment(run_url=run_url)
        self.run_url = self._urls.run_url
        self.iam_url = self._urls.iam_url
        self.user_handle = None
        self.token = None
        super().__init__(server_address, RequestHandlerClass, bind_and_activate)

    def server_bind(self) -> None:
        """
        Bind the server socket, supporting both IPv4 and IPv6.

        Returns
        -------
        None
            This method does not return a value.
        """
        # Suppress exception when protocol is IPv4.
        with contextlib.suppress(Exception):
            self.socket.setsockopt(socket.IPPROTO_IPV6, socket.IPV6_V6ONLY, 0)
        return super().server_bind()

    def finish_request(self, request: t.Any, client_address: str) -> None:
        """
        Complete an incoming request.

        Parameters
        ----------
        request : Any
            The request object.
        client_address : str
            The client address.
        """
        datalayer_core_static_path = HERE.parent.parent / "static"
        self.RequestHandlerClass(
            request,
            client_address,
            self,  # type: ignore[arg-type]
            directory=str(datalayer_core_static_path),  # type: ignore[call-arg]
        )


def get_token(
    run_url: str, port: Optional[int] = None, logger: logging.Logger = logger
) -> Optional[tuple[str, str]]:
    """
    Get the user handle and token.

    Parameters
    ----------
    run_url : str
        The runtime URL.
    port : int or None, default None
        The port to use for the authentication server.
    logger : logging.Logger, default logger
        The logger instance to use.

    Returns
    -------
    tuple[str, str] or None
        A tuple containing the user handle and token, or None if authentication fails.
    """

    server_address = ("", port or find_http_port())
    port = server_address[1]

    if USE_JUPYTER_SERVER_FOR_LOGIN:
        set_server_port(port)
        logger.info(
            f"Waiting for user logging, open http://localhost:{port}. Press CTRL+C to abort.\n"
        )
        sys.argv = [
            "",
            "--DatalayerExtensionApp.run_url",
            run_url,
            "--ServerApp.disable_check_xsrf",
            "True",
        ]
        launch_new_instance()
        logger.debug("Authentication finished.")
        #        return None if httpd.token is None else (httpd.user_handle, httpd.token)
        return None
    else:
        httpd = AuthHTTPServer(server_address, LoginRequestHandler, run_url)
        logger.info(
            f"Waiting for user logging, open http://localhost:{port}. Press CTRL+C to abort.\n"
        )
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            pass
        httpd.server_close()
        logger.debug("Authentication finished.")
        return None if httpd.token is None else (httpd.user_handle, httpd.token)
