# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

import warnings

from datalayer_core.cli.base import DatalayerCLIBaseApp


class RuntimesTerminateMixin:
    def _terminate_runtime(self, pod_name: str):
        """Terminate a Runtime with the given kernel ID."""
        response = self._fetch(
            "{}/api/runtimes/v1/kernels/{}".format(self.run_url, pod_name),
            method="DELETE",
        )
        return response.status_code == 204


class RuntimesTerminateApp(DatalayerCLIBaseApp, RuntimesTerminateMixin):
    """Runtime Terminate application."""

    description = """
      An application to terminate a Runtime.

      jupyter kernels terminate RUNTIME_ID
    """

    def start(self):
        """Start the app."""
        if len(self.extra_args) > 1:  # pragma: no cover
            warnings.warn("Too many arguments were provided for Runtime terminate.")
            self.print_help()
            self.exit(1)

        kernel_id = self.extra_args[0]
        self._terminate_runtime(kernel_id)
        self.log.info(f"Runtime '{kernel_id}' deleted.")
