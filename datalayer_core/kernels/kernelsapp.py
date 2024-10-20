# Copyright (c) Datalayer Development Team.
# Distributed under the terms of the Modified BSD License.

from datalayer_core.application import NoStart

from datalayer_core.kernels.console.consoleapp import KernelsConsoleApp
from datalayer_core.kernels.create.createapp import KernelsCreateApp
from datalayer_core.kernels.exec.execapp import KernelsExecApp
from datalayer_core.kernels.list.listapp import KernelsListApp
from datalayer_core.kernels.pause.pauseapp import KernelsPauseApp
from datalayer_core.kernels.start.startapp import KernelsStartApp
from datalayer_core.kernels.stop.stopapp import KernelsStopApp
from datalayer_core.kernels.terminate.terminateapp import KernelsTerminateApp
from datalayer_core.kernels.web.webapp import KernelsWebApp

from datalayer_core.cli.base import DatalayerCLIBaseApp

from datalayer_core._version import __version__


class JupyterKernelsApp(DatalayerCLIBaseApp):
    description = """
      The Jupyter Kernels CLI application.
    """

    _requires_auth = False

    subcommands = {
        "console": (KernelsConsoleApp, KernelsConsoleApp.description.splitlines()[0]),
        "create": (KernelsCreateApp, KernelsCreateApp.description.splitlines()[0]),
        "exec": (KernelsExecApp, KernelsExecApp.description.splitlines()[0]),
        "list": (KernelsListApp, KernelsListApp.description.splitlines()[0]),
        "ls": (KernelsListApp, KernelsListApp.description.splitlines()[0]),
        "pause": (KernelsPauseApp, KernelsPauseApp.description.splitlines()[0]),
        "start": (KernelsStartApp, KernelsStartApp.description.splitlines()[0]),
        "stop": (KernelsStopApp, KernelsStopApp.description.splitlines()[0]),
        "terminate": (KernelsTerminateApp, KernelsTerminateApp.description.splitlines()[0]),
        "web": (KernelsWebApp, KernelsWebApp.description.splitlines()[0]),
    }

    def start(self):
        try:
            super().start()
            self.log.info(f"One of `{'` `'.join(JupyterKernelsApp.subcommands.keys())}` must be specified.")
            self.exit(1)
        except NoStart:
            pass
        self.exit(0)
