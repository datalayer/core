# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

from typing import Any

from datalayer_core.models.secret import SecretVariant
from datalayer_core.utils import btoa


class SecretsCreateMixin:
    """Mixin for creating secrets in Datalayer."""

    def _create_secret(
        self,
        name: str,
        description: str,
        value: str,
        secret_type: str = SecretVariant.GENERIC,
    ) -> dict[str, Any]:
        """
        Create a Secret with the given parameters.

        Parameters
        ----------
        name : str
            Name of the secret.
        description : str
            Description of the secret.
        value : str
            Value of the secret.
        secret_type : str
            Type of the secret (e.g., "generic", "password", "key", "token").

        Returns
        -------
        dict
            A dictionary containing the created secret and its details.
        """
        body = {
            "name": name,
            "description": description,
            "variant": secret_type,
            "value": btoa(value),
        }
        try:
            response = self._fetch(  # type: ignore
                "{}/api/iam/v1/secrets".format(self.iam_url),  # type: ignore
                method="POST",
                json=body,
            )
            return response.json()
        except RuntimeError as e:
            return {"success": False, "message": str(e)}


class SecretsDeleteMixin:
    """Mixin for deleting secrets in Datalayer."""

    def _delete_secret(self, secret_uid: str) -> dict[str, Any]:
        """
        Delete a secret by its unique identifier.

        Parameters
        ----------
        secret_uid : str
            Unique identifier of the secret to delete.

        Returns
        -------
        dict[str, Any]
            A dictionary containing the result of the deletion operation.
        """
        try:
            response = self._fetch(  # type: ignore
                "{}/api/iam/v1/secrets/{}".format(self.iam_url, secret_uid),  # type: ignore
                method="DELETE",
            )
            return response.json()
        except RuntimeError as e:
            return {"success": False, "message": str(e)}


class SecretsListMixin:
    """Mixin class for listing secrets."""

    def _list_secrets(self) -> dict[str, Any]:
        """
        List all secrets in the Datalayer environment.

        Returns
        -------
        dict[str, Any]
            Dictionary containing secrets information.
        """
        try:
            response = self._fetch(  # type: ignore
                "{}/api/iam/v1/secrets".format(self.iam_url),  # type: ignore
                method="GET",
            )
            return response.json()
        except RuntimeError as e:
            return {"sucess": False, "error": str(e)}


class SecretsMixin(SecretsCreateMixin, SecretsDeleteMixin, SecretsListMixin):
    """A mixin that combines create, delete, and list functionalities for secrets."""
