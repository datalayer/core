# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

import sys
from typing import Any

from datalayer_core.application import NoStart
from datalayer_core.cli.base import DatalayerCLIBaseApp


class RuntimesPauseMixin:
    """Mixin for pausing a Datalayer Runtime."""

    def _pause_runtime(self, runtime_id: str) -> dict[str, Any]:
        """Pause a Runtime with the given ID."""
        try:
            response = self._fetch(  # type: ignore
                "{}/api/runtimes/v1/runtimes/{}/pause".format(
                    self.run_url,  # type: ignore
                    runtime_id,
                ),
                method="POST",
            )
            return response.json()
        except RuntimeError as e:
            return {"success": False, "message": str(e)}


class RuntimesPauseApp(DatalayerCLIBaseApp, RuntimesPauseMixin):
    """Runtime Pause application."""

    description = """
      An application to stop a Runtime.
    """

    def start(self) -> None:
        try:
            super().start()
            self.log.info("Runtime Pause - not implemented.")
        except NoStart:
            pass

        # TODO: Implement the logic to pause a runtime.
        response = self._pause_runtime(runtime_id="")
        if response["success"]:
            sys.exit(0)
        else:
            sys.exit(1)
