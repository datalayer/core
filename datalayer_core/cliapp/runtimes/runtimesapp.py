# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""Main application for runtime management commands."""

from datalayer_core.base.application import NoStart
from datalayer_core.cliapp.base import DatalayerCLIBaseApp
from datalayer_core.cliapp.runtimes.console.consoleapp import RuntimesConsoleApp
from datalayer_core.cliapp.runtimes.create.createapp import RuntimesCreateApp
from datalayer_core.cliapp.runtimes.exec.execapp import RuntimesExecApp
from datalayer_core.cliapp.runtimes.list.listapp import RuntimesListApp
from datalayer_core.cliapp.runtimes.pause.pauseapp import RuntimesPauseApp
from datalayer_core.cliapp.runtimes.start.startapp import RuntimesStartApp
from datalayer_core.cliapp.runtimes.stop.stopapp import RuntimesStopApp
from datalayer_core.cliapp.runtimes.terminate.terminateapp import RuntimesTerminateApp
from datalayer_core.cliapp.runtimes.web.webapp import RuntimesWebApp


class JupyterRuntimesApp(DatalayerCLIBaseApp):
    """
    Main application for runtime management with subcommands.

    This application provides subcommands for managing Datalayer runtimes
    including create, start, stop, pause, terminate, exec, list, console, and web.
    """

    description = """
      The Runtimes CLI application.
    """

    _requires_auth = False

    subcommands = {
        "console": (RuntimesConsoleApp, RuntimesConsoleApp.description.splitlines()[0]),
        "create": (RuntimesCreateApp, RuntimesCreateApp.description.splitlines()[0]),
        "exec": (RuntimesExecApp, RuntimesExecApp.description.splitlines()[0]),
        "list": (RuntimesListApp, RuntimesListApp.description.splitlines()[0]),
        "ls": (RuntimesListApp, RuntimesListApp.description.splitlines()[0]),
        "pause": (RuntimesPauseApp, RuntimesPauseApp.description.splitlines()[0]),
        "start": (RuntimesStartApp, RuntimesStartApp.description.splitlines()[0]),
        "stop": (RuntimesStopApp, RuntimesStopApp.description.splitlines()[0]),
        "terminate": (
            RuntimesTerminateApp,
            RuntimesTerminateApp.description.splitlines()[0],
        ),
        "web": (RuntimesWebApp, RuntimesWebApp.description.splitlines()[0]),
    }

    def start(self) -> None:
        """
        Start the runtimes application.

        Shows available subcommands if no subcommand is specified.
        """
        try:
            super().start()
            self.log.info(
                f"One of `{'` `'.join(JupyterRuntimesApp.subcommands.keys())}` must be specified."
            )
            self.exit(1)
        except NoStart:
            pass
        self.exit(0)
