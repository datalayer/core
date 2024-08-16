# Copyright (c) Datalayer Development Team.
# Distributed under the terms of the Modified BSD License.

from datalayer_core.authn.apps.loginapp import DatalayerLoginApp
from datalayer_core.authn.apps.logoutapp import DatalayerLogoutApp

from datalayer_core.kernels.console.consoleapp import KernelConsoleApp
from datalayer_core.kernels.create.createapp import KernelCreateApp
from datalayer_core.kernels.exec.execapp import KernelExecApp
from datalayer_core.kernels.list.listapp import KernelListApp
from datalayer_core.kernels.pause.pauseapp import KernelPauseApp
from datalayer_core.kernels.start.startapp import KernelStartApp
from datalayer_core.kernels.stop.stopapp import KernelStopApp
from datalayer_core.kernels.terminate.terminateapp import KernelTerminateApp

from datalayer_core.cli.base import DatalayerCLIBaseApp

from datalayer_core._version import __version__


class JupyterKernelsApp(DatalayerCLIBaseApp):
    description = """
      The Jupyter Kernels CLI application.
    """

    _requires_auth = False


    subcommands = {
        "console": (KernelConsoleApp, KernelConsoleApp.description.splitlines()[0]),
        "create": (KernelCreateApp, KernelCreateApp.description.splitlines()[0]),
        "exec": (KernelExecApp, KernelExecApp.description.splitlines()[0]),
        "list": (KernelListApp, KernelListApp.description.splitlines()[0]),
        "login": (DatalayerLoginApp, DatalayerLoginApp.description.splitlines()[0]),
        "logout": (DatalayerLogoutApp, DatalayerLogoutApp.description.splitlines()[0]),
        "pause": (KernelPauseApp, KernelPauseApp.description.splitlines()[0]),
        "start": (KernelStartApp, KernelStartApp.description.splitlines()[0]),
        "stop": (KernelStopApp, KernelStopApp.description.splitlines()[0]),
        "terminate": (KernelTerminateApp, KernelTerminateApp.description.splitlines()[0]),
    }
