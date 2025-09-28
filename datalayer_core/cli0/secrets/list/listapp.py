# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""Secrets list application for Datalayer Core."""

from typing import Any

from datalayer_core.cli0.base import DatalayerCLIBaseApp
from datalayer_core.cli0.secrets.utils import display_secrets


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
                "{}/api/iam/v1/secrets".format(self.run_url),  # type: ignore
                method="GET",
            )
            return response.json()
        except RuntimeError as e:
            return {"sucess": False, "error": str(e)}


class SecretsListApp(DatalayerCLIBaseApp, SecretsListMixin):
    """An application to list secrets."""

    description = """
      An application to list Secrets.

      Usage:
        datalayer secrets list
        datalayer secrets ls
    """

    def start(self) -> None:
        """Start the app."""
        if len(self.extra_args) > 0:  # pragma: no cover
            self.log.warning("Too many arguments were provided for Secrets list.")
            self.print_help()
            self.exit(1)

        raw = self._list_secrets()
        if raw.get("success"):
            display_secrets(raw.get("secrets", []))
        else:
            self.log.warning("The secrets could not be listed!")
            self.exit(1)
