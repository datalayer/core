# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""
Datalayer AI SDK - A simple SDK for AI engineers to work with Datalayer.
Provides authentication, runtime creation, and code execution capabilities.
"""

import os
from typing import Any, Optional, Union

from datalayer_core.cli.base import DatalayerAuthMixin
from datalayer_core.environments import EnvironmentsMixin
from datalayer_core.runtimes import RuntimesMixin
from datalayer_core.secrets import SecretsMixin, SecretType
from jupyter_kernel_client import KernelClient


DEFAULT_ENVIRONMENT = "python-cpu-env"
DEFAULT_RUN_URL = "https://prod1.datalayer.run"
DEFAULT_TIMEOUT = 10  # Minutes


class DatalayerClient(DatalayerAuthMixin, EnvironmentsMixin, SecretsMixin):
    """
    SDK for Datalayer AI platform.

    Provides a unified interface for authentication, runtime creation,
    and code execution in Datalayer environments.
    """

    def __init__(
        self,
        run_url: str = DEFAULT_RUN_URL,
        token: Optional[str] = None,
    ):
        """
        Initialize the Datalayer SDK.

        Parameters
        ----------
        run_url:
            Datalayer server URL. Defaults to "https://prod1.datalayer.run".
        token:
            Authentication token (can also be set via DATALAYER_TOKEN env var).
        """
        self.run_url = run_url.rstrip("/") or os.environ.get(
            "DATALAYER_RUN_URL", DEFAULT_RUN_URL
        )
        self.token = token or os.environ.get("DATALAYER_TOKEN", None)
        self.user_handle = None
        self._kernel_client = None
        self._notebook_client = None

        if not self.token:
            raise ValueError(
                "Token is required. Set it via parameter or DATALAYER_TOKEN environment variable"
            )

    def authenticate(self) -> bool:
        """
        Validate authentication credentials.

        Returns:
            bool: True if authentication is successful
        """
        self._log_in()
        self._available_environments = self._list_environments()
        self._available_environments_names = [
            e.get("name") for e in self._available_environments
        ]
        return bool(self.token and self.user_handle)

    def create_runtime(
        self,
        name: Optional[str] = None,
        environment: str = DEFAULT_ENVIRONMENT,
        timeout: float = DEFAULT_TIMEOUT,
    ) -> "Runtime":
        """
        Create a new runtime (kernel) for code execution.

        Parameters
        ----------
        name:
            Name of the kernel to create (default: python3)
        envionment:
            Type of resources needed (cpu, gpu, etc.)
        timeout:
            Request timeout in minutes. Defaults to 10 minutes.

        Returns
        -------
            Runtime: A runtime object for code execution
        """
        if environment not in self._available_environments_names:
            raise ValueError(
                f"Environment '{environment}' not found. Available environments: {self._available_environments_names}"
            )
        if name is None:
            name = f"runtime-{environment}-{os.getpid()}"

        runtime = Runtime(
            name,
            environment=environment,
            timeout=timeout,
            run_url=self.run_url,
            token=self.token,
        )
        return runtime

    def list_secrets(self) -> list["Secret"]:
        """
        List all secrets available in the Datalayer environment.

        Returns
        -------
            List[Secret]: A list of Secret objects.
        """
        raw = self._list_secrets()
        secrets = raw.get("secrets", [])
        res = []
        for secret in secrets:
            uid = secret.pop("uid")
            name = secret.pop("name_s")
            description = secret.pop("description_t")
            variant = secret.pop("variant_s")
            res.append(
                Secret(
                    uid=uid,
                    name=name,
                    description=description,
                    variant=variant,
                    **secret,
                )
            )
        return res

    def create_secret(
        self,
        name: str,
        description: str,
        value: str,
        secret_type: str = SecretType.GENERIC,
    ) -> "Secret":
        """
        Create a new secret.

        Parameters
        ----------
        name: str
            Name of the secret.
        description: str
            Description of the secret.
        value: str
            Value of the secret.
        secret_type: str
            Type of the secret (e.g., "generic", "password", "key", "token").

        Returns
        -------
            Secret: The created secret object.
        """
        response = self._create_secret(
            name=name, description=description, value=value, secret_type=secret_type
        )
        secret_data = response.get("secret", {})
        return Secret(
            uid=secret_data.get("uid"),
            name=secret_data.get("name_s"),
            description=secret_data.get("description_t"),
            secret_type=secret_data.get("variant_s"),
        )

    def delete_secret(self, secret: Union[str, "Secret"]) -> dict[str, str]:
        """
        Delete a secret by its unique identifier.

        Parameters
        ----------
        secret: Union[str, Secret]
            Unique identifier of the secret or a Secret object.
        """
        uid = secret.uid if isinstance(secret, Secret) else secret
        return self._delete_secret(uid)


class Runtime(DatalayerAuthMixin, RuntimesMixin):
    """
    Represents a Datalayer runtime (kernel) for code execution.
    """

    def __init__(
        self,
        name: str,
        environment: str = DEFAULT_ENVIRONMENT,
        timeout: float = DEFAULT_TIMEOUT,
        run_url: str = DEFAULT_RUN_URL,
        token: Optional[str] = None,
    ):
        """
        Initialize a runtime.

        Parameters
        ----------
        name: str
            Name of the runtime (kernel).
        environment: str
            Environment type (e.g., "python-cpu-env").
        timeout: float
            Request timeout in minutes.
        run_url: str
            Datalayer server URL.
        token: Optional[str]
            Authentication token (can also be set via DATALAYER_TOKEN env var).
        """
        self.environment_name = environment
        self.run_url = run_url
        self.kernel_given_name = name
        self.timeout = timeout
        self.token = token
        self._runtime: dict[str, str] = {}
        self._kernel_client: Optional[KernelClient] = None
        self._kernel_id: Optional[str] = None
        self._pod_name: Optional[str] = None
        self.credits_limit: Optional[float] = None

    def __enter__(self) -> "Runtime":
        """Context manager entry."""
        self.start()
        return self

    def __exit__(self, exc_type: Any, exc_val: Any, exc_tb: Any) -> None:
        """Context manager exit."""
        self.stop()

    def start(self) -> None:
        """Start the runtime."""
        if self._kernel_client is None:
            self._runtime = self._create_runtime(self.environment_name)
            runtime: dict[str, str] = self._runtime.get("runtime")  # type: ignore
            url = runtime.get("ingress")
            token = runtime.get("token")
            self._kernel_client = KernelClient(server_url=url, token=token)
            self._kernel_client.start()
            self._kernel_client_info = runtime.get("kernel")
            self._pod_name = runtime.get("pod_name")

    def stop(self) -> None:
        """Stop the runtime."""
        if self._kernel_client:
            self._kernel_client.stop()
            self._kernel_client = None
            self._kernel_id = None
            if self._pod_name:
                self._terminate_runtime(self._pod_name)

    def execute(self, code: str) -> dict[str, str]:
        """
        Execute code in the runtime.

        Parameters
        ----------
        code: str
            The Python code to execute.

        Returns
        -------
            dict: The result of the code execution.
        """
        result: dict[str, str] = {}
        if self._kernel_client is not None:
            reply = self._kernel_client.execute(code)
            result = reply.get("outputs", {})
        return result


class Secret:
    """
    Represents a secret in Datalayer.

    Parameters
    ----------
    uid: str
        Unique identifier for the secret.
    name: str
        Name of the secret.
    description: str
        Description of the secret.
    secret_type: str
        Type of the secret (e.g., "generic", "password", "key", "token").
    value: str
        Value of the secret.
    """

    def __init__(
        self,
        uid: str,
        name: str,
        description: str,
        secret_type: str = SecretType.GENERIC,
        **kwargs: dict[str, str],
    ) -> None:
        self.uid = uid
        self.name = name
        self.description = description
        self.secret_type = secret_type
        self.kwargs = kwargs

    def __repr__(self) -> str:
        return f"Secret(uid='{self.uid}', name='{self.name}', description='{self.description}')"
