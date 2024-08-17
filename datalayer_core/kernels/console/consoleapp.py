# Copyright (c) Datalayer Development Team.
# Distributed under the terms of the Modified BSD License.

import signal
import sys

from traitlets import CBool, Dict, Type, Unicode
from traitlets.config import catch_config_error, boolean_flag


from datalayer_core._version import __version__
from datalayer_core.cli.base import (
    DatalayerCLIBaseApp,
    datalayer_aliases,
    datalayer_flags,
)
from ..manager import KernelManager
from .shell import WSTerminalInteractiveShell


# -----------------------------------------------------------------------------
# Globals
# -----------------------------------------------------------------------------

_examples = """
jupyter kernels console # start the WS-based console
"""

# -----------------------------------------------------------------------------
# Flags and Aliases
# -----------------------------------------------------------------------------

# copy flags from mixin:
flags = dict(datalayer_flags)
flags.update(
    boolean_flag(
        "simple-prompt",
        "WSTerminalInteractiveShell.simple_prompt",
        "Force simple minimal prompt using `raw_input`",
        "Use a rich interactive prompt with prompt_toolkit",
    )
)
flags.update(
    boolean_flag(
        "confirm-exit",
        "KernelConsoleApp.confirm_exit",
        """Set to display confirmation dialog on exit. You can always use 'exit' or
       'quit', to force a direct exit without any confirmation. This can also
       be set in the config file by setting
       `c.KernelConsoleApp.confirm_exit`.
    """,
        """Don't prompt the user when exiting. This will terminate the kernel
       if it is owned by the frontend, and leave it alive if it is external.
       This can also be set in the config file by setting
       `c.KernelConsoleApp.confirm_exit`.
    """,
    )
)

# copy flags from mixin
aliases = dict(datalayer_aliases)

aliases.update(
    {
        "kernel": "KernelsConsoleApp.kernel_name",
    }
)

# -----------------------------------------------------------------------------
# Classes
# -----------------------------------------------------------------------------


class KernelsConsoleApp(DatalayerCLIBaseApp):
    """Start a terminal frontend to a remote kernel."""

    name = "jupyter-kernels-console"
    version = __version__

    description = """
        The Jupyter Kernels terminal-based Console.

        This launches a Console application inside a terminal.
    """
    examples = _examples

    classes = [WSTerminalInteractiveShell]
    flags = Dict(flags)
    aliases = Dict(aliases)

    subcommands = Dict()

    kernel_manager_class = Type(
        default_value=KernelManager,
        config=True,
        help="The kernel manager class to use.",
    )

    kernel_name = Unicode(
        "", config=True, help="""The name of the kernel to connect to."""
    )

    confirm_exit = CBool(
        True,
        config=True,
        help="""
        Set to display confirmation dialog on exit. You can always use 'exit' or 'quit',
        to force a direct exit without any confirmation.""",
    )

    force_interact = True

    def init_shell(self):
        # relay sigint to kernel
        signal.signal(signal.SIGINT, self.handle_sigint)
        self.shell = WSTerminalInteractiveShell.instance(
            parent=self,
            client=self.kernel_client,  # FIXME
            confirm_exit=self.confirm_exit,
        )
        self.shell.own_kernel = False  # not self.existing  # FIXME we always assume there is a remote kernel

    def handle_sigint(self, *args):
        if self.shell._executing:
            if self.kernel_manager:
                self.kernel_manager.interrupt_kernel()
            else:
                print(
                    "ERROR: Cannot interrupt kernels we didn't start.", file=sys.stderr
                )
        else:
            # raise the KeyboardInterrupt if we aren't waiting for execution,
            # so that the interact loop advances, and prompt is redrawn, etc.
            raise KeyboardInterrupt

    @catch_config_error
    def initialize(self, argv=None):
        """Do actions after construct, but before starting the app."""
        if getattr(self, "_dispatching", False):
            return
        DatalayerCLIBaseApp.initialize(self)

        self.kernel_manager = None
        self.kernel_client = None
        self.shell = None

        self.init_kernel_manager()
        self.init_kernel_client()

        if self.kernel_client.channels_running:
            # create the shell
            self.init_shell()
            # and draw the banner
            self.init_banner()

    def init_banner(self):
        """Optionally display the banner"""
        self.shell.show_banner()

    def init_kernel_manager(self) -> None:
        # Create a KernelManager.
        self.kernel_manager = self.kernel_manager_class(
            run_url=self.run_url,
            token=self.token,
            username=self.user_handle,
            parent=self,
        )

    def init_kernel_client(self) -> None:
        """Initialize the kernel client."""
        self.kernel_manager.start_kernel(kernel_name=self.kernel_name)
        self.kernel_client = self.kernel_manager.client()

        self.kernel_client.start_channels()

    def start(self):
        # JupyterApp.start dispatches on NoStart
        super(KernelsConsoleApp, self).start()
        try:
            if self.shell is None:
                return
            self.log.debug("Starting the jupyter console mainloop...")
            self.shell.mainloop()
        finally:
            self.kernel_client.stop_channels()


main = launch_new_instance = KernelsConsoleApp.launch_instance


if __name__ == "__main__":
    main()
