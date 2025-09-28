# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""Runtime termination functionality."""

import sys
from typing import Any

from datalayer_core.cli0.base import DatalayerCLIBaseApp


class RuntimesTerminateMixin:
    """
    Mixin for terminating Datalayer runtimes.
    """

    def _terminate_runtime(self, pod_name: str) -> dict[str, Any]:
        """
        Terminate a Runtime with the given kernel ID.

        Parameters
        ----------
        pod_name : str
            The pod name of the runtime to terminate.

        Returns
        -------
        dict[str, Any]
            Response containing termination status.
        """
        try:
            response = self._fetch(  # type: ignore
                "{}/api/runtimes/v1/runtimes/{}".format(self.run_url, pod_name),  # type: ignore
                method="DELETE",
            )
            return {
                "success": response.status_code == 204,
                "message": "Runtime terminated successfully.",
            }

        except RuntimeError:
            return {"success": False, "message": "Failed to terminate the runtime."}


class RuntimesTerminateApp(DatalayerCLIBaseApp, RuntimesTerminateMixin):
    """Runtime Terminate application."""

    description = """
      An application to terminate a Runtime.

      jupyter kernels terminate RUNTIME_ID
    """

    def start(self) -> None:
        """Start the app."""
        if len(self.extra_args) > 1:  # pragma: no cover
            self.log.warn("Too many arguments were provided for Runtime terminate.")
            self.print_help()
            self.exit(1)

        kernel_id = self.extra_args[0]
        response = self._terminate_runtime(kernel_id)
        if response["success"]:
            self.log.info(f"Runtime '{kernel_id}' deleted.")
            sys.exit(0)
        else:
            self.log.error(f"Failed to delete Runtime '{kernel_id}'.")
            sys.exit(1)
