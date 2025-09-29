# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.
 
from typing import Any, Union

from datalayer_core.models.tokens import TokenType
from datalayer_core.utils import btoa


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


class TokensDeleteMixin:
    """Mixin for deleting tokens in Datalayer."""

    def _delete_token(self, token_uid: str) -> dict[str, Any]:
        """
        Delete a token by its unique identifier.

        Parameters
        ----------
        token_uid : str
            Unique identifier of the token to delete.

        Returns
        -------
        dict[str, Any]
            A dictionary containing the result of the deletion operation.
        """
        try:
            response = self._fetch(  # type: ignore
                "{}/api/iam/v1/tokens/{}".format(self.run_url, token_uid),  # type: ignore
                method="DELETE",
            )
            return response.json()
        except RuntimeError as e:
            return {"success": False, "message": str(e)}


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


class TokensMixin(TokensCreateMixin, TokensDeleteMixin, TokensListMixin):
    """A mixin that combines create, delete, and list functionalities for tokens."""
