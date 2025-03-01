# Copyright (c) 2023-2024 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

# Copyright (c) Datalayer Development Team.
# Distributed under the terms of the Modified BSD License.

import typing as t

from jupyter_core.application import JupyterApp
from jupyter_kernel_client.konsoleapp import (
    KonsoleApp,
    aliases as base_aliases,
    flags as base_flags,
)
from traitlets import default
from traitlets.config import catch_config_error

from ...__version__ import __version__
from ...cli.base import DatalayerAuthMixin
from ..manager import RuntimeManager


datalayer_aliases = dict(base_aliases)
datalayer_aliases["run-url"] = "DatalayerAuthMixin.run_url"
datalayer_aliases["token"] = "DatalayerAuthMixin.token"
datalayer_aliases["external-token"] = "DatalayerAuthMixin.external_token"

datalayer_flags = dict(base_flags)
datalayer_flags.update(
    {
        "no-browser": (
            {"DatalayerAuthMixin": {"no_browser": True}},
            "Will prompt for user and password on the CLI.",
        )
    }
)


class RuntimesConsoleApp(DatalayerAuthMixin, KonsoleApp):
    """Console for Datalayer remote kernels."""

    name = "datalayer-console"
    version = __version__

    aliases = datalayer_aliases

    flags = datalayer_flags

    @default("kernel_manager_class")
    def _kernel_manager_class_default(self) -> type:
        return RuntimeManager

    @default("kernel_name")
    def _kernel_name_default(self) -> str:
        # Don't set a default kernel name
        return ""

    @catch_config_error
    def initialize(self, argv: t.Any = None) -> None:
        """Do actions after construct, but before starting the app."""
        super(JupyterApp, self).initialize(argv)

        if self.token is None:
            self.user_handle = None

        if getattr(self, "_dispatching", False):
            return

        self._log_in()

        self.kernel_client = None
        self.shell = None

        self.init_kernel_manager()
        self.init_kernel_client()

        if self.kernel_client.client.channels_running:
            # create the shell
            self.init_shell()
            # and draw the banner
            self.init_banner()

    def init_kernel_manager(self) -> None:
        """Initialize the kernel manager."""
        # Create a RuntimeManager and start a kernel.
        self.kernel_client = self.kernel_manager_class(
            parent=self,
            run_url=self.run_url,
            token=self.token or "",
            username=self.user_handle or "",
        )

        if not self.existing:
            self.kernel_client.start_kernel(
                name=self.kernel_name, path=self.kernel_path
            )
        elif self.kernel_client.kernel is None:
            msg = f"Unable to connect to kernel with ID {self.existing}."
            raise RuntimeError(msg)

    def init_shell(self):
        super().init_shell()
        # Force `own_kernel` to False to prevent shutting down the kernel
        # on exit
        self.shell.own_kernel = False


main = launch_new_instance = RuntimesConsoleApp.launch_instance


if __name__ == "__main__":
    main()
