# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""
Tokens creation for Datalayer.
"""

from enum import Enum
from typing import Any, Union

from traitlets import Unicode

from datalayer_core.cli0.base import DatalayerCLIBaseApp
from datalayer_core.cli0.tokens.utils import display_tokens
from datalayer_core.utils import btoa


class TokenType(str, Enum):
    """Enum for secret variants."""

    USER = "user_token"


class TokensCreateMixin:
    """Mixin for creating tokens in Datalayer."""

    def _create_token(
        self,
        name: str,
        description: str,
        expiration_date: int = 0,
        token_type: Union[str, TokenType] = TokenType.USER,
    ) -> dict[str, Any]:
        """
        Create a Token with the given parameters.

        Parameters
        ----------
        name : str
            Name of the secret.
        description : str
            Description of the secret.
        expiration_date : float
            Expiration date of the token.
        token_type : str, TokenType
            Variant or type of the token. Defaults to "user_token".
            Type of the token (e.g., "user").

        Returns
        -------
        dict
            A dictionary containing the created secret and its details.
        """
        body = {
            "name": name,
            "description": btoa(description),
            "variant": token_type.value
            if isinstance(token_type, TokenType)
            else token_type,
            "expiration_date": expiration_date,
        }
        try:
            response = self._fetch(  # type: ignore
                "{}/api/iam/v1/tokens".format(self.run_url),  # type: ignore
                method="POST",
                json=body,
            )
            return response.json()
        except RuntimeError as e:
            return {"success": False, "message": str(e)}


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
