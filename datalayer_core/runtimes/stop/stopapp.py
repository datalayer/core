# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

import sys
from typing import Any

from datalayer_core.application import NoStart
from datalayer_core.cli.base import DatalayerCLIBaseApp


class RuntimesStopMixin:
    """Mixin for stopping a Datalayer Runtime."""

    def _stop_runtime(self, runtime_id: str) -> dict[str, Any]:
        """Stop a Runtime with the given ID."""
        try:
            response = self._fetch(  # type: ignore
                "{}/api/runtimes/v1/runtimes/{}/stop".format(
                    self.run_url,  # type: ignore
                    runtime_id,
                ),
                method="POST",
            )
            return response.json()
        except RuntimeError as e:
            return {"success": False, "message": str(e)}


class RuntimesStopApp(DatalayerCLIBaseApp, RuntimesStopMixin):
    """Runtime Stop application."""

    description = """
      An application to stop a Runtime.
    """

    def start(self) -> None:
        try:
            super().start()
            self.log.info("Runtime Stop - not implemented.")
        except NoStart:
            pass
        self.exit(0)

        # TODO: Implement the logic to stop a runtime.
        response = self._stop_runtime(runtime_id="")
        if response["success"]:
            sys.exit(0)
        else:
            sys.exit(1)
