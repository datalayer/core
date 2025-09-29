# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""Kernel manager for Datalayer runtimes."""

from __future__ import annotations

import re
from typing import Any

from jupyter_kernel_client.manager import REQUEST_TIMEOUT, KernelHttpManager
from jupyter_server.utils import url_path_join

from datalayer_core.client.client import DatalayerClient
from datalayer_core.utils.date import timestamp_to_local_date
from datalayer_core.displays.runtimes import display_runtimes


HTTP_PROTOCOL_REGEXP = re.compile(r"^http")


class RuntimeManager(KernelHttpManager):
    """
    Manages a single Runtime.

    Parameters
    ----------
    run_url : str
        The runtime URL.
    token : str
        Authentication token.
    username : str
        Username for the runtime.
    **kwargs : dict[str, Any]
        Additional keyword arguments.
    """

    def __init__(
        self, run_url: str, token: str, username: str, **kwargs: dict[str, Any]
    ):
        """
        Initialize the gateway Runtime manager.

        Parameters
        ----------
        run_url : str
            The runtime URL.
        token : str
            Authentication token.
        username : str
            Username for the runtime.
        **kwargs : dict[str, Any]
            Additional keyword arguments.
        """
        _ = kwargs.pop("kernel_id", None)  # kernel_id not supported
        super().__init__(server_url="", token="", username=username, **kwargs)
        self._kernel_id = ""
        self.run_url = run_url
        self.run_token = token
        self.username = username
        
        # Initialize DatalayerClient for modern API access
        self._client = DatalayerClient(run_url=run_url, token=token)

    @property
    def kernel_url(self) -> str | None:
        """
        Get the kernel URL.

        Returns
        -------
        str or None
            The kernel URL if available, None otherwise.
        """
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
    ) -> dict[str, Any] | None:
        """
        Start a kernel on Datalayer cloud.

        Parameters
        ----------
        name : str
            Runtime name.
        path : str
            [optional] API path from root to the cwd of the kernel.
        timeout : float
            Request timeout.

        Returns
        -------
        dict[str, Any] | None
            The kernel model.
        """
        if self.has_kernel:
            raise RuntimeError(
                "A kernel is already started. Shutdown it before starting a new one."
            )

        runtime_name = name
        runtime = None
        
        # Use DatalayerClient to get runtime information
        if runtime_name:
            # Get specific runtime by name
            runtimes = self._client.list_runtimes()
            for r in runtimes:
                if r.name == runtime_name:
                    runtime = {
                        "pod_name": r.pod_name,
                        "ingress": r.ingress,
                        "token": r.kernel_token,
                        "expired_at": r.expired_at,
                    }
                    break
        else:
            self.log.debug(
                "No Runtime name provided. Picking the first available Runtime…"
            )
            # Get list of available runtimes
            runtimes = self._client.list_runtimes()

            # If no runtime is running, let the user decide to start one from the first environment
            if not runtimes:
                environments = self._client.list_environments()
                if not environments:
                    raise RuntimeError("No environments available to create a runtime from.")
                    
                first_environment = environments[0]
                first_environment_name = first_environment.name

                # Calculate credits limit based on environment
                credits_limit = first_environment.burning_rate * 60.0 * 10.0  # 10 minutes default

                user_input = (
                    input(
                        f"No Runtime running.\nDo you want to launch a runtime from the environment {first_environment_name} with {credits_limit:.2f} reserved credits? (yes/no) [default: yes]: "
                    )
                    or "yes"
                )
                if user_input.lower() != "yes":
                    raise RuntimeError(
                        "No Runtime running. Please start one Runtime using `datalayer runtimes create <ENV_ID>`."
                    )

                # Create new runtime using the client
                new_runtime = self._client.create_runtime(
                    name=f"console-runtime-{first_environment_name}",
                    environment=first_environment_name,
                    time_reservation=10.0  # 10 minutes default
                )
                
                # Start the runtime to get connection details
                new_runtime._start()
                
                runtime = {
                    "pod_name": new_runtime.pod_name,
                    "ingress": new_runtime.ingress,
                    "token": new_runtime.kernel_token,
                    "expired_at": new_runtime.expired_at,
                }
                
                # Display the created runtime
                runtime_dict = {
                    'given_name': new_runtime.name,
                    'environment_name': new_runtime.environment,
                    'pod_name': new_runtime.pod_name,
                    'ingress': new_runtime.ingress,
                    'reservation_id': getattr(new_runtime, 'reservation_id', ''),
                    'uid': new_runtime.uid,
                    'burning_rate': getattr(new_runtime, 'burning_rate', 0.0),
                    'token': new_runtime.kernel_token,
                    'started_at': getattr(new_runtime, 'started_at', ''),
                    'expired_at': new_runtime.expired_at,
                }
                display_runtimes([runtime_dict])

                # Refresh runtime list
                runtimes = self._client.list_runtimes()

            # Use the first available runtime
            if runtimes:
                r = runtimes[0]
                runtime = {
                    "pod_name": r.pod_name,
                    "ingress": r.ingress,
                    "token": r.kernel_token,
                    "expired_at": r.expired_at,
                }
                runtime_name = r.pod_name or ""

        if runtime is None:
            raise RuntimeError("Unable to find a Runtime.")

        self.server_url = runtime["ingress"]
        self.token = runtime.get("token", "")

        # Get runtime information.
        from datalayer_core.utils.network import fetch
        response = fetch(f"{self.server_url}/api/kernels", token=self.token)
        kernels = response.json()
        if kernels:
            self._kernel_id = kernels[0]["id"]

        kernel_model = self.refresh_model()
        msg = f"RuntimeManager using existing runtime {runtime_name}"
        expired_at = runtime.get("expired_at")
        if expired_at is not None:
            msg += f" expiring at {timestamp_to_local_date(expired_at)}"
        self.log.info(msg)

        return kernel_model
