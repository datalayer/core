# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""Tokens list application for Datalayer Core."""

from datalayer_core.cliapp.base import DatalayerCLIBaseApp
from datalayer_core.mixins.tokens import TokensListMixin
from datalayer_core.display.tokens import display_tokens


class TokensListApp(DatalayerCLIBaseApp, TokensListMixin):
    """An application to list tokens."""

    description = """
      An application to list Tokens.

      Usage:
        datalayer tokens list
        datalayer tokens ls
    """

    def start(self) -> None:
        """Start the app."""
        if len(self.extra_args) > 0:  # pragma: no cover
            self.log.warning("Too many arguments were provided for Tokens list.")
            self.print_help()
            self.exit(1)

        raw = self._list_tokens()
        if raw.get("success"):
            display_tokens(raw.get("tokens", []))
        else:
            self.log.warning("The tokens could not be listed!")
            self.exit(1)
