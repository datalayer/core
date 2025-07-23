# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""
Datalayer AI SDK - A simple SDK for AI engineers to work with Datalayer.
Provides authentication, runtime creation, and code execution capabilities.
"""

import json
import os
import sys
import uuid
from functools import lru_cache
from pathlib import Path
from typing import Any, List, Optional, Tuple, Union

import requests
from jupyter_kernel_client import KernelClient

from datalayer_core.environments import EnvironmentsMixin
from datalayer_core.runtimes import RuntimesMixin
from datalayer_core.runtimes.exec.execapp import _get_cells
from datalayer_core.secrets import SecretsMixin, SecretType
from datalayer_core.snapshots import SnapshotsMixin
from datalayer_core.utils.utils import fetch

DEFAULT_ENVIRONMENT = "python-cpu-env"
DEFAULT_RUN_URL = "https://prod1.datalayer.run"
DEFAULT_TIMEOUT = 10  # Minutes


def _create_snapshot(
    name: Optional[str], description: Optional[str]
) -> Tuple[str, str]:
    uid = uuid.uuid4()
    if name is None:
        name = f"snapshot-{uid}"

    if description is None:
        description = f"snapshot-{uid}"

    return name, description


def _list_snapshots(response: dict[str, Any]) -> List["RuntimeSnapshot"]:
    snapshot_objects = []
    if response["success"]:
        snapshots = response["snapshots"]
        for snapshot in snapshots:
            snapshot_objects.append(
                RuntimeSnapshot(
                    uid=snapshot["uid"],
                    name=snapshot["name"],
                    description=snapshot["description"],
                    environment=snapshot["environment"],
                    metadata=snapshot["metadata"],
                )
            )
    return snapshot_objects


class DatalayerClientAuthMixin:
    """
    Mixin class for Datalayer client authentication.

    Provides methods to authenticate and fetch resources from the Datalayer server.
    """

    _token: Optional[str] = None
    _external_token: Optional[str] = None
    _run_url: str = DEFAULT_RUN_URL

    def _fetch(self, request: str, **kwargs: Any) -> requests.Response:
        """Fetch a network resource."""
        try:
            return fetch(
                request,
                token=self._token,
                external_token=self._external_token,
                **kwargs,
            )
        except requests.exceptions.Timeout as e:
            raise e
        except requests.exceptions.HTTPError as e:
            # raw = e.response.json()
            # self.log.debug(raw)
            raise RuntimeError(
                f"Failed to request the URL {request if isinstance(request, str) else request.url!s}"
            ) from e

    def _log_in(self) -> dict[str, Any]:
        body = {
            "token": self._token,
        }
        try:
            response = self._fetch(
                "{}/api/iam/v1/login".format(self._run_url),
                method="POST",
                json=body,
            )
            return response.json()
        except RuntimeError as e:
            return {"success": False, "message": str(e)}


class DatalayerClient(
    DatalayerClientAuthMixin,
    RuntimesMixin,
    EnvironmentsMixin,
    SecretsMixin,
    SnapshotsMixin,
):
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
        return self._run_url

    def authenticate(self) -> bool:
        """
        Validate authentication credentials.

        Returns:
            bool: True if authentication is successful
        """
        response = self._log_in()
        # print(response)
        return response["success"]

    @lru_cache
    def list_environments(self) -> list["Environment"]:
        """
        List all available environments.

        Returns
        -------
            list: A list of available environments.
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
        timeout: float = DEFAULT_TIMEOUT,
        snapshot_name: Optional[str] = None,
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
        snapshot_name: Optional[str]
            Name of the snapshot to create from. If provided, the runtime will be created from this snapshot.
        Returns
        -------
            Runtime: A runtime object for code execution
        """
        self.list_environments()
        if environment not in self._available_environments_names:
            raise ValueError(
                f"Environment '{environment}' not found. Available environments: {self._available_environments_names}"
            )
        if name is None:
            name = f"runtime-{environment}-{uuid.uuid4()}"

        if snapshot_name is not None:
            snapshots = self.list_snapshots()
            for snapshot in snapshots:
                if snapshot.name == snapshot_name:
                    response = self._create_runtime(
                        given_name=snapshot.name,
                        environment_name=environment,
                        from_snapshot_uid=snapshot.uid,
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
                timeout=timeout,
                run_url=self.run_url,
                token=self._token,
            )
        return runtime

    def list_runtimes(self) -> list["Runtime"]:
        """Terminate a running Runtime.

        Parameters
        ----------
        runtime: Runtime or str

        'environment_title':'AI Environment',
        'type': 'notebook',
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

    def terminate_runtime(self, runtime: Union["Runtime", str]) -> bool:
        """Terminate a running Runtime.

        Parameters
        ----------
        runtime: Runtime or str

        """
        pod_name = runtime.pod_name if isinstance(runtime, Runtime) else runtime
        if pod_name is not None:
            return self._terminate_runtime(pod_name)["success"]
        else:
            return False

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
        runtime: Optional[Runtime]
            The runtime object to create a snapshot from.
        pod_name: Optional[str]
            The pod name of the runtime.
        name: str, optional
            Name for the new snapshot.
        description: str, optional
            Description for the new snapshot.
        """
        if pod_name is None and runtime is None:
            raise ValueError(
                "Either 'runtime' or 'pod_name' must be provided to create a snapshot."
            )
        elif runtime is not None:
            pod_name = runtime.pod_name

        name, description = _create_snapshot(name=name, description=description)
        response = self._create_snapshot(
            pod_name=pod_name,  # type: ignore
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
            environment=snapshot.enviroment,
            metadata=response,
        )

    def list_snapshots(self) -> list["RuntimeSnapshot"]:
        """
        List all snapshots.

        Returns
        -------
        list: A list of snapshots associated.
        """
        response = self._list_snapshots()
        snapshot_objects = _list_snapshots(response)
        return snapshot_objects

    def delete_snapshot(
        self, snapshot: Union[str, "RuntimeSnapshot"]
    ) -> dict[str, str]:
        """
        Delete a specific snapshot.

        Returns
        -------
        dict: The result of the deletion operation.
        """
        snapshot_uid = (
            snapshot.uid if isinstance(snapshot, RuntimeSnapshot) else snapshot
        )
        return self._delete_snapshot(snapshot_uid)


class Environment:
    """Represents a Datalayer environment.

    [
    {
        "contents": [
        {
            "mount": "/home/jovyan/ai-models",
            "name": "nfs-ai-models-content"
        },
        {
            "mount": "/home/jovyan/data/datalayer-curated",
            "name": "s3-datalayer-datasets",
            "permissions": "ro"
        },
        {
            "mount": "/home/jovyan/data/aws-opendata/satellite-sentinels",
            "name": "s3-satellite-sentinels-images-content",
            "permissions": "ro"
        },
        {
            "mount": "/home/jovyan/data/aws-opendata/genome-browser",
            "name": "s3-genome-browser-content",
            "permissions": "ro"
        }
        ],
        "description": "<br/>\n<img src=\"https://raw.githubusercontent.com/datalayer/icons/e671c333d5b456d582aea009373c5af994695931/svg/data2/sparkles.svg\" width=\"60\"/>\n<p><b>An environment for LLM inference, AI fine-tuning & training.</b></p>\n<p>GPU detail: 1 NVIDIA A100 80GB</p>\n<p><i>Packages: llama-cpp, pytorch, torchvision, fastai, langchain, huggingface-hub, transformers...</i></p>\n<br/>\n",
        "dockerImage": "qnnxrq3e.c1.bhs5.container-registry.ovh.net/datalayer/jupyter-ai-cuda:0.1.0",
        "example": "https://raw.githubusercontent.com/datalayer/examples/5a65d7403de2c34f2052526360eeda84aaceabc6/fastai-classifier/fastai-image-classification.ipynb",
        "kernel": {
        "givenNameTemplate": "AI Runtime"
        },
        "language": "python",
        "owner": "datalayer",
        "resourcesRanges": {
        "default": {
            "limits": {
            "cpu": "10",
            "ephemeral-storage": "20Gi",
            "memory": "80Gi",
            "nvidia.com/gpu": "1"
            },
            "requests": {
            "cpu": "10",
            "ephemeral-storage": "20Gi",
            "memory": "80Gi",
            "nvidia.com/gpu": "1"
            }
        }
        },
        "snippets": [
        {
            "code": "from transformers import AutoTokenizer, AutoModelForCausalLM\nimport torch\nprompt = \"\"\"\nWhat color is the sky?\n\"\"\"\ntokenizer = AutoTokenizer.from_pretrained(\"mistralai/Mixtral-8x22B-Instruct-v0.1\")\nmodel = AutoModelForCausalLM.from_pretrained(\n    \"mistralai/Mixtral-8x22B-Instruct-v0.1\",\n    device_map=\"auto\",\n    torch_dtype=torch.bfloat16,\n)\nchat = [\n    {\"role\": \"user\", \"content\": prompt},\n]\nprompt = tokenizer.apply_chat_template(chat, tokenize=False, add_generation_prompt=True)\ninputs = tokenizer.encode(prompt, add_special_tokens=False, return_tensors=\"pt\")\noutputs = model.generate(input_ids=inputs.to(model.device), max_new_tokens=2000)\nprompt_length = inputs.shape[1]\nresponse = tokenizer.decode(outputs[0][prompt_length:])\nprint(response)\n#\nfrom llama_cpp import Llama\n# Set gpu_layers to the number of layers to offload to GPU. Set to 0 if no acceleration is available on your system.\nllm = Llama(\n  model_path=\"./Mixtral-8x7B-Instruct-v0.1.Q4_K_M.gguf\",  # Download the model file first\n  n_ctx=2048,             # The max sequence length to use - note that longer sequence lengths require much more resources\n  n_threads=8,            # The number of CPU threads to use, tailor to your system and the resulting performance\n  n_gpu_layers=15,         # The number of layers to offload to GPU, if you have acceleration available - try with 35\n  verbose = True,\n)\n# Simple inference...\nprompt = \"who are you?\"\noutput = llm(\n  \"[INST] {prompt} [/INST]\", # Prompt\n  max_tokens=512,  # Generate up to 512 tokens\n  stop=[\"</s>\"],   # Example stop token - not necessarily correct for this specific model! Please check before using.\n  echo=True        # Whether to echo the prompt\n)\nprint(output)\n# Chat Completion example...\nllm = Llama(model_path=\"./Mixtral-8x7B-Instruct-v0.1.Q4_K_M.gguf\", chat_format=\"llama-2\")  # Set chat_format according to the model you are using.\nllm.create_chat_completion(\n    messages = [\n        {\"role\": \"system\", \"content\": \"You are a story writing assistant.\"},\n        {\n            \"role\": \"user\",\n            \"content\": \"Write a story about llamas.\"\n        }\n    ]\n)\n",
            "title": "ai-prompting"
        }
        ],
        "title": "AI Environment",
        "visibility": "public",
        "name": "ai-env",
        "burning_rate": 0.01,
        "resources": {
        "cpu": "10",
        "ephemeral-storage": "20Gi",
        "memory": "80Gi",
        "nvidia.com/gpu": "1"
        }
    },
    {
        "contents": [
        {
            "mount": "/home/jovyan/ai-models",
            "name": "nfs-ai-models-content"
        },
        {
            "mount": "/home/jovyan/data/datalayer-curated",
            "name": "s3-datalayer-datasets",
            "permissions": "ro"
        },
        {
            "mount": "/home/jovyan/data/aws-opendata/satellite-sentinels",
            "name": "s3-satellite-sentinels-images-content",
            "permissions": "ro"
        },
        {
            "mount": "/home/jovyan/data/aws-opendata/genome-browser",
            "name": "s3-genome-browser-content",
            "permissions": "ro"
        }
        ],
        "description": "<img src=\"https://images.datalayer.io/icons/python-100.png\" width=\"60\"/>\n<p><b>A Python environment for heavy data processing, parallel analysis</b></p>\n<p><i>Packages: numpy, pandas, matplotlib, seaborn, scikit-learn, dask, ...</i></p>\n<br/>\n",
        "dockerImage": "qnnxrq3e.c1.bhs5.container-registry.ovh.net/datalayer/jupyter-python:0.1.0",
        "example": "https://raw.githubusercontent.com/datalayer/examples/5a65d7403de2c34f2052526360eeda84aaceabc6/opencv-face-detection/youtube-face-detection.ipynb",
        "kernel": {
        "givenNameTemplate": "Python CPU Runtime"
        },
        "language": "python",
        "owner": "datalayer",
        "resourcesRanges": {
            "default": {
                "limits": {
                    "cpu": "4",
                    "ephemeral-storage": "20Gi",
                    "memory": "20Gi"
                },
                "requests": {
                    "cpu": "2",
                    "ephemeral-storage": "20Gi",
                    "memory": "10Gi"
                    }
                }
            },
        "title": "Python CPU Environment",
        "visibility": "public",
        "name": "python-cpu-env",
        "burning_rate": 0.008,
        "resources": {
            "cpu": "2",
            "ephemeral-storage": "20Gi",
            "memory": "10Gi"
        }
    }
    ]
    """

    def __init__(
        self,
        name: str,
        title: str,
        burning_rate: float,
        language: str,
        owner: str,
        visibility: str,
        metadata: Optional[dict[str, Any]] = None,
    ):
        """
        Initialize an environment.

        Parameters
        ----------
        name: str
            Name of the environment.
        title: str
            Title of the environment.
        burning_rate: float
            The cost of running the environment per hour.
        """
        self.name = name
        self.title = title
        self.burning_rate = burning_rate
        self.language = language
        self.owner = owner
        self.visibility = visibility
        self.metadata = metadata

    def __repr__(self) -> str:
        return f"Environment(name='{self.name}', title='{self.title}')"


class Response:
    """Represents the response from code execution in a runtime."""

    def __init__(self, execute_response: list[dict[str, Any]]):
        """
        Initialize a response object.

        Parameters
        ----------
        execute_response: dict[str, Any]
            The response from the code execution.
        """
        stdout = []
        stderr = []
        for item in execute_response:
            if item.get("output_type") == "stream":
                stdout.append(item["text"])
            elif item.get("output_type") == "error":
                stderr.append(item["ename"])
                stderr.append(item["evalue"])

        self._stdout = "\n".join(stdout)
        self._stderr = "\n".join(stderr)

    def __repr__(self) -> str:
        return f"Response({self._stdout}, {self._stderr})"

    @property
    def stdout(self) -> str:
        """
        Get the standard output of the code execution.

        Returns
        -------
        str: The standard output as a string.
        """
        return self._stdout

    @property
    def stderr(self) -> str:
        """
        Get the standard output of the code execution.

        Returns
        -------
        str: The standard output as a string.
        """
        return self._stderr


class Runtime(DatalayerClientAuthMixin, RuntimesMixin, SnapshotsMixin):
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
        pod_name: Optional[str] = None,
        ingress: Optional[str] = None,
        reservation_id: Optional[str] = None,
        uid: Optional[str] = None,
        burning_rate: Optional[str] = None,
        kernel_token: Optional[str] = None,
        started_at: Optional[str] = None,
        expired_at: Optional[str] = None,
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
        self._environment_name = environment
        self._pod_name = pod_name
        self._run_url = run_url
        self._name = name
        self._ingress = ingress
        self._timeout = timeout
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

        self._executing = False
        # if kernel_token is not None and ingress is not None:
        #     self._kernel_client = KernelClient(server_url=ingress, token=kernel_token)
        #     self._kernel_client.start()

    def __del__(self) -> None:
        # self.stop()
        pass

    def __enter__(self) -> "Runtime":
        """Context manager entry."""
        self._start()
        return self

    def __exit__(self, exc_type: Any, exc_val: Any, exc_tb: Any) -> None:
        """Context manager exit."""
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
            runtime: dict[str, str] = self._runtime.get("runtime")  # type: ignore
            self._ingress = runtime["ingress"]
            self._kernel_token = runtime["token"]
            self._pod_name = runtime["pod_name"]
            self._uid = runtime["uid"]
            self._reservation_id = runtime["reservation_id"]
            self._burning_rate = runtime["burning_rate"]
            self._started_at = runtime["started_at"]
            self._expired_at = runtime["expired_at"]
            self._kernel_client = KernelClient(
                server_url=self._ingress, token=self._kernel_token
            )
            self._kernel_client.start()

    def _stop(self) -> bool:
        """Stop the runtime."""
        if self._kernel_client:
            self._kernel_client.stop()
            self._kernel_client = None
            self._kernel_id = None
            if self._pod_name:
                return self._terminate_runtime(self._pod_name)["success"]
        return False

    def _check_file(self, path: Union[str, Path]) -> bool:
        """Check if a file exists and can be openned."""
        fname = Path(path).expanduser().resolve()
        try:
            with fname.open("rb"):
                pass
            return Path(path).exists()
        except Exception:
            return False

    @property
    def run_url(self) -> str:
        return self._run_url

    @property
    def name(self) -> str:
        return self._name

    @property
    def uid(self) -> Optional[str]:
        return self._uid

    @property
    def pod_name(self) -> Optional[str]:
        return self._pod_name

    def get_variable(self, name: str) -> Any:
        """Set a variable in the runtime."""
        if self._kernel_client:
            response = self._kernel_client.get_variable(name)
            data = response[0]
            import numpy as np

            if isinstance(data, dict) and "text/plain" in data:
                return eval(data["text/plain"])
            else:
                return data
        return None

    def set_variable(self, name: str, value: Any) -> Response:
        """Set a variable in the runtime."""
        return self.set_variables({name: value})

    def set_variables(self, variables: dict[str, Any]) -> Response:
        """Set variables in the runtime."""
        if self._kernel_client:
            variables_code = []
            if variables is not None:
                for key, value in variables.items():
                    variables_code.append(f"{key} = {repr(value)}")

            if variables_code:
                self._kernel_client.execute("\n".join(variables_code))

            return Response([])
        return Response([])

    def execute_file(
        self, path: Union[str, Path], variables: Optional[dict[str, Any]] = None
    ) -> Response:
        """
        Execute a Python file in the runtime.

        Parameters
        ----------
        path: str
            Path to the Python file to execute.
        variables: Optional[dict[str, Any]]
            Optional variables to set before executing the code.

        Returns
        -------
            Response: The result of the code execution.
        """
        fname = Path(path).expanduser().resolve()
        if self._check_file(fname):
            if variables:
                self.set_variables(variables)

            for _id, cell in _get_cells(fname):
                if self._kernel_client:
                    reply = self._kernel_client.execute_interactive(
                        cell,
                        silent=False,
                    )
                    return Response(reply.get("outputs", []))
        return Response([])

    def execute_code(
        self, code: str, variables: Optional[dict[str, Any]] = None
    ) -> Response:
        """
        Execute code in the runtime.

        Parameters
        ----------
        code: str
            The Python code to execute.
        variables: Optional[dict[str, Any]]
            Optional variables to set before executing the code.

        Returns
        -------
            Response: The result of the code execution.
        """
        if not self._check_file(code):
            result: list[dict[str, str]] = []
            if self._kernel_client is not None:
                if variables:
                    self.set_variables(variables)
                reply = self._kernel_client.execute(code)
                result = reply.get("outputs", {})
            else:
                raise RuntimeError(
                    "Kernel client is not started. Call `start()` first."
                )

            return Response(result)

        return Response([])

    def execute(
        self, code_or_path: Union[str, Path], variables: Optional[dict[str, Any]] = None
    ) -> Response:
        """
        Execute code in the runtime.

        Parameters
        ----------
        code_or_path: Union[str, Path]
            The Python code or path to the file to execute.
        variables: Optional[dict[str, Any]]
            Optional variables to set before executing the code.

        Returns
        -------
            dict: The result of the code execution.


        {
            'execution_count': 1,
            'outputs': [
                {
                    'output_type': 'error',
                    'ename': 'SyntaxError',
                    'evalue': 'incomplete input (843041379.py, line 1)',
                    'traceback': ['\x1b[0;36m  Cell \x1b[0;32mIn[1], line 1\x1b[0;36m\x1b[0m\n\x1b[0;31m    print("Hello, Datalayer!"\x1b[0m\n\x1b[0m                             ^\x1b[0m\n\x1b[0;31mSyntaxError\x1b[0m\x1b[0;31m:\x1b[0m incomplete input\n']
                }
            ],
            'status': 'error'
            }
        }
        """
        if self._check_file(code_or_path):
            return self.execute_file(str(code_or_path), variables)
        else:
            return self.execute_code(str(code_or_path), variables)

    def terminate(self) -> bool:
        """Terminate the Runtime."""
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
        name: str
            Name for the new snapshot.
        description: str
            Description for the new snapshot.
        Returns
        -------
        RuntimeSnapshot: A new snapshot object.
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
            environment=snapshot.enviroment,
            metadata=response,
        )


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


class RuntimeSnapshot:
    """Represents a snapshot of a Datalayer runtime state."""

    def __init__(
        self,
        uid: str,
        name: str,
        description: str,
        environment: str,
        metadata: dict[str, Any],
    ):
        """
        Initialize a runtime snapshot.

        Parameters
        ----------
        uid: str
            Unique identifier for the snapshot.
        name: str
            Name of the snapshot.
        description: str
            Description of the snapshot.
        environment: str
            Environment associated with the snapshot.
        metadata: dict
            Metadata related to the snapshot.
        """
        self._uid = uid
        self.name = name
        self.description = description
        self._environment = environment
        self._metadata = metadata

    def __repr__(self) -> str:
        return (
            f"RuntimeSnapshot(uid='{self._uid}', name='{self.name}', "
            f"description='{self.description}', environment='{self._environment}')"
        )

    @property
    def enviroment(self) -> str:
        """
        Get the environment of the snapshot.

        Returns
        -------
        str: The environment associated with the snapshot.
        """
        return self._environment

    @property
    def uid(self) -> str:
        """
        Get the unique identifier of the snapshot.

        Returns
        -------
        str: The unique identifier of the snapshot.
        """
        return self._uid

    @property
    def metadata(self) -> dict[str, str]:
        """
        Get the metadata of the snapshot.

        Returns
        -------
        dict: The metadata associated with the snapshot.
        """
        return self._metadata
