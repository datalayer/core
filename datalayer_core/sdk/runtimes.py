# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""
Runtime classes for the Datalayer SDK.

Provides runtime management and code execution capabilities in Datalayer environments.
"""

from pathlib import Path
from typing import Any, Optional, Union

from jupyter_kernel_client import KernelClient

from datalayer_core.cli0.runtimes import RuntimesMixin
from datalayer_core.cli0.runtimes.exec.execapp import _get_cells
from datalayer_core.sdk.auth import DatalayerClientAuthMixin
from datalayer_core.sdk.response import Response
from datalayer_core.sdk.snapshots import (
    RuntimeSnapshot,
    _create_snapshot,
    _list_snapshots,
)
from datalayer_core.sdk.utils import (
    DEFAULT_ENVIRONMENT,
    DEFAULT_RUN_URL,
    DEFAULT_TIME_RESERVATION,
    CreditsPerSecond,
    Minutes,
    Seconds,
)
from datalayer_core.cli0.snapshots import SnapshotsMixin


class Runtime(DatalayerClientAuthMixin, RuntimesMixin, SnapshotsMixin):
    """
    Represents a Datalayer runtime (kernel) for code execution.

    Parameters
    ----------
    name : str
        Name of the runtime (kernel).
    environment : str
        Environment type (e.g., "python-cpu-env").
    time_reservation : Minutes
        Time reservation in minutes for the runtime.
    run_url : str
        Datalayer server URL.
    token : Optional[str]
        Authentication token (can also be set via DATALAYER_TOKEN env var).
    pod_name : Optional[str]
        Pod name for existing runtime.
    ingress : Optional[str]
        Ingress URL for the runtime.
    reservation_id : Optional[str]
        Reservation ID for the runtime.
    uid : Optional[str]
        Unique identifier for the runtime.
    burning_rate : Optional[str]
        Cost rate for the runtime.
    kernel_token : Optional[str]
        Kernel authentication token.
    started_at : Optional[str]
        Runtime start timestamp.
    expired_at : Optional[str]
        Runtime expiration timestamp.
    """

    def __init__(
        self,
        name: str,
        environment: str = DEFAULT_ENVIRONMENT,
        time_reservation: Minutes = DEFAULT_TIME_RESERVATION,
        run_url: str = DEFAULT_RUN_URL,
        token: Optional[str] = None,
        pod_name: Optional[str] = None,
        ingress: Optional[str] = None,
        reservation_id: Optional[str] = None,
        uid: Optional[str] = None,
        burning_rate: Optional[CreditsPerSecond] = None,
        kernel_token: Optional[str] = None,
        started_at: Optional[str] = None,
        expired_at: Optional[str] = None,
    ):
        """
        Initialize a runtime.

        Parameters
        ----------
        name : str
            Name of the runtime (kernel).
        environment : str
            Environment type (e.g., "python-cpu-env"). Type of resources needed (cpu, gpu, etc.).
        time_reservation : Minutes
            Time reservation in minutes for the runtime. Defaults to 10 minutes.
        run_url : str
            Datalayer server URL.
        token : Optional[str]
            Authentication token (can also be set via DATALAYER_TOKEN env var).
        pod_name : Optional[str]
            Name of the pod running the runtime.
        ingress : Optional[str]
            Ingress URL for the runtime.
        reservation_id : Optional[str]
            Reservation ID for the runtime.
        uid : Optional[str]
            ID for the runtime.
        burning_rate : Optional[float]
            Burning rate for the runtime.
        kernel_token : Optional[str]
            Token for the kernel client.
        started_at : Optional[str]
            Start time for the runtime.
        expired_at : Optional[str]
            Expiration time for the runtime.
        """
        self._environment_name = environment
        self._pod_name = pod_name
        self._run_url = run_url
        self._name = name
        self._ingress = ingress
        self._time_reservation = time_reservation
        self._token = token
        self._reservation_id = reservation_id
        self._kernel_token = kernel_token
        self._uid = uid
        self._runtime: dict[str, str] = {}
        self._kernel_client: Optional[KernelClient] = None
        self._kernel_id: Optional[str] = None
        self._burning_rate = burning_rate
        self._started_at = started_at
        self._expired_at = expired_at
        self._credits_limit = (
            burning_rate * 60.0 * time_reservation if burning_rate else None
        )

        self._executing = False
        # if kernel_token is not None and ingress is not None:
        #     self._kernel_client = KernelClient(server_url=ingress, token=kernel_token)
        #     self._kernel_client.start()

    def __del__(self) -> None:
        """Clean up resources when the runtime object is deleted."""
        # self.stop()
        pass

    def __enter__(self) -> "Runtime":
        """
        Context manager entry.

        Returns
        -------
        Runtime
            The runtime instance.
        """
        self._start()
        return self

    def __exit__(self, exc_type: Any, exc_val: Any, exc_tb: Any) -> None:
        """
        Context manager exit.

        Parameters
        ----------
        exc_type : Any
            Exception type.
        exc_val : Any
            Exception value.
        exc_tb : Any
            Exception traceback.
        """
        self._stop()

    def __repr__(self) -> str:
        return f"Runtime(uid='{self.uid}', name='{self.name}')"

    def _start(self) -> None:
        """Start the runtime."""
        if self._ingress is not None and self._kernel_token is not None:
            self._kernel_client = KernelClient(
                server_url=self._ingress, token=self._kernel_token
            )
            self._kernel_client.start()

        if self._kernel_client is None:
            self._runtime = self._create_runtime(self._environment_name)
            # print(self._runtime)
            runtime: dict[str, str] = self._runtime["runtime"]  # type: ignore
            # print("runtime", runtime)
            self._ingress = runtime["ingress"]
            self._kernel_token = runtime["token"]
            self._pod_name = runtime["pod_name"]
            self._uid = runtime["uid"]
            self._reservation_id = runtime["reservation_id"]
            self._burning_rate = float(runtime["burning_rate"])
            self._started_at = runtime["started_at"]
            self._expired_at = runtime["expired_at"]
            self._kernel_client = KernelClient(
                server_url=self._ingress, token=self._kernel_token
            )
            self._kernel_client.start()

    def _stop(self) -> bool:
        """
        Stop the runtime.

        Returns
        -------
        bool
            True if runtime was successfully stopped, False otherwise.
        """
        if self._kernel_client:
            self._kernel_client.stop()
            self._kernel_client = None
            self._kernel_id = None
            if self._pod_name:
                return self._terminate_runtime(self._pod_name)["success"]
        return False

    def _check_file(self, path: Union[str, Path]) -> bool:
        """
        Check if a file exists and can be opened.

        Parameters
        ----------
        path : Union[str, Path]
            Path to the file to check.

        Returns
        -------
        bool
            True if file exists and can be opened, False otherwise.
        """
        fname = Path(path).expanduser().resolve()
        try:
            with fname.open("rb"):
                pass
            return Path(path).exists()
        except Exception:
            return False

    @property
    def run_url(self) -> str:
        """
        Get the runtime server URL.

        Returns
        -------
        str
            The Datalayer server URL for this runtime.
        """
        return self._run_url

    @property
    def name(self) -> str:
        """
        Get the runtime name.

        Returns
        -------
        str
            The name of this runtime.
        """
        return self._name

    @property
    def uid(self) -> Optional[str]:
        """
        Get the runtime unique identifier.

        Returns
        -------
        Optional[str]
            The unique identifier of this runtime, or None if not set.
        """
        return self._uid

    @property
    def pod_name(self) -> Optional[str]:
        """
        Get the runtime pod name.

        Returns
        -------
        Optional[str]
            The pod name of this runtime, or None if not set.
        """
        return self._pod_name

    def get_variable(self, name: str) -> Any:
        """
        Get a variable from the runtime.

        Parameters
        ----------
        name : str
            Name of the variable to retrieve.

        Returns
        -------
        Any
            Value of the variable, or None if not found or runtime not started.
        """
        if self._kernel_client:
            return self._kernel_client.get_variable(name)
        return None

    def set_variable(self, name: str, value: Any) -> None:
        """
        Set a variable in the runtime.

        Parameters
        ----------
        name : str
            Name of the variable to set.
        value : Any
            Value to assign to the variable.

        Returns
        -------
        Response
            Response object containing execution results.
        """
        self.set_variables({name: value})

    def set_variables(self, variables: dict[str, Any]) -> None:
        """
        Set variables in the runtime.

        Parameters
        ----------
        variables : dict[str, Any]
            Dictionary of variable names and values to set.

        Returns
        -------
        Response
            Response object containing execution results.
        """
        if self._kernel_client:
            if variables is not None:
                for name, value in variables.items():
                    self._kernel_client.set_variable(name, value)

    def execute_file(
        self,
        path: Union[str, Path],
        variables: Optional[dict[str, Any]] = None,
        output: Optional[str] = None,
        debug: bool = False,
        timeout: Seconds = 10.0,
    ) -> Response:
        """
        Execute a Python file in the runtime.

        Parameters
        ----------
        path : Union[str, Path]
            Path to the Python file to execute.
        variables : Optional[dict[str, Any]]
            Optional variables to set before executing the code.
        output : Optional[str]
            Optional output variable to return as result.
        debug : bool
            Whether to enable debug mode. If `True`, the output and error streams will be printed.
        timeout : Seconds
            Timeout for the execution.

        Returns
        -------
        Response
            The result of the code execution.
        """
        fname = Path(path).expanduser().resolve()
        if self._check_file(fname):
            if variables:
                self.set_variables(variables)

            if self._kernel_client:
                outputs = []
                for _id, cell in _get_cells(fname):
                    reply = self._kernel_client.execute_interactive(
                        cell,
                        silent=False,
                        timeout=timeout,
                    )
                    # print(reply)
                    outputs.append(reply.get("outputs", []))
                response = Response(outputs)
                if debug:
                    print(response.stdout)
                    print(response.stderr)

                if output is not None:
                    return self.get_variable(output)

                return response
        return Response([])

    def execute_code(
        self,
        code: str,
        variables: Optional[dict[str, Any]] = None,
        output: Optional[str] = None,
        debug: bool = False,
        timeout: Seconds = 10.0,
    ) -> Union[Response, Any]:
        """
        Execute code in the runtime.

        Parameters
        ----------
        code : str
            The Python code to execute.
        variables : Optional[dict[str, Any]]
            Optional variables to set before executing the code.
        output : Optional[str]
            Optional output variable to return as result.
        debug : bool
            Whether to enable debug mode. If `True`, the output and error streams will be printed.
        timeout : Seconds
            Timeout for the execution.

        Returns
        -------
        Union[Response, Any]
            The result of the code execution.
        """
        if not self._check_file(code):
            if self._kernel_client is not None:
                if variables:
                    self.set_variables(variables)
                reply = self._kernel_client.execute(code, timeout=timeout)

                response = Response(reply.get("outputs", {}))
                if debug:
                    print(response.stdout)
                    print(response.stderr)

                if output is not None:
                    return self.get_variable(output)
            else:
                raise RuntimeError(
                    "Kernel client is not started. Call `start()` first."
                )

            return response

        return Response([])

    def execute(
        self,
        code_or_path: Union[str, Path],
        variables: Optional[dict[str, Any]] = None,
        output: Optional[str] = None,
        debug: bool = False,
        timeout: Seconds = 10.0,
    ) -> Union[Response, Any]:
        """
        Execute code in the runtime.

        Parameters
        ----------
        code_or_path : Union[str, Path]
            The Python code or path to the file to execute.
        variables : Optional[dict[str, Any]]
            Optional variables to set before executing the code.
        output : Optional[str]
            Optional output variable to return as result.
        debug : bool
            Whether to enable debug mode. If `True`, the output and error streams will be printed.
        timeout : Seconds
            Timeout for the execution.

        Returns
        -------
        Union[Response, Any]
            The result of the code execution.
        """
        if self._check_file(code_or_path):
            return self.execute_file(
                str(code_or_path),
                variables=variables,
                output=output,
                debug=debug,
                timeout=timeout,
            )
        else:
            return self.execute_code(
                str(code_or_path),
                variables=variables,
                output=output,
                debug=debug,
                timeout=timeout,
            )

    def terminate(self) -> bool:
        """
        Terminate the Runtime.

        Returns
        -------
        bool
            True if termination was successful, False otherwise.
        """
        return self._stop()

    def create_snapshot(
        self,
        name: Optional[str] = None,
        description: Optional[str] = None,
        stop: bool = True,
    ) -> "RuntimeSnapshot":
        """
        Create a new snapshot from the current state.

        Parameters
        ----------
        name : Optional[str]
            Name for the new snapshot.
        description : Optional[str]
            Description for the new snapshot.
        stop : bool
            Whether to stop the runtime after creating the snapshot.

        Returns
        -------
        RuntimeSnapshot
            A new snapshot object.
        """
        if self._pod_name is None:
            raise RuntimeError("Runtime not started!")

        name, description = _create_snapshot(name=name, description=description)
        response = self._create_snapshot(
            pod_name=self._pod_name,
            name=name,
            description=description,
            stop=stop,
        )
        if stop:
            self._kernel_client = None
            self._kernel_id = None
            try:
                if self._pod_name:
                    self._terminate_runtime(self._pod_name)
            except Exception:
                pass

        response = self._list_snapshots()
        snapshot_objects = _list_snapshots(response)
        for snapshot in snapshot_objects:
            if snapshot.name == name:
                break
        return RuntimeSnapshot(
            uid=snapshot.uid,
            name=name,
            description=description,
            environment=snapshot.environment,
            metadata=response,
        )
