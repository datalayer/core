# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""Agent Spaces mixin for Datalayer Core client."""

import logging
from typing import Any, Optional

logger = logging.getLogger(__name__)


class AgentSpacesMixin:
    """Mixin for agent space operations in Datalayer."""

    def list_agent_spaces(self) -> list[dict[str, Any]]:
        """
        List agent spaces for the current user.

        Returns
        -------
        list[dict[str, Any]]
            List of agent spaces.
        """
        response = self._fetch(  # type: ignore
            "{}/api/spacer/v1/agent-spaces".format(self.urls.spacer_url),  # type: ignore
            method="GET",
        )

        if response.status_code != 200:
            logger.error(f"Failed to list agent spaces: HTTP {response.status_code}")
            return []

        data = response.json()
        if data.get("success"):
            return data.get("agentSpaces", [])
        return []

    def list_public_agent_spaces(self) -> list[dict[str, Any]]:
        """
        List all public agent spaces (Library).

        Returns
        -------
        list[dict[str, Any]]
            List of public agent spaces.
        """
        response = self._fetch(  # type: ignore
            "{}/api/spacer/v1/agent-spaces/public".format(self.urls.spacer_url),  # type: ignore
            method="GET",
        )

        if response.status_code != 200:
            logger.error(
                f"Failed to list public agent spaces: HTTP {response.status_code}"
            )
            return []

        data = response.json()
        if data.get("success"):
            return data.get("agentSpaces", [])
        return []

    def get_agent_space(self, uid: str) -> Optional[dict[str, Any]]:
        """
        Get an agent space by UID.

        Parameters
        ----------
        uid : str
            The agent space UID.

        Returns
        -------
        Optional[dict[str, Any]]
            The agent space data, or None if not found.
        """
        response = self._fetch(  # type: ignore
            "{}/api/spacer/v1/agent-spaces/{}".format(self.urls.spacer_url, uid),  # type: ignore
            method="GET",
        )

        if response.status_code == 404:
            return None

        if response.status_code != 200:
            logger.error(f"Failed to get agent space: HTTP {response.status_code}")
            return None

        data = response.json()
        if data.get("success"):
            return data.get("agentSpace")
        return None

    def create_agent_space(
        self,
        name: str,
        space_id: str,
        description: str = "",
        tags: Optional[list[str]] = None,
        status: str = "paused",
        is_public: bool = False,
        agent_spec: Optional[dict[str, Any]] = None,
        thumbnail: Optional[str] = None,
    ) -> Optional[dict[str, Any]]:
        """
        Create a new agent space.

        Parameters
        ----------
        name : str
            Name of the agent space.
        space_id : str
            Parent space ID.
        description : str
            Description of the agent space.
        tags : Optional[list[str]]
            Tags for categorization.
        status : str
            Initial status (default: 'paused').
        is_public : bool
            Whether publicly visible (default: False).
        agent_spec : Optional[dict[str, Any]]
            Agent specification.
        thumbnail : Optional[str]
            Thumbnail URL.

        Returns
        -------
        Optional[dict[str, Any]]
            The created agent space, or None on failure.
        """
        body = {
            "name": name,
            "spaceId": space_id,
            "description": description,
            "tags": tags or [],
            "status": status,
            "isPublic": is_public,
        }

        if agent_spec:
            body["agentSpec"] = agent_spec
        if thumbnail:
            body["thumbnail"] = thumbnail

        response = self._fetch(  # type: ignore
            "{}/api/spacer/v1/agent-spaces".format(self.urls.spacer_url),  # type: ignore
            method="POST",
            body=body,
        )

        if response.status_code not in (200, 201):
            logger.error(f"Failed to create agent space: HTTP {response.status_code}")
            return None

        data = response.json()
        if data.get("success"):
            return data.get("agentSpace")
        return None

    def update_agent_space(
        self,
        uid: str,
        **kwargs: Any,
    ) -> Optional[dict[str, Any]]:
        """
        Update an agent space.

        Parameters
        ----------
        uid : str
            The agent space UID.
        **kwargs : Any
            Fields to update (name, description, tags, status, isPublic,
            agentSpec, podName, runtimeUrl, messageCount, lastMessage, thumbnail).

        Returns
        -------
        Optional[dict[str, Any]]
            The updated agent space, or None on failure.
        """
        # Build update body from provided kwargs
        body = {}
        valid_fields = {
            "name",
            "description",
            "tags",
            "status",
            "isPublic",
            "agentSpec",
            "podName",
            "runtimeUrl",
            "messageCount",
            "lastMessage",
            "thumbnail",
        }
        for key, value in kwargs.items():
            if key in valid_fields and value is not None:
                body[key] = value

        if not body:
            logger.warning("No valid fields provided for update")
            return self.get_agent_space(uid)

        response = self._fetch(  # type: ignore
            "{}/api/spacer/v1/agent-spaces/{}".format(self.urls.spacer_url, uid),  # type: ignore
            method="PUT",
            body=body,
        )

        if response.status_code == 404:
            return None

        if response.status_code != 200:
            logger.error(f"Failed to update agent space: HTTP {response.status_code}")
            return None

        data = response.json()
        if data.get("success"):
            return data.get("agentSpace")
        return None

    def delete_agent_space(self, uid: str) -> bool:
        """
        Delete an agent space.

        Parameters
        ----------
        uid : str
            The agent space UID.

        Returns
        -------
        bool
            True if deleted, False if not found or on error.
        """
        response = self._fetch(  # type: ignore
            "{}/api/spacer/v1/agent-spaces/{}".format(self.urls.spacer_url, uid),  # type: ignore
            method="DELETE",
        )

        if response.status_code == 204:
            return True

        if response.status_code == 404:
            logger.warning(f"Agent space not found: {uid}")
            return False

        logger.error(f"Failed to delete agent space: HTTP {response.status_code}")
        return False

    def make_agent_space_public(self, uid: str) -> Optional[dict[str, Any]]:
        """
        Make an agent space public (add to Library).

        Parameters
        ----------
        uid : str
            The agent space UID.

        Returns
        -------
        Optional[dict[str, Any]]
            The updated agent space, or None on failure.
        """
        response = self._fetch(  # type: ignore
            "{}/api/spacer/v1/agent-spaces/{}/public".format(self.urls.spacer_url, uid),  # type: ignore
            method="POST",
        )

        if response.status_code == 404:
            return None

        if response.status_code != 200:
            logger.error(
                f"Failed to make agent space public: HTTP {response.status_code}"
            )
            return None

        data = response.json()
        if data.get("success"):
            return data.get("agentSpace")
        return None

    def make_agent_space_private(self, uid: str) -> Optional[dict[str, Any]]:
        """
        Make an agent space private (remove from Library).

        Parameters
        ----------
        uid : str
            The agent space UID.

        Returns
        -------
        Optional[dict[str, Any]]
            The updated agent space, or None on failure.
        """
        response = self._fetch(  # type: ignore
            "{}/api/spacer/v1/agent-spaces/{}/private".format(
                self.urls.spacer_url, uid
            ),  # type: ignore
            method="POST",
        )

        if response.status_code == 404:
            return None

        if response.status_code != 200:
            logger.error(
                f"Failed to make agent space private: HTTP {response.status_code}"
            )
            return None

        data = response.json()
        if data.get("success"):
            return data.get("agentSpace")
        return None
