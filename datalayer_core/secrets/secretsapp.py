# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

from datalayer_core.application import NoStart

from datalayer_core.secrets.create.createapp import SecretsCreateApp
from datalayer_core.secrets.delete.deleteapp import SecretsDeleteApp
from datalayer_core.secrets.list.listapp import SecretsListApp


from datalayer_core.cli.base import DatalayerCLIBaseApp


class SecretsApp(DatalayerCLIBaseApp):
    description = """
      The Runtimes CLI application.
    """

    _requires_auth = False

    subcommands = {
        "create": (SecretsCreateApp, SecretsCreateApp.description.splitlines()[0]),
        "list": (SecretsListApp, SecretsListApp.description.splitlines()[0]),
        "ls": (SecretsListApp, SecretsListApp.description.splitlines()[0]),
        "delete": (SecretsDeleteApp, SecretsDeleteApp.description.splitlines()[0]),
    }

    def start(self):
        try:
            super().start()
            self.log.info(
                f"One of `{'` `'.join(SecretsApp.subcommands.keys())}` must be specified."
            )
            self.exit(1)
        except NoStart:
            pass
        self.exit(0)
