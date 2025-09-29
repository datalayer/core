# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""Application for deleting secrets in Datalayer."""

from typing import Any

from datalayer_core.cliapp.base import DatalayerCLIBaseApp


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
                "{}/api/iam/v1/secrets/{}".format(self.run_url, secret_uid),  # type: ignore
                method="DELETE",
            )
            return response.json()
        except RuntimeError as e:
            return {"success": False, "message": str(e)}


class SecretsDeleteApp(DatalayerCLIBaseApp, SecretsDeleteMixin):
    """An application to delete secrets."""

    description = """
      An application to delete a Secret.

      Usage:
        datalayer secrets delete UID
    """

    def start(self) -> None:
        """Start the app."""
        if len(self.extra_args) > 1:  # pragma: no cover
            self.log.warning("Too many arguments were provided for Secrets list.")
            self.print_help()
            self.exit(1)

        if len(self.extra_args) < 1:  # pragma: no cover
            self.log.warning("Too few arguments were provided for Secrets list.")
            self.print_help()
            self.exit(1)

        secret_uid = self.extra_args[0]
        response = self._delete_secret(secret_uid)
        if response["success"]:
            self.log.info(f"Secret '{secret_uid}' deleted.")
        else:
            self.log.warning("The secret could not be deleted!")
            self.exit(1)
