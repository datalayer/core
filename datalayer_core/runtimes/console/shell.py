# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""WebSocket terminal interactive shell for Datalayer Core."""

import asyncio
from typing import Any, Optional

from jupyter_console.ptshell import ZMQTerminalInteractiveShell
from jupyter_console.utils import ensure_async
from traitlets import (
    Instance,
    default,
)

from datalayer_core.__version__ import __version__


class WSTerminalInteractiveShell(ZMQTerminalInteractiveShell):
    """WebSocket terminal interactive shell extending ZMQTerminalInteractiveShell."""

    manager = Instance(
        "datalayer_core.runtimes.manager.RuntimeManager", allow_none=True
    )
    """Runtime manager instance."""
    client = Instance("datalayer_core.runtimes.client.RuntimeClient", allow_none=True)
    """Runtime client instance."""

    @default("banner")
    def _default_banner(self) -> str:
        """
        Get the default banner for the terminal.

        Returns
        -------
        str
            The default banner string.
        """
        # FIXME
        return "Datalayer - Runtime console {version}\n\n{kernel_banner}"

    async def handle_external_iopub(self, loop: Optional[Any] = None) -> None:
        """
        Handle external IOPub messages asynchronously.

        Parameters
        ----------
        loop : Optional[Any]
            The event loop to use for handling messages.
        """
        while self.keep_running:
            # we need to check for keep_running from time to time
            poll_result = await ensure_async(self.client.iopub_channel.msg_ready)
            if poll_result:
                self.handle_iopub()
            await asyncio.sleep(0.5)

    def show_banner(self) -> None:
        """Display the terminal banner."""
        print(
            self.banner.format(
                version=__version__, kernel_banner=self.kernel_info.get("banner", "")
            ),
            end="",
            flush=True,
        )

    def check_complete(self, code: str) -> tuple[bool, str]:
        """
        Check if the code is complete for execution.

        Parameters
        ----------
        code : str
            The code to check for completeness.

        Returns
        -------
        tuple[bool, str]
            A tuple containing completion status and indent string.
        """
        r = super().check_complete(code)
        if self.use_kernel_is_complete:
            # Flush iopub linked to complete request
            # Without this, handling input does not work
            self.handle_iopub()
        return r
