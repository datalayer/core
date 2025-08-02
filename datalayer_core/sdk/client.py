# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""
Datalayer AI SDK - A simple SDK for AI engineers to work with Datalayer.

Provides authentication, runtime creation, and code execution capabilities.
"""

import os
import uuid
from functools import lru_cache
from typing import Any, Optional, Union

from datalayer_core.authn import WhoamiAppMixin
from datalayer_core.environments import EnvironmentsMixin
from datalayer_core.runtimes import RuntimesMixin
from datalayer_core.sdk.auth import DatalayerClientAuthMixin
from datalayer_core.sdk.environments import Environment
from datalayer_core.sdk.profile import Profile
from datalayer_core.sdk.runtimes import Runtime
from datalayer_core.sdk.secrets import Secret
from datalayer_core.sdk.snapshots import (
    RuntimeSnapshot,
    _create_snapshot,
    _list_snapshots,
)
from datalayer_core.sdk.tokens import Token, TokenType
from datalayer_core.sdk.utils import (
    DEFAULT_ENVIRONMENT,
    DEFAULT_RUN_URL,
    DEFAULT_TIME_RESERVATION,
    Minutes,
)
from datalayer_core.secrets import SecretsMixin, SecretType
from datalayer_core.snapshots import SnapshotsMixin
from datalayer_core.tokens import TokensMixin


class DatalayerClient(
    DatalayerClientAuthMixin,
    RuntimesMixin,
    EnvironmentsMixin,
    SecretsMixin,
    SnapshotsMixin,
    TokensMixin,
    WhoamiAppMixin,
):
    """
    SDK for Datalayer AI platform.

    Provides a unified interface for authentication, runtime creation,
    and code execution in Datalayer environments.

    Parameters
    ----------
    run_url : str
        Datalayer server URL. Defaults to "https://prod1.datalayer.run".
    token : Optional[str]
        Authentication token (can also be set via DATALAYER_TOKEN env var).
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
        run_url : str
            Datalayer server URL. Defaults to "https://prod1.datalayer.run".
        token : Optional[str]
            Authentication token (can also be set via DATALAYER_TOKEN env var).
        """
        # TODO: Check user and password login
        self._run_url = run_url.rstrip("/") or os.environ.get(
            "DATALAYER_RUN_URL", DEFAULT_RUN_URL
        )
        self._token = token or os.environ.get("DATALAYER_TOKEN", None)
        self._user_handle = None
        self._kernel_client = None
        self._notebook_client = None

        if not self._token:
            raise ValueError(
                "Token is required. Set it via parameter or `DATALAYER_TOKEN` environment variable"
            )

    @property
    def run_url(self) -> str:
        """
        Get the Datalayer server URL.

        Returns
        -------
        str
            The configured Datalayer server URL.
        """
        return self._run_url

    def authenticate(self) -> bool:
        """
        Validate authentication credentials.

        Returns
        -------
        bool
            True if authentication is successful.
        """
        response = self._log_in()
        # print(response)
        return response["success"]

    def get_profile(self) -> Profile:
        """
        Get the user's profile information.

        Returns
        -------
        Profile
            A Profile object containing user details.
        """
        response = self._get_profile()
        if response["success"]:
            return Profile(response["profile"])
        raise RuntimeError("Failed to get profile information")

    @lru_cache
    def list_environments(self) -> list[Environment]:
        """
        List all available environments.

        Returns
        -------
        list[Environment]
            A list of available environments.
        """
        self._available_environments = self._list_environments()["environments"]
        self._available_environments_names = []
        env_objs = []
        for env in self._available_environments:
            self._available_environments_names.append(env.get("name"))
            env_objs.append(
                Environment(
                    name=env.pop("name"),
                    title=env.pop("title"),
                    burning_rate=env.pop("burning_rate", 0.0),
                    language=env.pop("language"),
                    owner=env.pop("owner"),
                    visibility=env.pop("visibility"),
                    metadata=env,
                )
            )
        return env_objs

    def create_runtime(
        self,
        name: Optional[str] = None,
        environment: str = DEFAULT_ENVIRONMENT,
        time_reservation: Minutes = DEFAULT_TIME_RESERVATION,
        snapshot_name: Optional[str] = None,
    ) -> Runtime:
        """
        Create a new runtime (kernel) for code execution.

        Parameters
        ----------
        name : str, optional
            Name of the runtime to create.
        environment : str, optional
            Environment type (e.g., "python-cpu-env"). Type of resources needed (cpu, gpu, etc.).
        time_reservation : Minutes, optional
            Time reservation in minutes for the runtime. Defaults to 10 minutes.
        snapshot_name : Optional[str], optional
            Name of the snapshot to create from. If provided, the runtime will be created from this snapshot.

        Returns
        -------
        Runtime
            A runtime object for code execution.
        """
        envs = self.list_environments()
        if environment not in self._available_environments_names:
            raise ValueError(
                f"Environment '{environment}' not found. Available environments: {self._available_environments_names}"
            )

        burning_rate = None
        credits_limit = None
        for env in envs:
            if env.name == environment:
                burning_rate = env.burning_rate
                credits_limit = env.burning_rate * 60.0 * time_reservation
                break
        if burning_rate is None or credits_limit is None:
            raise ValueError(
                f"Environment '{environment}' not found in environments list. Available: {[env.name for env in envs]}"
            )

        if name is None:
            name = f"runtime-{environment}-{uuid.uuid4()}"

        # print(f"Runtime {name}")

        if snapshot_name is not None:
            snapshots = self.list_snapshots()
            for snapshot in snapshots:
                if snapshot.name == snapshot_name:
                    response = self._create_runtime(
                        given_name=snapshot.name,
                        environment_name=environment,
                        from_snapshot_uid=snapshot.uid,
                        credits_limit=credits_limit,
                    )
                    runtime_data = response["runtime"]
                    runtime = Runtime(
                        name=runtime_data["given_name"],
                        environment=runtime_data["environment_name"],
                        run_url=self.run_url,
                        token=self._token,
                        ingress=runtime_data["ingress"],
                        kernel_token=runtime_data["token"],
                        pod_name=runtime_data["pod_name"],
                    )
        else:
            runtime = Runtime(
                name,
                environment=environment,
                time_reservation=time_reservation,
                run_url=self.run_url,
                token=self._token,
                burning_rate=burning_rate,
            )
        return runtime

    def list_runtimes(self) -> list[Runtime]:
        """
        List all running runtimes.

        Returns
        -------
        list[Runtime]
            List of Runtime objects representing active runtimes.
        """
        runtimes: list[dict[str, Any]] = self._list_runtimes()["runtimes"]
        runtime_objects = []
        for runtime in runtimes:
            runtime_objects.append(
                Runtime(
                    name=runtime["given_name"],
                    environment=runtime["environment_name"],
                    pod_name=runtime["pod_name"],
                    token=self._token,
                    ingress=runtime["ingress"],
                    reservation_id=runtime["reservation_id"],
                    uid=runtime["uid"],
                    burning_rate=runtime["burning_rate"],
                    kernel_token=runtime["token"],
                    run_url=self._run_url,
                    started_at=runtime["started_at"],
                    expired_at=runtime["expired_at"],
                )
            )
        return runtime_objects

    def terminate_runtime(self, runtime: Union[Runtime, str]) -> bool:
        """
        Terminate a running Runtime.

        Parameters
        ----------
        runtime : Union[Runtime, str]
            Runtime object or pod name string to terminate.

        Returns
        -------
        bool
            True if termination was successful, False otherwise.
        """
        pod_name = runtime.pod_name if isinstance(runtime, Runtime) else runtime
        if pod_name is not None:
            return self._terminate_runtime(pod_name)["success"]
        else:
            return False

    def list_secrets(self) -> list[Secret]:
        """
        List all secrets available in the Datalayer environment.

        Returns
        -------
        list[Secret]
            A list of Secret objects.
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
        name : str
            Name of the secret.
        description : str
            Description of the secret.
        value : str
            Value of the secret.
        secret_type : str
            Type of the secret (e.g., "generic", "password", "key", "token").

        Returns
        -------
        Secret
            The created secret object.
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

    def delete_secret(self, secret: Union[str, Secret]) -> dict[str, str]:
        """
        Delete a secret by its unique identifier.

        Parameters
        ----------
        secret : Union[str, Secret]
            Unique identifier of the secret or a Secret object.

        Returns
        -------
        dict[str, str]
            Response dictionary with deletion status.
        """
        uid = secret.uid if isinstance(secret, Secret) else secret
        return self._delete_secret(uid)

    def create_snapshot(
        self,
        runtime: Optional["Runtime"] = None,
        pod_name: Optional[str] = None,
        name: Optional[str] = None,
        description: Optional[str] = None,
        stop: bool = True,
    ) -> "RuntimeSnapshot":
        """
        Create a snapshot of the current runtime state.

        Parameters
        ----------
        runtime : Optional[Runtime]
            The runtime object to create a snapshot from.
        pod_name : Optional[str]
            The pod name of the runtime.
        name : Optional[str]
            Name for the new snapshot.
        description : Optional[str]
            Description for the new snapshot.
        stop : bool
            Whether to stop the runtime after creating snapshot.

        Returns
        -------
        RuntimeSnapshot
            The created snapshot object.
        """
        if pod_name is None and runtime is None:
            raise ValueError(
                "Either 'runtime' or 'pod_name' must be provided to create a snapshot."
            )
        elif runtime is not None:
            pod_name = runtime.pod_name

        if pod_name is None:
            raise ValueError(
                "Pod name is required to create a snapshot. Ensure the runtime has a valid pod_name."
            )

        name, description = _create_snapshot(name=name, description=description)
        response = self._create_snapshot(
            pod_name=pod_name,
            name=name,
            description=description,
            stop=stop,
        )
        snapshots_objects = self.list_snapshots()
        for snapshot in snapshots_objects:
            if snapshot.name == name:
                break
        return RuntimeSnapshot(
            uid=snapshot.uid,
            name=name,
            description=description,
            environment=snapshot.environment,
            metadata=response,
        )

    def list_snapshots(self) -> list[RuntimeSnapshot]:
        """
        List all snapshots.

        Returns
        -------
        list[RuntimeSnapshot]
            A list of snapshots associated with the user.
        """
        response = self._list_snapshots()
        snapshot_objects = _list_snapshots(response)
        return snapshot_objects

    def delete_snapshot(self, snapshot: Union[str, RuntimeSnapshot]) -> dict[str, str]:
        """
        Delete a specific snapshot.

        Parameters
        ----------
        snapshot : Union[str, RuntimeSnapshot]
            Snapshot object or UID string to delete.

        Returns
        -------
        dict[str, str]
            The result of the deletion operation.
        """
        snapshot_uid = (
            snapshot.uid if isinstance(snapshot, RuntimeSnapshot) else snapshot
        )
        return self._delete_snapshot(snapshot_uid)

    def create_token(
        self,
        name: str,
        description: str,
        expiration_date: int = 0,
        token_type: Union[str, TokenType] = TokenType.USER,
    ) -> dict[str, Any]:
        """
        Create a new token.

        Parameters
        ----------
        name : str
            Name of the token.
        description : str
            Description of the token.
        expiration_date : int, default 0
            Expiration date of the token in seconds since epoch.
        token_type : Union[str, TokenType], default TokenType.USER
            Type of the token (e.g., "user", "admin").

        Returns
        -------
        dict[str, Any]
            A dictionary containing the created token and its details.
        """
        return self._create_token(
            name=name,
            description=description,
            expiration_date=expiration_date,
            token_type=token_type,
        )

    def list_tokens(self) -> list[Token]:
        """
        List all tokens.

        Returns
        -------
        list[Token]
            A list of tokens associated with the user.
        """
        response = self._list_tokens()
        if response.get("success") and "tokens" in response:
            token_objects = []
            for token_data in response["tokens"]:
                token = Token(
                    uid=token_data["uid"],
                    name=token_data.get("name_s", ""),
                    description=token_data.get("description_t", ""),
                    token_type=token_data.get("variant_s", "user"),
                )
                token_objects.append(token)
            return token_objects
        return []

    def delete_token(self, token: Union[str, Token]) -> bool:
        """
        Delete a specific token.

        Parameters
        ----------
        token : Union[str, Token]
            Token object or UID string to delete.

        Returns
        -------
        bool
            The result of the deletion operation.
        """
        token_uid = token.uid if isinstance(token, Token) else token
        response = self._delete_token(token_uid)
        return response.get("success", False)
