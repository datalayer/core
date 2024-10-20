# Copyright (c) Datalayer Development Team.
# Distributed under the terms of the Modified BSD License.

import json
import os
import sys
import time
import threading
import typing as t

import questionary

# We use `requests` instead of tornado to avoid trouble with the async event loop
import requests

from rich.console import Console

from traitlets import Bool, Unicode

from datalayer_core.application import DatalayerApp, base_aliases, base_flags
from datalayer_core.authn.http_server import get_token, USE_JUPYTER_SERVER_FOR_LOGIN
from datalayer_core.utils.utils import fetch, find_http_port

from datalayer_core._version import __version__


REQUEST_TIMEOUT = 5


datalayer_aliases = dict(base_aliases)
datalayer_aliases["run-url"] = "DatalayerCLIBaseApp.run_url"
datalayer_aliases["token"] = "DatalayerCLIBaseApp.token"
datalayer_aliases["external-token"] = "DatalayerCLIBaseApp.external_token"

datalayer_flags = dict(base_flags)
datalayer_flags.update(
    {
        "no-browser": (
            {"DatalayerCLIBaseApp": {"no_browser": True}},
            "Will prompt for user and password on the CLI.",
        )
    }
)


class DatalayerCLIBaseApp(DatalayerApp):
    name = "datalayer_core"

    version = __version__

    aliases = datalayer_aliases

    flags = datalayer_flags

    user_handle = None

    run_url = Unicode(
        None,
        allow_none=False,
        config=True,
        help="Datalayer RUN URL."
    )
    def _run_url_default(self):
        return os.environ.get("DATALAYER_RUN_URL", "https://prod1.datalayer.run")

    token = Unicode(
        None,
        allow_none=True,
        config=True,
        help="User access token."
    )
    def _token_default(self):
        return os.environ.get("DATALAYER_TOKEN", None)

    external_token = Unicode(
        None,
        allow_none=True,
        config=True,
        help="External token."
    )
    def _external_token_default(self):
        return os.environ.get("DATALAYER_EXTERNAL_TOKEN", None)

    no_browser = Bool(
        False,
        config=True,
        help="If true, prompt for login on the CLI only."
    )

    _is_initialized = False

    _requires_auth = True


    def initialize(self, argv=None):
        super().initialize(argv)

        if self.token is None:
            self.user_handle = None

        if not getattr(self, "_dispatching", False):
            super().initialize(argv)

        if DatalayerCLIBaseApp._is_initialized:
            return

        DatalayerCLIBaseApp._is_initialized = True

        # Log the user.
        if self._requires_auth:
            self._log_in()

        self.log.debug(
            "Datalayer - Version %s - Connected as %s on %s",
            self.version,
            self.user_handle,
            self.run_url,
        )
        console = Console()
        console.print()
        console.print(f"Datalayer - Version [bold cyan]{self.version}[/bold cyan] - Connected as [bold yellow]{self.user_handle}[/bold yellow] on [i]{self.run_url}[/i]")
        console.print()


    def _fetch(self, request: str, **kwargs: t.Any) -> requests.Response:
        """Fetch a network resource as a context manager."""
        try:
            return fetch(
                request,
                token=self.token,
                external_token=self.external_token,
                **kwargs
            )
        except requests.exceptions.Timeout as e:
            raise e
        except requests.exceptions.HTTPError as e:
            raw = e.response.json()
            self.log.debug(raw)
            raise RuntimeError(
                f"Failed to request the URL {request if isinstance(request, str) else request.url!s}"
            ) from e


    def _log_in(self) -> None:
        """Login the application with the Identity Provider."""

        if self.token is not None or self.external_token is not None:
            ans = None
            token = self.token if self.token is not None else self.external_token
            try:
                response = self._fetch(
                    f"{self.run_url}/api/iam/v1/login",
                    method="POST",
                    json={"token": token},
                    timeout=REQUEST_TIMEOUT,
                )
                content = response.json()
                self.log.debug(f"Login response {content}")
                ans = content["user"]["handle_s"], content["token"]
            except BaseException as e:
                msg = f"Failed to authenticate with the Token on {self.run_url}"
                self.log.debug(msg, exc_info=e)
            if ans is None:
                self.log.critical("Failed to authenticate to %s", self.run_url)
                sys.exit(1)
            else:
                username, token = ans
                self.log.debug(
                    "Authenticated as [%s] on [%s]",
                    username,
                    self.run_url,
                )
                self.user_handle = username
                self.token = token
                try:
                    import keyring
                    keyring.set_password(self.run_url, "access_token", self.token)
                    self.log.debug("Store token with keyring %s", token)
                except ImportError as e:
                    self.log.debug("Unable to import keyring.", exc_info=e)
            

        if self.token is None:
            # Look for cached value.
            try:
                import keyring
                stored_token = keyring.get_password(self.run_url, "access_token")
                if stored_token:
                    content = {}
                    try:
                        response = fetch(
                            f"{self.run_url}/api/iam/v1/whoami",
                            headers={
                                "Accept": "application/json",
                                "Content-Type": "application/json",
                                "Authorization": f"Bearer {stored_token}",
                                "User-Agent": "Datalayer CLI",
                            },
                            timeout=REQUEST_TIMEOUT,
                        )
                        content = response.json()
                    except requests.exceptions.Timeout as error:
                        self.log.warning("Request to get the user profile timed out.", exc_info=error)
                    except requests.exceptions.HTTPError as error:
                        if error.response.status_code == 401:
                            # Invalidate the stored token.
                            self.log.debug(f"Delete invalid cached token for {self.run_url}")
                            self._log_out()
                        else:
                            self.log.warning(
                                "Unable to get the user profile - Error %s %s",
                                error.response.status_code,
                                error.response.reason,
                            )
                    except json.JSONDecodeError as error:
                        self.log.warning(
                            "Unable to decode user profile.", exc_info=error
                        )
                    else:
                        username = content.get("profile", {}).get("handle_s")
                        self.log.debug("The cache token belongs to user %s", username)
                        self.user_handle = username
                        self.token = stored_token
            except ImportError as e:
                self.log.debug("Unable to import keyring.", exc_info=e)

        # The previous step may have failed, so self.token may still be None.
        if self.token is None:
            # Ask the user to log in.
            ans = None
            if self.no_browser:
                # Ask credentials via CLI.
                credentials = self._ask_credentials()
                credentials.pop("credentials_type")
                try:
                    response = self._fetch(
                        f"{self.run_url}/api/iam/v1/login",
                        method="POST",
                        json=credentials,
                        timeout=REQUEST_TIMEOUT,
                    )
                    content = response.json()
                    ans = content["user"]["handle_s"], content["token"]
                except BaseException as e:
                    if "username" in credentials:
                        msg = f"Failed to authenticate as {credentials['username']} on {self.run_url}"
                    else:
                        msg = f"Failed to authenticate with the Token on {self.run_url}"
                    self.log.debug(msg, exc_info=e)
            else:
                # Ask credentials via Browser.
                port = find_http_port()
                if USE_JUPYTER_SERVER_FOR_LOGIN == False:
                    self.__launch_browser(port)
                # Do we need to clear the instanch while using raw http server?
                self.clear_instance()
                ans = get_token(self.run_url, port, self.log)

            if ans is None:
                self.log.critical("Failed to authenticate to %s", self.run_url)
                sys.exit(1)
            else:
                username, token = ans
                self.log.info(
                    "Authenticated as %s on %s",
                    username,
                    self.run_url,
                )
                self.user_handle = username
                self.token = token
                try:
                    import keyring
                    keyring.set_password(self.run_url, "access_token", self.token)
                    self.log.debug("Store token with keyring %s", token)
                except ImportError as e:
                    self.log.debug("Unable to import keyring.", exc_info=e)


    def _ask_credentials(self) -> dict:
        questions = [
            {
                "type": "select",
                "name": "credentials_type",
                "message": "How do you want to log in?",
                "choices": [
                    {"name": "Username/Password", "value": "password"},
                    {"name": "Token", "value": "token"},
                ],
            },
            {
                "type": "text",
                "name": "handle",
                "message": "Username",
                "when": lambda x: x["credentials_type"] == "password",
                "validate": lambda x: True if len(x) > 0 else "Please enter a value",
            },
            {
                "type": "password",
                "name": "password",
                "message": "Password",
                "when": lambda x: x["credentials_type"] == "password",
                "validate": lambda x: True
                if len(x) >= 8
                else "Key must have at least 8 characters",
            },
            {
                "type": "password",
                "name": "token",
                "message": "Token",
                "when": lambda x: x["credentials_type"] == "token",
                "validate": lambda x: True
                if len(x) >= 8
                else "Token must have at least 8 characters",
            },
        ]
        return questionary.prompt(questions)


    def _log_out(self) -> None:
        """Log out from the Identity Provider."""
        self.token = None
        self.user_handle = None
        try:
            import keyring
            if keyring.get_credential(self.run_url, "access_token") is not None:
                keyring.delete_password(self.run_url, "access_token")
        except ImportError as e:
            self.log.debug("Unable to import keyring.", exc_info=e)
        self.log.info(f"👋 Successfully logged out from {self.run_url}")
        print()

    def __launch_browser(self, port: int) -> None:
        """Launch the browser."""

        address = f"http://localhost:{port}/datalayer/login/cli"

        # Deferred import for environments that do not have
        # the webbrowser module.
        import webbrowser

        try:
            browser = webbrowser.get()
        except webbrowser.Error as e:
            self.log.warning("No web browser found: %r.", e)
            browser = None

        if not browser:
            self.log.critical("Open %s to authenticate to the remote server.", address)
            return

        def target():
            assert browser is not None
            time.sleep(1)  # Allow for the server to start
            browser.open(address)

        threading.Thread(target=target).start()
