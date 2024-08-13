# Copyright (c) Datalayer Development Team.
# Distributed under the terms of the Modified BSD License.

from pathlib import Path

from datalayer_core.authn.apps.loginapp import DatalayerLoginApp
from datalayer_core.authn.apps.logoutapp import DatalayerLogoutApp
from datalayer_core.authn.apps.whoamiapp import KernelWhoamiApp

from datalayer_core.about.aboutapp import DatalayerAboutApp

from datalayer_core.kernels.kernelsapp import JupyterKernelsApp

from datalayer_core.cli.base import DatalayerCLIBaseApp

from datalayer_core._version import __version__


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
