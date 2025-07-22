# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

import sys
from typing import Any

from datalayer_core.application import NoStart
from datalayer_core.cli.base import DatalayerCLIBaseApp


class RuntimeStartMixin:
    """Mixin for starting a Datalayer Runtime."""

    def _start_runtime(self, runtime_id: str) -> dict[str, Any]:
        """Start a Runtime with the given ID."""
        try:
            response = self._fetch(  # type: ignore
                "{}/api/runtimes/v1/runtimes/{}/start".format(
                    self.run_url,  # type: ignore
                    runtime_id,
                ),
                method="POST",
            )
            return response.json()
        except RuntimeError as e:
            return {"success": False, "message": str(e)}


class RuntimesStartApp(DatalayerCLIBaseApp, RuntimeStartMixin):
    """Runtime Start application."""

    description = """
      An application to start a Runtime.
    """

    def start(self) -> None:
        try:
            super().start()
            self.log.info("Runtime Start - not implemented.")
        except NoStart:
            pass

        # TODO: Implement the logic to start a runtime.
        response = self._start_runtime(runtime_id="")
        if response["success"]:
            sys.exit(0)
        else:
            sys.exit(1)
