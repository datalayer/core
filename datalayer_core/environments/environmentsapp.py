# Copyright (c) Datalayer Development Team.
# Distributed under the terms of the Modified BSD License.

from datalayer_core.environments.envs.envssapp import KernelEnvironmentsListApp

from datalayer_core.cli.base import DatalayerCLIBaseApp

from datalayer_core._version import __version__


class JupyterEnvironmentsApp(DatalayerCLIBaseApp):
    description = """
      The Jupyter Kernels CLI application.
    """

    _requires_auth = False


    subcommands = {
        "list": (KernelEnvironmentsListApp, KernelEnvironmentsListApp.description.splitlines()[0]),
    }
