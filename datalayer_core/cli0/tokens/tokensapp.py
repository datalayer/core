# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""
Tokens CLI application.
"""

from datalayer_core.application import NoStart
from datalayer_core.cli0.base import DatalayerCLIBaseApp
from datalayer_core.cli0.tokens.create.createapp import TokensCreateApp
from datalayer_core.cli0.tokens.delete.deleteapp import TokensDeleteApp
from datalayer_core.cli0.tokens.list.listapp import TokensListApp


class TokensApp(DatalayerCLIBaseApp):
    """Tokens CLI application."""

    description = """
      The Tokens CLI application.
    """

    _requires_auth = False

    subcommands = {
        "create": (TokensCreateApp, TokensCreateApp.description.splitlines()[0]),
        "list": (TokensListApp, TokensListApp.description.splitlines()[0]),
        "ls": (TokensListApp, TokensListApp.description.splitlines()[0]),
        "delete": (TokensDeleteApp, TokensDeleteApp.description.splitlines()[0]),
    }

    def start(self) -> None:
        """Start the app."""
        try:
            super().start()
            self.log.info(
                f"One of `{'` `'.join(TokensApp.subcommands.keys())}` must be specified."
            )
            self.exit(1)
        except NoStart:
            pass
        self.exit(0)
