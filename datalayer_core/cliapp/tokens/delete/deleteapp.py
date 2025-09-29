# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""Application for deleting Tokens in Datalayer."""

from datalayer_core.cliapp.base import DatalayerCLIBaseApp
from datalayer_core.mixins.tokens import TokensDeleteMixin


class TokensDeleteApp(DatalayerCLIBaseApp, TokensDeleteMixin):
    """An application to delete tokens."""

    description = """
      An application to delete a Token.

      Usage:
        datalayer tokens delete UID
    """

    def start(self) -> None:
        """Start the app."""
        if len(self.extra_args) > 1:  # pragma: no cover
            self.log.warning("Too many arguments were provided for Tokens delete.")
            self.print_help()
            self.exit(1)

        if len(self.extra_args) < 1:  # pragma: no cover
            self.log.warning("Too few arguments were provided for Tokens delete.")
            self.print_help()
            self.exit(1)

        token_uid = self.extra_args[0]
        response = self._delete_token(token_uid)
        if response["success"]:
            self.log.info(f"Token '{token_uid}' deleted.")
        else:
            self.log.warning("The token could not be deleted!")
            self.exit(1)
