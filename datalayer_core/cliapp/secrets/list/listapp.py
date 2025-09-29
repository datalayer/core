# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""Secrets list application for Datalayer Core."""

from datalayer_core.cliapp.base import DatalayerCLIBaseApp
from datalayer_core.mixins.secrets import SecretsListMixin
from datalayer_core.display.secrets import display_secrets

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
