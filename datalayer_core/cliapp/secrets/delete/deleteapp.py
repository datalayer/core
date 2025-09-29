# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""Application for deleting secrets in Datalayer."""

from datalayer_core.cliapp.base import DatalayerCLIBaseApp
from datalayer_core.mixins.secrets import SecretsDeleteMixin


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
