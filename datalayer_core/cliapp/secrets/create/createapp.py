# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""
Secrets creation for Datalayer.
"""

from traitlets import Unicode

from datalayer_core.cliapp.base import DatalayerCLIBaseApp
from datalayer_core.mixins.secrets import SecretsCreateMixin
from datalayer_core.displays.secrets import display_secrets


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
