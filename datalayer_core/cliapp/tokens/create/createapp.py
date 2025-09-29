# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""
Tokens creation for Datalayer.
"""

from traitlets import Unicode

from datalayer_core.cliapp.base import DatalayerCLIBaseApp
from datalayer_core.mixins.tokens import TokensCreateMixin
from datalayer_core.display.tokens import display_tokens


class TokensCreateApp(DatalayerCLIBaseApp, TokensCreateMixin):
    """An application to create tokens."""

    description = """
      An application to create a Token.

      Usage:
        datalayer tokens create NAME DESCRIPTION DATE
        datalayer tokens create NAME DESCRIPTION DATE [--variant VARIANT]
    """

    variant = Unicode(
        "Token variant",
        allow_none=True,
        config=True,
        help="Token variant.",
    )

    def start(self) -> None:
        """Start the app."""
        if len(self.extra_args) < 2:  # pragma: no cover
            self.log.warning("Too few arguments were provided for Tokens create.")
            self.print_help()
            self.exit(1)

        if len(self.extra_args) > 4:  # pragma: no cover
            self.log.warning("Too many arguments were provided for Tokens create.")
            self.print_help()
            self.exit(1)

        response = self._create_token(*self.extra_args)
        if response["success"]:
            token = response["token"]
            display_tokens([token])
        else:
            self.log.warning("The token could not be created!")
            self.exit(1)
