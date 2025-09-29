# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""Tokens list application for Datalayer Core."""

from typing import Any

from datalayer_core.cliapp.base import DatalayerCLIBaseApp
from datalayer_core.utils.display import display_tokens


class TokensListMixin:
    """Mixin class for listing tokens."""

    def _list_tokens(self) -> dict[str, Any]:
        """
        List all tokens in the Datalayer environment.

        Returns
        -------
        dict[str, Any]
            Dictionary containing tokens information.
        """
        try:
            response = self._fetch(  # type: ignore
                "{}/api/iam/v1/tokens".format(self.run_url),  # type: ignore
                method="GET",
            )
            return response.json()
        except RuntimeError as e:
            return {"sucess": False, "error": str(e)}


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
