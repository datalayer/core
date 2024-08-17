# Copyright (c) Datalayer Development Team.
# Distributed under the terms of the Modified BSD License.

from datalayer_core.authn.apps.loginapp import DatalayerLoginApp
from datalayer_core.authn.apps.logoutapp import DatalayerLogoutApp

from datalayer_core.kernels.console.consoleapp import KernelsConsoleApp
from datalayer_core.kernels.create.createapp import KernelsCreateApp
from datalayer_core.kernels.exec.execapp import KernelsExecApp
from datalayer_core.kernels.list.listapp import KernelsListApp
from datalayer_core.kernels.pause.pauseapp import KernelsPauseApp
from datalayer_core.kernels.start.startapp import KernelsStartApp
from datalayer_core.kernels.stop.stopapp import KernelsStopApp
from datalayer_core.kernels.terminate.terminateapp import KernelsTerminateApp

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
        "login": (DatalayerLoginApp, DatalayerLoginApp.description.splitlines()[0]),
        "logout": (DatalayerLogoutApp, DatalayerLogoutApp.description.splitlines()[0]),
        "pause": (KernelsPauseApp, KernelsPauseApp.description.splitlines()[0]),
        "start": (KernelsStartApp, KernelsStartApp.description.splitlines()[0]),
        "stop": (KernelsStopApp, KernelsStopApp.description.splitlines()[0]),
        "terminate": (KernelsTerminateApp, KernelsTerminateApp.description.splitlines()[0]),
    }
