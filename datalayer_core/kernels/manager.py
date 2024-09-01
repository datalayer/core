# Copyright (c) Datalayer Development Team.
# Distributed under the terms of the Modified BSD License.

from __future__ import annotations

import datetime
import re
import typing as t

from jupyter_server.utils import url_path_join
from jupyter_server._tz import UTC, utcnow
from requests.exceptions import HTTPError
from traitlets import DottedObjectName, Type
from traitlets.config import LoggingConfigurable

from datalayer_core.kernels.utils import _timestamp_to_local_date
from datalayer_core.utils.utils import fetch


HTTP_PROTOCOL_REGEXP = re.compile(r"^http")


class KernelManager(LoggingConfigurable):
    """Manages a single kernel remotely."""

    def __init__(self, run_url: str, token: str, username: str, **kwargs):
        """Initialize the gateway kernel manager."""
        super().__init__(**kwargs)
        self.run_url = run_url
        self.token = token
        self.username = username
        self.kernel_url: str = ""
        self.kernel_id: str = ""
        self.kernel: dict | None = None
        self.kernel_token: str = ""
        # simulate busy/activity markers
        self.execution_state = "starting"
        self.last_activity = utcnow()

    @property
    def has_kernel(self):
        """Has a kernel been started that we are managing."""
        return self.kernel is not None

    client_class = DottedObjectName("datalayer_core.kernels.client.KernelClient")
    client_factory = Type(klass="datalayer_core.kernels.client.KernelClient")

    # --------------------------------------------------------------------------
    # create a Client connected to our Kernel
    # --------------------------------------------------------------------------

    def client(self, **kwargs):
        """Create a client configured to connect to our kernel"""
        base_ws_url = HTTP_PROTOCOL_REGEXP.sub("ws", self.kernel_url, 1)

        kw: dict[str, t.Any] = {}
        kw.update(
            {
                "kernel_ws_endpoint": url_path_join(base_ws_url, "channels"),
                "token": self.kernel_token,
                "username": self.username,
                "log": self.log,
                "parent": self,
            }
        )

        # add kwargs last, for manual overrides
        kw.update(kwargs)
        return self.client_factory(**kw)

    def refresh_model(self, model=None):
        """Refresh the kernel model.

        Parameters
        ----------
        model : dict
            The model from which to refresh the kernel.  If None, the kernel
            model is fetched from the Gateway server.
        """
        if model is None:
            self.log.debug("Request kernel at: %s" % self.kernel_url)
            try:
                response = fetch(self.kernel_url, token=self.kernel_token, method="GET")
            except HTTPError as error:
                if error.response.status_code == 404:
                    self.log.warning("Kernel not found at: %s", self.kernel_url)
                    model = None
                else:
                    raise
            else:
                model = response.json()
            self.log.debug("Kernel retrieved: %s" % model)

        if model:  # Update activity markers
            self.last_activity = datetime.datetime.strptime(
                model["last_activity"], "%Y-%m-%dT%H:%M:%S.%fZ"
            ).replace(tzinfo=UTC)
            self.execution_state = model["execution_state"]

        self.kernel = model
        return model

    # --------------------------------------------------------------------------
    # Kernel management
    # --------------------------------------------------------------------------
    def start_kernel(self, **kwargs):
        """Starts a kernel via HTTP in an asynchronous manner.

        Parameters
        ----------
        `**kwargs` : optional
             keyword arguments that are passed down to build the kernel_cmd
             and launching the kernel (e.g. Popen kwargs).
        """
        kernel_name = kwargs.get("kernel_name")
        kernel = None
        if kernel_name:
            response = fetch(
                "{}/api/jupyter/v1/kernel/{}".format(self.run_url, kernel_name),
                token=self.token,
            )
            kernel = response.json().get("kernel")
        else:
            self.log.debug(
                "No kernel name provided. Picking the first available remote kernel…"
            )
            response = fetch(
                "{}/api/jupyter/v1/kernels".format(self.run_url),
                token=self.token,
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

        base_url = kernel["ingress"]
        # base_ws_url = HTTP_PROTOCOL_REGEXP.sub("ws", base_url, 1)
        self.kernel_token = kernel.get("token", "")

        response = fetch(f"{base_url}/api/kernels", token=self.kernel_token)
        kernels = response.json()
        kernel_id = kernels[0]["id"]

        self.kernel_id = kernel_id
        self.kernel_url = url_path_join(base_url, "api/kernels", self.kernel_id)
        self.kernel = self.refresh_model()
        msg = f"KernelManager using existing jupyter kernel {kernel_name}"
        expired_at = kernel.get("expired_at")
        if expired_at is not None:
            msg += f" expiring at {_timestamp_to_local_date(expired_at)}"
        self.log.info(msg)

    def shutdown_kernel(self, now=False, restart=False):
        """Attempts to stop the kernel process cleanly via HTTP."""

        if self.has_kernel:
            self.log.debug("Request shutdown kernel at: %s", self.kernel_url)
            try:
                response = fetch(
                    self.kernel_url, token=self.kernel_token, method="DELETE"
                )
                self.log.debug(
                    "Shutdown kernel response: %d %s",
                    response.status_code,
                    response.reason,
                )
            except HTTPError as error:
                if error.response.status_code == 404:
                    self.log.debug(
                        "Shutdown kernel response: kernel not found (ignored)"
                    )
                else:
                    raise

    def restart_kernel(self, **kw):
        """Restarts a kernel via HTTP."""
        if self.has_kernel:
            assert self.kernel_url is not None
            kernel_url = self.kernel_url + "/restart"
            self.log.debug("Request restart kernel at: %s", kernel_url)
            response = fetch(
                kernel_url,
                token=self.kernel_token,
                method="POST",
                json={},
            )
            self.log.debug(
                "Restart kernel response: %d %s", response.status_code, response.reason
            )

    def interrupt_kernel(self):
        """Interrupts the kernel via an HTTP request."""
        if self.has_kernel:
            assert self.kernel_url is not None
            kernel_url = self.kernel_url + "/interrupt"
            self.log.debug("Request interrupt kernel at: %s", kernel_url)
            response = fetch(
                kernel_url,
                token=self.kernel_token,
                method="POST",
                json={},
            )
            self.log.debug(
                "Interrupt kernel response: %d %s",
                response.status_code,
                response.reason,
            )

    def is_alive(self):
        """Is the kernel process still running?"""
        if self.has_kernel:
            # Go ahead and issue a request to get the kernel
            self.kernel = self.refresh_model()
            self.log.debug(f"The kernel: {self.kernel} is alive.")
            return True
        else:  # we don't have a kernel
            self.log.debug(f"The kernel: {self.kernel} no longer exists.")
            return False

    def cleanup_resources(self, restart=False):
        """Clean up resources when the kernel is shut down"""
        ...
