# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""Events management mixin for Datalayer Core."""

import json
import logging
from typing import Any, Optional

logger = logging.getLogger(__name__)


class EventsMixin:
    """Mixin for managing agent events via the AI Agents service."""

    def _list_events(
        self,
        agent_id: Optional[str] = None,
        kind: Optional[str] = None,
        status: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> dict[str, Any]:
        """List events with optional filters."""
        params: dict[str, Any] = {"limit": limit, "offset": offset}
        if agent_id:
            params["agent_id"] = agent_id
        if kind:
            params["kind"] = kind
        if status:
            params["status"] = status

        response = self._fetch(  # type: ignore
            "{}/api/ai-agents/v1/events".format(self.urls.run_url),  # type: ignore
            method="GET",
            params=params,
        )
        return response.json()

    def _create_event(
        self,
        agent_id: str,
        title: str,
        kind: str = "generic",
        status: str = "pending",
        payload: Optional[dict[str, Any]] = None,
        metadata: Optional[dict[str, Any]] = None,
    ) -> dict[str, Any]:
        """Create a new event record."""
        body = {
            "agent_id": agent_id,
            "title": title,
            "kind": kind,
            "status": status,
            "payload": payload or {},
            "metadata": metadata or {},
        }
        response = self._fetch(  # type: ignore
            "{}/api/ai-agents/v1/events".format(self.urls.run_url),  # type: ignore
            method="POST",
            json=body,
        )
        return response.json()

    def _get_event(self, event_id: str) -> dict[str, Any]:
        """Get a single event by ID."""
        response = self._fetch(  # type: ignore
            "{}/api/ai-agents/v1/events/{}".format(self.urls.run_url, event_id),  # type: ignore
            method="GET",
        )
        return response.json()

    def _update_event(
        self,
        event_id: str,
        title: Optional[str] = None,
        kind: Optional[str] = None,
        status: Optional[str] = None,
        read: Optional[bool] = None,
        payload: Optional[dict[str, Any]] = None,
        metadata: Optional[dict[str, Any]] = None,
    ) -> dict[str, Any]:
        """Update a mutable event record."""
        body: dict[str, Any] = {}
        if title is not None:
            body["title"] = title
        if kind is not None:
            body["kind"] = kind
        if status is not None:
            body["status"] = status
        if read is not None:
            body["read"] = read
        if payload is not None:
            body["payload"] = payload
        if metadata is not None:
            body["metadata"] = metadata

        response = self._fetch(  # type: ignore
            "{}/api/ai-agents/v1/events/{}".format(self.urls.run_url, event_id),  # type: ignore
            method="PATCH",
            json=body,
        )
        return response.json()

    def _delete_event(self, event_id: str) -> dict[str, Any]:
        """Delete an event by ID."""
        response = self._fetch(  # type: ignore
            "{}/api/ai-agents/v1/events/{}".format(self.urls.run_url, event_id),  # type: ignore
            method="DELETE",
        )
        return response.json()

    def _mark_event_read(self, event_id: str) -> dict[str, Any]:
        """Mark an event as read."""
        return self._update_event(event_id, read=True)

    def _mark_event_unread(self, event_id: str) -> dict[str, Any]:
        """Mark an event as unread."""
        return self._update_event(event_id, read=False)
