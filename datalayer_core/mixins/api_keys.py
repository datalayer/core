# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

from typing import Any, Union

from datalayer_core.models.api_key import ApiKeyType
from datalayer_core.utils import btoa


class ApiKeysCreateMixin:
    """Mixin for creating API keys in Datalayer."""

    def _create_api_key(
        self,
        name: str,
        description: str,
        expiration_date: int = 0,
        api_key_type: Union[str, ApiKeyType] = ApiKeyType.USER,
    ) -> dict[str, Any]:
        """
        Create an API key with the given parameters.

        Parameters
        ----------
        name : str
            Name of the secret.
        description : str
            Description of the secret.
        expiration_date : float
            Expiration date of the API key.
        api_key_type : str, ApiKeyType
            Variant or type of the API key. Defaults to "user_token".
            Type of the API key (e.g., "user").

        Returns
        -------
        dict
            A dictionary containing the created secret and its details.
        """
        body = {
            "name": name,
            "description": btoa(description),
            "variant": api_key_type.value
            if isinstance(api_key_type, ApiKeyType)
            else api_key_type,
            "expiration_date": expiration_date,
        }
        try:
            response = self._fetch(  # type: ignore
                "{}/api/iam/v1/api-keys".format(self.urls.iam_url),  # type: ignore
                method="POST",
                json=body,
            )
            return response.json()
        except RuntimeError as e:
            return {"success": False, "message": str(e)}


class ApiKeysDeleteMixin:
    """Mixin for deleting API keys in Datalayer."""

    def _delete_api_key(self, api_key_uid: str) -> dict[str, Any]:
        """
        Delete an API key by its unique identifier.

        Parameters
        ----------
        api_key_uid : str
            Unique identifier of the API key to delete.

        Returns
        -------
        dict[str, Any]
            A dictionary containing the result of the deletion operation.
        """
        try:
            response = self._fetch(  # type: ignore
                "{}/api/iam/v1/api-keys/{}".format(self.urls.iam_url, api_key_uid),  # type: ignore
                method="DELETE",
            )
            return response.json()
        except RuntimeError as e:
            return {"success": False, "message": str(e)}


class ApiKeysListMixin:
    """Mixin class for listing API keys."""

    def _list_api_keys(self) -> dict[str, Any]:
        """
        List all API keys in the Datalayer environment.

        Returns
        -------
        dict[str, Any]
            Dictionary containing API key information.
        """
        try:
            response = self._fetch(  # type: ignore
                "{}/api/iam/v1/api-keys".format(self.urls.iam_url),  # type: ignore
                method="GET",
            )
            return response.json()
        except RuntimeError as e:
            return {"sucess": False, "error": str(e)}


class ApiKeysMixin(ApiKeysCreateMixin, ApiKeysDeleteMixin, ApiKeysListMixin):
    """A mixin that combines create, delete, and list functionalities for API keys."""
