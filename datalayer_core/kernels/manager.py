# Copyright (c) Datalayer Development Team.
# Distributed under the terms of the Modified BSD License.

from __future__ import annotations

import re

from jupyter_kernel_client.manager import REQUEST_TIMEOUT, KernelHttpManager
from jupyter_server.utils import url_path_join

from datalayer_core.kernels.utils import _timestamp_to_local_date
from datalayer_core.utils.utils import fetch

HTTP_PROTOCOL_REGEXP = re.compile(r"^http")


class KernelManager(KernelHttpManager):
    """Manages a single kernel remotely."""

    def __init__(self, run_url: str, token: str, username: str, **kwargs):
        """Initialize the gateway kernel manager."""
        _ = kwargs.pop("kernel_id", None)  # kernel_id not supported
        super().__init__(server_url="", token="", username=username, **kwargs)
        self._kernel_id = ""
        self.run_url = run_url
        self.run_token = token
        self.username = username

    @property
    def kernel_url(self) -> str | None:
        if self.kernel:
            kernel_id = self.kernel["id"]
            return url_path_join(self.server_url, "api/kernels", kernel_id)
        elif self._kernel_id:
            return url_path_join(self.server_url, "api/kernels", self._kernel_id)
        else:
            return None

    # --------------------------------------------------------------------------
    # Kernel management
    # --------------------------------------------------------------------------
    def start_kernel(
        self, name: str = "", path: str | None = None, timeout: float = REQUEST_TIMEOUT
    ):
        """Starts a kernel on Datalayer cloud.

        Parameters
        ----------
            name : str
                Kernel name
            path : str
                [optional] API path from root to the cwd of the kernel
            timeout : float
                Request timeout
        Returns
        -------
            The kernel model
        """
        if self.has_kernel:
            raise RuntimeError(
                "A kernel is already started. Shutdown it before starting a new one."
            )

        kernel_name = name
        kernel = None
        if kernel_name:
            response = fetch(
                "{}/api/jupyter/v1/kernels/{}".format(self.run_url, kernel_name),
                token=self.run_token,
            )
            kernel = response.json().get("kernel")
        else:
            self.log.debug(
                "No kernel name provided. Picking the first available remote kernel…"
            )
            response = fetch(
                "{}/api/jupyter/v1/kernels".format(self.run_url),
                token=self.run_token,
            )
            kernels = response.json().get("kernels", [])
            if len(kernels) == 0:
                raise RuntimeError(
                    "No remote kernel running. Please start one kernel using `jupyter kernel create <ENV_ID>`."
                )
            kernel = kernels[0]
            kernel_name = kernel.get("jupyter_pod_name", "")

        if kernel is None:
            raise RuntimeError("Unable to find a remote kernel.")

        self.server_url = kernel["ingress"]
        self.token = kernel.get("token", "")

        # Trick to set the kernel_url without the ability to set self.__kernel
        response = fetch(f"{self.server_url}/api/kernels", token=self.token)
        kernels = response.json()
        self._kernel_id = kernels[0]["id"]

        kernel_model = self.refresh_model()
        msg = f"KernelManager using existing jupyter kernel {kernel_name}"
        expired_at = kernel.get("expired_at")
        if expired_at is not None:
            msg += f" expiring at {_timestamp_to_local_date(expired_at)}"
        self.log.info(msg)

        return kernel_model
