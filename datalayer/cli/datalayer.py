# Copyright (c) Datalayer Development Team.
# Distributed under the terms of the Modified BSD License.

from pathlib import Path

from datalayer.authn.apps.loginapp import DatalayerLoginApp
from datalayer.authn.apps.logoutapp import DatalayerLogoutApp

from datalayer.kernels.about.aboutapp import KernelAboutApp
from datalayer.kernels.console.consoleapp import KernelConsoleApp
from datalayer.kernels.create.createapp import KernelCreateApp
from datalayer.kernels.exec.execapp import KernelExecApp
from datalayer.kernels.list.listapp import KernelListApp
from datalayer.kernels.pause.pauseapp import KernelPauseApp
from datalayer.kernels.envs.envssapp import KernelEnvironmentsApp
from datalayer.kernels.start.startapp import KernelStartApp
from datalayer.kernels.stop.stopapp import KernelStopApp
from datalayer.kernels.terminate.terminateapp import KernelTerminateApp
from datalayer.authn.apps.whoamiapp import KernelWhoamiApp

from datalayer.cli.base import DatalayerCLIBase

from datalayer._version import __version__


HERE = Path(__file__).parent


class DatalayerCLI(DatalayerCLIBase):
    description = """
      The Datalayer CLI application.
    """

    _requires_auth = False


    subcommands = {
        "about": (KernelAboutApp, KernelAboutApp.description.splitlines()[0]),
        "console": (KernelConsoleApp, KernelConsoleApp.description.splitlines()[0]),
        "create": (KernelCreateApp, KernelCreateApp.description.splitlines()[0]),
        "exec": (KernelExecApp, KernelExecApp.description.splitlines()[0]),
        "list": (KernelListApp, KernelListApp.description.splitlines()[0]),
        "login": (DatalayerLoginApp, DatalayerLoginApp.description.splitlines()[0]),
        "logout": (DatalayerLogoutApp, DatalayerLogoutApp.description.splitlines()[0]),
        "pause": (KernelPauseApp, KernelPauseApp.description.splitlines()[0]),
        "envs": (KernelEnvironmentsApp, KernelEnvironmentsApp.description.splitlines()[0]),
        "start": (KernelStartApp, KernelStartApp.description.splitlines()[0]),
        "stop": (KernelStopApp, KernelStopApp.description.splitlines()[0]),
        "terminate": (KernelTerminateApp, KernelTerminateApp.description.splitlines()[0]),
        "whoami": (KernelWhoamiApp, KernelWhoamiApp.description.splitlines()[0]),
    }


# -----------------------------------------------------------------------------
# Main entry point
# -----------------------------------------------------------------------------


main = launch_new_instance = DatalayerCLI.launch_instance


if __name__ == "__main__":
    main()
