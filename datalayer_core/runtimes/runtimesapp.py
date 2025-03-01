# Copyright (c) 2023-2024 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

# Copyright (c) Datalayer Development Team.
# Distributed under the terms of the Modified BSD License.

from datalayer_core.application import NoStart

from datalayer_core.runtimes.console.consoleapp import RuntimesConsoleApp
from datalayer_core.runtimes.create.createapp import RuntimesCreateApp
from datalayer_core.runtimes.exec.execapp import RuntimesExecApp
from datalayer_core.runtimes.list.listapp import RuntimesListApp
from datalayer_core.runtimes.pause.pauseapp import RuntimesPauseApp
from datalayer_core.runtimes.start.startapp import RuntimesStartApp
from datalayer_core.runtimes.stop.stopapp import RuntimesStopApp
from datalayer_core.runtimes.terminate.terminateapp import RuntimesTerminateApp
from datalayer_core.runtimes.web.webapp import RuntimesWebApp

from datalayer_core.cli.base import DatalayerCLIBaseApp

from datalayer_core.__version__ import __version__


class JupyterRuntimesApp(DatalayerCLIBaseApp):
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
        "terminate": (RuntimesTerminateApp, RuntimesTerminateApp.description.splitlines()[0]),
        "web": (RuntimesWebApp, RuntimesWebApp.description.splitlines()[0]),
    }

    def start(self):
        try:
            super().start()
            self.log.info(f"One of `{'` `'.join(JupyterRuntimesApp.subcommands.keys())}` must be specified.")
            self.exit(1)
        except NoStart:
            pass
        self.exit(0)
