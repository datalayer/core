# Copyright (c) Datalayer Development Team.
# Distributed under the terms of the Modified BSD License.

import asyncio
from jupyter_console.ptshell import ZMQTerminalInteractiveShell
from jupyter_console.utils import ensure_async
from traitlets import (
    default,
    Instance,
)

from datalayer_core._version import __version__


class WSTerminalInteractiveShell(ZMQTerminalInteractiveShell):
    manager = Instance(
        "datalayer_core.kernels.manager.KernelManager", allow_none=True
    )
    client = Instance(
        "datalayer_core.kernels.client.KernelClient", allow_none=True
    )

    @default("banner")
    def _default_banner(self):
        # FIXME
        return "Datalayer - Jupyter Kernel console {version}\n\n{kernel_banner}"

    async def handle_external_iopub(self, loop=None):
        while self.keep_running:
            # we need to check for keep_running from time to time
            poll_result = await ensure_async(self.client.iopub_channel.msg_ready)
            if poll_result:
                self.handle_iopub()
            await asyncio.sleep(0.5)

    def show_banner(self):
        print(
            self.banner.format(
                version=__version__, kernel_banner=self.kernel_info.get("banner", "")
            ),
            end="",
            flush=True,
        )

    def check_complete(self, code: str) -> tuple[bool, str]:
        r = super().check_complete(code)
        if self.use_kernel_is_complete:
            # Flush iopub linked to complete request
            # Without this, handling input does not work
            self.handle_iopub()
        return r
