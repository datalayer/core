# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""
Secrets creation for Datalayer.
"""

from enum import Enum
from typing import Any

from traitlets import Unicode

from datalayer_core.cli0.base import DatalayerCLIBaseApp
from datalayer_core.utils.utils import display_secrets
from datalayer_core.utils import btoa


class SecretType(str, Enum):
    """Enum for secret variants."""

    GENERIC = "generic"
    PASSWORD = "password"
    KEY = "key"
    TOKEN = "token"


class SecretsCreateMixin:
    """Mixin for creating secrets in Datalayer."""

    def _create_secret(
        self,
        name: str,
        description: str,
        value: str,
        secret_type: str = SecretType.GENERIC,
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
                "{}/api/iam/v1/secrets".format(self.run_url),  # type: ignore
                method="POST",
                json=body,
            )
            return response.json()
        except RuntimeError as e:
            return {"success": False, "message": str(e)}


class SecretsCreateApp(DatalayerCLIBaseApp, SecretsCreateMixin):
    """An application to create secrets."""

    description = """
      An application to create a Secret.

      Usage:
        datalayer secrets create NAME DESCRIPTION VALUE
        datalayer secrets create NAME DESCRIPTION VALUE [--variant VARIANT]
    """

    variant = Unicode(
        "Secret variant",
        allow_none=True,
        config=True,
        help="Secret variant.",
    )

    def start(self) -> None:
        """Start the app."""
        if len(self.extra_args) < 3:  # pragma: no cover
            self.log.warning("Too few arguments were provided for Secrets create.")
            self.print_help()
            self.exit(1)

        if len(self.extra_args) > 4:  # pragma: no cover
            self.log.warning("Too many arguments were provided for Secrets create.")
            self.print_help()
            self.exit(1)

        response = self._create_secret(*self.extra_args)
        if response["success"]:
            secret = response["secret"]
            display_secrets([secret])
        else:
            self.log.warning("The secret could not be deleted!")
            self.exit(1)
