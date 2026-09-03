# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""
Datalayer Client - account and platform operations for Datalayer.

Provides authentication, secrets, API keys, usage, and profile capabilities.
Runtime creation and code execution live in ``agent_runtimes`` (RuntimeClient).
"""

import logging
import os
from typing import Any, Optional, Union

from datalayer_core.mixins.api_keys import ApiKeysMixin
from datalayer_core.mixins.authn import AuthnMixin
from datalayer_core.mixins.contents import ContentsMixin
from datalayer_core.mixins.mcp import McpMixin
from datalayer_core.mixins.secrets import SecretsMixin
from datalayer_core.mixins.spaces import SpacesMixin
from datalayer_core.mixins.usage import UsageMixin
from datalayer_core.mixins.whoami import WhoamiAppMixin
from datalayer_core.models import UserModel
from datalayer_core.models.api_key import ApiKeyModel, ApiKeyType
from datalayer_core.models.secret import SecretModel, SecretVariant
from datalayer_core.models.space import ItemModel, SpaceModel
from datalayer_core.utils.urls import DatalayerURLs

logger = logging.getLogger(__name__)


class DatalayerClient(
    AuthnMixin,
    SecretsMixin,
    ApiKeysMixin,
    SpacesMixin,
    UsageMixin,
    WhoamiAppMixin,
    ContentsMixin,
    McpMixin,
):
    """
    Client for Datalayer AI platform.

    Provides a unified interface for authentication, runtime creation,
    and code execution in Datalayer environments.

    Parameters
    ----------
    urls : Optional[DatalayerURLs]
        Pre-configured URLs object for all Datalayer services.
    api_key : Optional[str]
        Datalayer API key (can also be set via DATALAYER_API_KEY env var).
    """

    def __init__(
        self,
        urls: Optional[DatalayerURLs] = None,
        api_key: Optional[str] = None,
    ):
        """
        Initialize Datalayer.

        Parameters
        ----------
        urls : Optional[DatalayerURLs]
            Pre-configured URLs object. If not provided, will use environment variables or defaults.
        api_key : Optional[str]
            Datalayer API key (can also be set via DATALAYER_API_KEY env var).
        """
        # TODO: Check user and password login

        # Use provided urls or create from environment
        if urls is not None:
            self._urls = urls
        else:
            self._urls = DatalayerURLs.from_environment()

        self._api_key = api_key  # Store the explicitly passed API key
        self._external_token = None
        self._user_handle = None
        self._kernel_client = None
        self._notebook_client = None

        # Use the AuthnMixin API key management to resolve with fallbacks
        resolved_api_key = self._get_api_key()
        if not resolved_api_key:
            raise ValueError(
                "An API key is required. Set it via the `api_key` parameter, the `DATALAYER_API_KEY` environment variable, or authenticate with `datalayer login`"
            )

    @property
    def urls(self) -> DatalayerURLs:
        """
        Get the configured URLs object.

        Returns
        -------
        DatalayerURLs
            The URLs configuration object.
        """
        return self._urls

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

    def get_profile(self) -> UserModel:
        """
        Get the user's profile information.

        Returns
        -------
        Profile
            A Profile object containing user details.
        """
        response = self._get_profile()
        if response["success"]:
            return UserModel.from_data(response["profile"])
        raise RuntimeError("Failed to get profile information")

    def get_usage_credits(self) -> dict[str, Any]:
        """
        Get usage credits and reservations.

        Returns
        -------
        dict[str, Any]
            Usage credits response.
        """
        return self._get_usage_credits()

    def get_subscription(self) -> dict[str, Any]:
        """
        Get current subscription information.

        Returns
        -------
        dict[str, Any]
            Subscription response payload.
        """
        return self._get_subscription()

    def cancel_subscription(self) -> dict[str, Any]:
        """
        Start cancellation flow for current subscription.

        Returns
        -------
        dict[str, Any]
            Cancellation response payload.
        """
        return self._cancel_subscription()

    def get_subscription_plans(self) -> dict[str, Any]:
        """
        Get available monthly subscription plans.

        Returns
        -------
        dict[str, Any]
            Subscription plans response payload.
        """
        return self._get_subscription_plans()

    def create_checkout_portal(self, return_url: str) -> dict[str, Any]:
        """
        Create a checkout portal session.

        Parameters
        ----------
        return_url : str
            URL to return to after checkout operations.

        Returns
        -------
        dict[str, Any]
            Checkout portal response payload.
        """
        return self._create_checkout_portal(return_url)

    def list_secrets(self) -> list[SecretModel]:
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
                SecretModel(
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
        secret_type: str = SecretVariant.GENERIC,
    ) -> "SecretModel":
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
        return SecretModel(
            uid=secret_data.get("uid"),
            name=secret_data.get("name_s"),
            description=secret_data.get("description_t"),
            secret_type=secret_data.get("variant_s"),
        )

    def delete_secret(self, secret: Union[str, SecretModel]) -> dict[str, str]:
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
        uid = secret.uid if isinstance(secret, SecretModel) else secret
        return self._delete_secret(uid)

    def create_api_key(
        self,
        name: str,
        description: str,
        expiration_date: int = 0,
        api_key_type: Union[str, ApiKeyType] = ApiKeyType.SECRET,
    ) -> dict[str, Any]:
        """
        Create a new API key.

        Parameters
        ----------
        name : str
            Name of the API key.
        description : str
            Description of the API key.
        expiration_date : int, default 0
            Expiration date of the API key in seconds since epoch.
        api_key_type : Union[str, ApiKeyType], default ApiKeyType.SECRET
            Type of the API key (secret, publishable, restricted, temporary).

        Returns
        -------
        dict[str, Any]
            A dictionary containing the created API key and its details.
        """
        return self._create_api_key(
            name=name,
            description=description,
            expiration_date=expiration_date,
            api_key_type=api_key_type,
        )

    def list_api_keys(self) -> list[ApiKeyModel]:
        """
        List all API keys.

        Returns
        -------
        list[ApiKeyModel]
            A list of API keys associated with the user.
        """
        response = self._list_api_keys()
        if response.get("success"):
            payload = response.get(
                "apiKeys",
                response.get("api_keys", response.get("tokens", [])),
            )
            api_key_objects = []
            for api_key_data in payload:
                api_key = ApiKeyModel(
                    uid=api_key_data["uid"],
                    name=api_key_data.get("name_s", ""),
                    description=api_key_data.get("description_t", ""),
                    api_key_type=api_key_data.get("variant_s", "secret"),
                )
                api_key_objects.append(api_key)
            return api_key_objects
        return []

    def list_spaces(self) -> list[SpaceModel]:
        """
        List the spaces of the authenticated user.

        The items of each space are included, so a caller wanting notebooks
        does not have to ask again per space.

        Returns
        -------
        list[SpaceModel]
            The spaces this user can reach, empty when the call fails.
        """
        response = self._list_spaces()
        if response.get("success"):
            return [SpaceModel.from_response(s) for s in response.get("spaces", [])]
        return []

    def list_notebooks(self) -> list[ItemModel]:
        """
        List the notebooks of the authenticated user, across their spaces.

        "Which notebooks do I have" is one question, and answering it with
        "first, which spaces do you have" is a round trip the caller should
        not have to make. Each notebook carries the space it belongs to.

        Returns
        -------
        list[ItemModel]
            Every notebook this user can reach.
        """
        return [
            notebook for space in self.list_spaces() for notebook in space.notebooks()
        ]

    def list_notebook_versions(self, notebook: Union[str, ItemModel]) -> list[dict[str, Any]]:
        """
        List a notebook's kept versions, newest first.

        Each carries ``uid``, ``created_at``, ``message``, ``reason`` and an
        ``actor`` naming the person and, when one acted, the agent.

        Parameters
        ----------
        notebook : Union[str, ItemModel]
            The notebook, or its uid.

        Returns
        -------
        list[dict]
            The versions, empty when the call fails.
        """
        uid = notebook.uid if isinstance(notebook, ItemModel) else notebook
        response = self._list_notebook_versions(uid)
        if response.get("success"):
            return list(response.get("versions") or [])
        return []

    def snapshot_notebook(self, notebook: Union[str, ItemModel], message: str = "") -> dict[str, Any]:
        """
        Keep a notebook as it is now, as a version to restore later.

        Parameters
        ----------
        notebook : Union[str, ItemModel]
            The notebook, or its uid.
        message : str
            Why this moment is worth keeping.

        Returns
        -------
        dict
            The version kept, or ``{"success": False, "message": ...}``.

        Raises
        ------
        RuntimeError
            When the spacer refused: no ``update`` access, or no such notebook.
        """
        uid = notebook.uid if isinstance(notebook, ItemModel) else notebook
        response = self._snapshot_notebook(uid, message)
        if not response.get("success"):
            raise RuntimeError(str(response.get("message") or response.get("detail") or "the version was not kept"))
        return dict(response.get("version") or {})

    def restore_notebook_version(self, notebook: Union[str, ItemModel], version_uid: str) -> dict[str, Any]:
        """
        Make a kept version the notebook's current content.

        The spacer keeps the content it replaces first, as a ``restore``
        version, so this can itself be undone.

        Parameters
        ----------
        notebook : Union[str, ItemModel]
            The notebook, or its uid.
        version_uid : str
            A version uid from :meth:`list_notebook_versions`.

        Returns
        -------
        dict
            ``restored`` (the version made current) and ``kept`` (the one
            made of what it replaced).

        Raises
        ------
        RuntimeError
            When the spacer refused or knows no such version.
        """
        uid = notebook.uid if isinstance(notebook, ItemModel) else notebook
        response = self._restore_notebook_version(uid, version_uid)
        if not response.get("success"):
            raise RuntimeError(str(response.get("message") or response.get("detail") or "the version was not restored"))
        return {"restored": response.get("restored") or {}, "kept": response.get("kept") or {}}

    def delete_api_key(self, api_key: Union[str, ApiKeyModel]) -> bool:
        """
        Delete a specific API key.

        Parameters
        ----------
        api_key : Union[str, ApiKeyModel]
            API key object or UID string to delete.

        Returns
        -------
        bool
            The result of the deletion operation.
        """
        api_key_uid = api_key.uid if isinstance(api_key, ApiKeyModel) else api_key
        response = self._delete_api_key(api_key_uid)
        return response.get("success", False)
