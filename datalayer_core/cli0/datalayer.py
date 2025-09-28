# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""Main CLI application for Datalayer Core."""

from pathlib import Path

from datalayer_core.cli0.about.aboutapp import DatalayerAboutApp
from datalayer_core.application import NoStart
from datalayer_core.cli0.authn.loginapp import DatalayerLoginApp
from datalayer_core.cli0.authn.logoutapp import DatalayerLogoutApp
from datalayer_core.cli0.authn.whoamiapp import WhoamiApp
from datalayer_core.cli0.benchmarks.benchmarksapp import BenchmarksApp
from datalayer_core.cli0.base import DatalayerCLIBaseApp
from datalayer_core.cli0.environments.environmentsapp import EnvironmentsApp
from datalayer_core.cli0.runtimes.console.consoleapp import RuntimesConsoleApp
from datalayer_core.cli0.runtimes.runtimesapp import JupyterRuntimesApp
from datalayer_core.cli0.secrets.secretsapp import SecretsApp
from datalayer_core.cli0.snapshots.snapshotsapp import SnapshotsApp
from datalayer_core.cli0.tokens.tokensapp import TokensApp
from datalayer_core.web.webapp import DatalayerWebApp

HERE = Path(__file__).parent


class DatalayerCLI(DatalayerCLIBaseApp):
    """The main Datalayer CLI application."""

    description = """
      The Datalayer CLI application.
    """

    _requires_auth = False

    subcommands = {
        "about": (DatalayerAboutApp, DatalayerAboutApp.description.splitlines()[0]),
        "benchmarks": (BenchmarksApp, BenchmarksApp.description.splitlines()[0]),
        "console": (RuntimesConsoleApp, RuntimesConsoleApp.description.splitlines()[0]),
        "envs": (EnvironmentsApp, EnvironmentsApp.description.splitlines()[0]),
        "run": (JupyterRuntimesApp, JupyterRuntimesApp.description.splitlines()[0]),
        "runtimes": (
            JupyterRuntimesApp,
            JupyterRuntimesApp.description.splitlines()[0],
        ),
        "login": (DatalayerLoginApp, DatalayerLoginApp.description.splitlines()[0]),
        "logout": (DatalayerLogoutApp, DatalayerLogoutApp.description.splitlines()[0]),
        "secrets": (SecretsApp, SecretsApp.description.splitlines()[0]),
        "snapshots": (SnapshotsApp, SnapshotsApp.description.splitlines()[0]),
        "tokens": (TokensApp, TokensApp.description.splitlines()[0]),
        "web": (DatalayerWebApp, DatalayerWebApp.description.splitlines()[0]),
        "who": (WhoamiApp, WhoamiApp.description.splitlines()[0]),
        "whoami": (WhoamiApp, WhoamiApp.description.splitlines()[0]),
    }

    def start(self) -> None:
        """Start the CLI application."""
        try:
            super().start()
            self.log.info(
                f"One of `{'` `'.join(DatalayerCLI.subcommands.keys())}` must be specified."
            )
            self.exit(1)
        except NoStart:
            pass
        self.exit(0)


# -----------------------------------------------------------------------------
# Main entry point
# -----------------------------------------------------------------------------


main = launch_new_instance = DatalayerCLI.launch_instance


if __name__ == "__main__":
    main()
