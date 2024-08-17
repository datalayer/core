# Copyright (c) Datalayer Development Team.
# Distributed under the terms of the Modified BSD License.

import json
import signal
import sys
import typing as t
from pathlib import Path

from traitlets import CBool, CFloat, Dict, Type, Unicode
from traitlets.config import catch_config_error, boolean_flag


from datalayer_core._version import __version__
from datalayer_core.cli.base import (
    DatalayerCLIBaseApp,
    datalayer_aliases,
    datalayer_flags,
)
from ..manager import KernelManager


# -----------------------------------------------------------------------------
# Globals
# -----------------------------------------------------------------------------

_examples = """
jupyter kernels exec <FILENAME> # Execute a text file on a remote kernel
jupyter kernels exec <NOTEBOOK> # Execute a notebook file on a remote kernel
"""

# -----------------------------------------------------------------------------
# Flags and Aliases
# -----------------------------------------------------------------------------

# copy flags from mixin:
flags = dict(datalayer_flags)
flags.update(
    {
        "verbose": (
            {"KernelExecApp": {"silent": False}},
            "Show all cell outputs.",
        )
    }
)
flags.update(
    boolean_flag(
        "raise",
        "KernelExecApp.raise_exceptions",
        "Stop executing a notebook if an exception occurs.",
        "Run all notebook cells.",
    )
)

# copy flags from mixin
aliases = dict(datalayer_aliases)

aliases.update(
    {
        "kernel": "KernelsExecApp.kernel_name",
        "timeout": "KernelsExecApp.timeout",
    }
)

# -----------------------------------------------------------------------------
# Classes
# -----------------------------------------------------------------------------


class KernelsExecApp(DatalayerCLIBaseApp):
    """Execute a file on a IPython remote kernel."""

    version = __version__

    description = """
        Execute a file or a notebook on a remote kernel

        jupyter kernels exec <FILE>
    """
    examples = _examples

    flags = Dict(flags)
    aliases = Dict(aliases)

    kernel_manager_class = Type(
        default_value=KernelManager,
        config=True,
        help="The kernel manager class to use.",
    )

    kernel_name = Unicode(
        "", config=True, help="""The name of the kernel to connect to."""
    )

    raise_exceptions = CBool(
        False,
        config=True,
        help="""Whether to raise when a cell produces an error or not.""",
    )

    silent = CBool(True, config=True, help="""Whether to hide cells output or not.""")

    timeout = CFloat(
        None,
        allow_none=True,
        config=True,
        help="""Execution timeout of the file or of each cell.""",
    )

    _executing: bool = False

    def handle_sigint(self, *args):
        if self._executing:
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

        self.init_kernel_manager()
        self.init_kernel_client()

        if self.kernel_client.channels_running:
            signal.signal(signal.SIGINT, self.handle_sigint)

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
        try:
            # JupyterApp.start dispatches on NoStart
            super(KernelsExecApp, self).start()
            if len(self.extra_args) != 3:  # FIXME why is exec an args?
                self.log.warning("A file to execute must be provided.")
                self.print_help()
                self.exit(1)

            filename = self.extra_args[2]
            fname = Path(filename).expanduser().resolve()

            # Make sure we can open the file
            try:
                with fname.open("rb"):
                    pass
            except BaseException:
                self.log.warning(f"Could not open file <{fname}> for safe execution.")
                return

            try:
                self._executing = True
                self.log.debug("Starting executing the file on the remote kernel...")
                for id, cell in _get_cells(fname):
                    reply = self.kernel_client.execute_interactive(
                        cell, silent=self.silent, timeout=self.timeout
                    )
                    if self.raise_exceptions and reply["content"]["status"] != "ok":
                        content = reply["content"]
                        if content["status"] == "error":
                            if id is not None:
                                self.log.error("Exception when running cell %s.", id)
                            sys.stderr.write("\n".join(content["traceback"]))
                            sys.exit(1)
                        else:
                            raise RuntimeError(
                                "Unknown failure: %s", json.dumps(content)
                            )
            except BaseException as e:
                if self.raise_exceptions:
                    raise
                self.log.warning(
                    "Unknown failure executing file: <%s>", fname, exc_info=e
                )
            finally:
                self._executing = False
        finally:
            self.kernel_client.stop_channels()


def _get_cells(filepath: Path) -> t.Iterator[tuple[str | None, str]]:
    """generator for sequence of code blocks to run"""
    if filepath.suffix == ".ipynb":
        from nbformat import read

        nb = read(filepath, as_version=4)
        if not nb.cells:
            return
        for cell in nb.cells:
            if cell.cell_type == "code":
                yield cell.id, cell.source
    else:
        yield None, filepath.read_text(encoding="utf-8")


main = launch_new_instance = KernelsExecApp.launch_instance


if __name__ == "__main__":
    main()
