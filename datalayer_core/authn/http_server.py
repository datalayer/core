# Copyright (c) Datalayer Development Team.
# Distributed under the terms of the Modified BSD License.

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
from http.server import SimpleHTTPRequestHandler, HTTPServer
from pathlib import Path
from socketserver import BaseRequestHandler

from datalayer_core.authn.state import set_server_port
from datalayer_core.authn.keys import (
    DATALAYER_IAM_TOKEN_KEY, DATALAYER_IAM_USER_KEY
)
from datalayer_core.authn.pages import (
    LANDING_PAGE, AUTH_SUCCESS_PAGE, OAUTH_ERROR_PAGE
)

from datalayer_core.utils.utils import find_http_port
from datalayer_core.serverapplication import launch_new_instance
from datalayer_core._version import __version__


HERE = Path(__file__).parent


# Do not set it to True, the Jupyter Server
# handlers are not yet implemented.
USE_JUPYTER_SERVER_FOR_LOGIN: bool = False


logger = logging.getLogger(__name__)


class LoginRequestHandler(SimpleHTTPRequestHandler):
    """Custom simple http request handler to serve static files
    from a directory and handle receiving the authentication token
    for CLI usage.
    """

    server_version = "LoginHTTP/" + __version__

    def _save_token(self, query: str):
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

        if not user_raw or not token:
            self.send_error(HTTPStatus.BAD_REQUEST, "User and token must be provided.")
        user = json.loads(urllib.parse.unquote(user_raw))
        content = AUTH_SUCCESS_PAGE.format(
            user_key=DATALAYER_IAM_USER_KEY,
            uid=user.get("uid"),
            handle=user["handle_s"],
            first_name=user["first_name_t"],
            last_name=user["last_name_t"],
            email=user["email_s"],
            display_name=" ".join((user["first_name_t"], user["last_name_t"])).strip(),
            token_key=DATALAYER_IAM_TOKEN_KEY,
            token=token,
            base_url="/",
        ).encode('UTF-8', 'replace')
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-type", "text/html")
        self.send_header("Content-Length", str(len(content)))
        self.end_headers()
        self.wfile.write(content)


    def do_GET(self):
        parts = urllib.parse.urlsplit(self.path)
        if parts[2].strip("/").endswith("oauth/callback"):
            self._save_token(parts[3])
        elif parts[2] in {"/", "/datalayer/login/cli"}:
            content = LANDING_PAGE.format(
                config=json.dumps(
                    {
                        "runUrl": self.server.run_url,
                        "iamRunUrl": self.server.run_url,
                        "whiteLabel": False
                    }
                )
            ).encode('UTF-8', 'replace')
            self.send_response(HTTPStatus.OK)
            self.send_header("Content-type", "text/html")
            self.send_header("Content-Length", str(len(content)))
            self.end_headers()
            self.wfile.write(content)
        else:
            super().do_GET()


    def do_POST(self):
        content_length = int(self.headers["Content-Length"])
        post_data = self.rfile.read(content_length)
        response = post_data.decode("utf-8")
        content = json.loads(response)
        self.server.token = content["token"]
        self.server.user_handle = content["user_handle"]

        self.send_response(HTTPStatus.CREATED)
        self.send_header("Content-Length", "0")
        self.end_headers()

        signal.raise_signal(signal.SIGINT)


    def log_message(self, format, *args):
        message = format % args
        logger.debug(
            "%s - - [%s] %s\n"
            % (
                self.address_string(),
                self.log_date_time_string(),
                message.translate(self._control_char_table),
            )
        )


class DualStackServer(HTTPServer):
    def __init__(
        self,
        server_address: tuple[str | bytes | bytearray, int],
        RequestHandlerClass: t.Callable[[t.Any, t.Any, t.Self], BaseRequestHandler],
        run_url: str,
        bind_and_activate: bool = True,
    ) -> None:
        self.run_url = run_url
        self.user_handle = None
        self.token = None
        super().__init__(server_address, RequestHandlerClass, bind_and_activate)

    def server_bind(self):
        # Suppress exception when protocol is IPv4.
        with contextlib.suppress(Exception):
            self.socket.setsockopt(socket.IPPROTO_IPV6, socket.IPV6_V6ONLY, 0)
        return super().server_bind()

    def finish_request(self, request, client_address):
        self.RequestHandlerClass(
            request, client_address, self, directory=str(HERE / '..' / "static")
        )


def get_token(
    run_url: str, port: int | None = None, logger: logging.Logger = logger
) -> tuple[str, str] | None:
    """Get the user handle and token."""

    server_address = ("", port or find_http_port())
    port = server_address[1]

    if USE_JUPYTER_SERVER_FOR_LOGIN == True:
        set_server_port(port)
        logger.info(f"Waiting for user logging, open http://localhost:{port}. Press CTRL+C to abort.\n")
        sys.argv = [
            "",
            "--DatalayerExtensionApp.run_url", run_url,
            "--ServerApp.disable_check_xsrf", "True",
        ]
        launch_new_instance()
        logger.debug("Authentication finished.")
#        return None if httpd.token is None else (httpd.user_handle, httpd.token)
        return None
    else:
        httpd = DualStackServer(server_address, LoginRequestHandler, run_url)
        logger.info(f"Waiting for user logging, open http://localhost:{port}. Press CTRL+C to abort.\n")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            pass
        httpd.server_close()
        logger.debug("Authentication finished.")
        return None if httpd.token is None else (httpd.user_handle, httpd.token)

