# Copyright (c) Datalayer Development Team.
# Distributed under the terms of the Modified BSD License.

from pathlib import Path

from datalayer.authn.apps.loginapp import DatalayerLoginApp
from datalayer.authn.apps.logoutapp import DatalayerLogoutApp
from datalayer.authn.apps.whoamiapp import KernelWhoamiApp

from datalayer.about.aboutapp import DatalayerAboutApp

from datalayer.kernels.kernelsapp import JupyterKernelsApp

from datalayer.cli.base import DatalayerCLIBaseApp

from datalayer._version import __version__


HERE = Path(__file__).parent


class DatalayerCLI(DatalayerCLIBaseApp):
    description = """
      The Datalayer CLI application.
    """

    _requires_auth = False


    subcommands = {
        "about": (DatalayerAboutApp, DatalayerAboutApp.description.splitlines()[0]),
        "kernels": (JupyterKernelsApp, JupyterKernelsApp.description.splitlines()[0]),
        "login": (DatalayerLoginApp, DatalayerLoginApp.description.splitlines()[0]),
        "logout": (DatalayerLogoutApp, DatalayerLogoutApp.description.splitlines()[0]),
        "whoami": (KernelWhoamiApp, KernelWhoamiApp.description.splitlines()[0]),
    }


# -----------------------------------------------------------------------------
# Main entry point
# -----------------------------------------------------------------------------


main = launch_new_instance = DatalayerCLI.launch_instance


if __name__ == "__main__":
    main()
