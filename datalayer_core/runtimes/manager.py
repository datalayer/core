# Copyright (c) 2023-2024 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

# Copyright (c) Datalayer Development Team.
# Distributed under the terms of the Modified BSD License.

from __future__ import annotations

import re

from rich import print_json

from jupyter_kernel_client.manager import REQUEST_TIMEOUT, KernelHttpManager
from jupyter_server.utils import url_path_join

from datalayer_core.runtimes.utils import _timestamp_to_local_date
from datalayer_core.utils.utils import fetch
from datalayer_core.runtimes.utils import display_kernels, get_default_credits_limit

HTTP_PROTOCOL_REGEXP = re.compile(r"^http")


class RuntimeManager(KernelHttpManager):
    """Manages a single Runtime."""

    def __init__(self, run_url: str, token: str, username: str, **kwargs):
        """Initialize the gateway Runtime manager."""
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
    # Runtime management
    # --------------------------------------------------------------------------
    def start_kernel(
        self, name: str = "", path: str | None = None, timeout: float = REQUEST_TIMEOUT
    ):
        """Starts a kernel on Datalayer cloud.

        Parameters
        ----------
            name : str
                Runtime name
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
                "No Runtime name provided. Picking the first available Runtime…"
            )
            response = fetch(
                "{}/api/jupyter/v1/kernels".format(self.run_url),
                token=self.run_token,
            )
            kernels = response.json().get("kernels", [])
            
            # If no runtime is running, let the user decide to start one from the first environment
            if not kernels:
                response_environments = fetch(
                    f"{self.run_url}/api/jupyter/v1/environments",
                    token=self.run_token,
                )
                environments = response_environments.json().get("environments", [])
                first_environment = environments[0]
                first_environment_name = first_environment.get("name")

                response_credits = fetch(
                    f"{self.run_url}/api/iam/v1/usage/credits",
                    method="GET",
                    token=self.run_token,
                )
                raw_credits = response_credits.json()
                credits_limit = get_default_credits_limit(raw_credits["reservations"], raw_credits["credits"])

                user_input = input(
                    f"No Runtime running.\nDo you want to launch a runtime from the environment {first_environment_name} with {credits_limit:.2f} reserved credits? (yes/no) [default: yes]: "
                ) or "yes"
                if user_input.lower() != "yes":
                    raise RuntimeError(
                        "No Runtime running. Please start one Runtime using `datalayer runtimes create <ENV_ID>`."
                    )

                body = {
                    "kernel_type": "notebook",
                    "credits_limit": credits_limit,
                    "environment_name": first_environment_name,
                }
                response = fetch(
                    f"{self.run_url}/api/jupyter/v1/kernels",
                    method="POST",
                    token=self.run_token,
                    json=body,
                )
                kernel = response.json().get("kernel")
                if kernel:
                    display_kernels([kernel])
                else:
                    print_json(data=response.json())

                response = fetch(
                    f"{self.run_url}/api/jupyter/v1/kernels",
                    token=self.run_token,
                )
                kernels = response.json().get("kernels", [])
                    
            kernel = kernels[0]
            kernel_name = kernel.get("jupyter_pod_name", "")

        if kernel is None:
            raise RuntimeError("Unable to find a Runtime.")

        self.server_url = kernel["ingress"]
        self.token = kernel.get("token", "")

        # Trick to set the kernel_url without the ability to set self.__kernel
        response = fetch(f"{self.server_url}/api/kernels", token=self.token)
        kernels = response.json()
        self._kernel_id = kernels[0]["id"]

        kernel_model = self.refresh_model()
        msg = f"RuntimeManager using existing jupyter kernel {kernel_name}"
        expired_at = kernel.get("expired_at")
        if expired_at is not None:
            msg += f" expiring at {_timestamp_to_local_date(expired_at)}"
        self.log.info(msg)

        return kernel_model
