# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

# Copyright (c) 2023-2026 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""
Authenticated transport for `datalayer-durable`'s own workflow API
(``datalayer durable ...``, ORCHESTRATOR.md's note on `auth.py`, 2026-09-13).

Every other caller of durable is a service presenting its own workload key —
`durable/datalayer_durable/auth.py` says so explicitly, and stays that way.
This is the one exception: a platform administrator's CLI, troubleshooting
durable directly with their own Bearer token (the same ``DATALAYER_API_KEY``
every other command here already sends through ``self._fetch``), for a
``platform_admin``-gated route durable added for exactly this caller.

``WorkflowRun`` is defined here, once, rather than in each of this package's
callers: ``datalayer_common.durable_client`` (the async, X-API-KEY-based
client every internal service shares) imports it from here instead of
keeping its own copy — the wire shape of one durable run is one fact,
whoever is asking about it and however they authenticate.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Optional

#: A run's terminal states — over, whichever way.
TERMINAL = frozenset({"completed", "failed", "cancelled"})


@dataclass
class WorkflowRun:
    """One durable run, as a caller sees it — the shape `/api/durable/v1`
    answers with, whichever operation asked."""

    uid: str
    workflow: str
    status: str
    task_uid: str = ""
    queue: str = ""
    error: dict[str, Any] = field(default_factory=dict)

    @classmethod
    def of(cls, payload: dict[str, Any]) -> "WorkflowRun":
        return cls(
            uid=str(payload.get("uid") or ""),
            workflow=str(payload.get("workflow") or ""),
            status=str(payload.get("status") or ""),
            task_uid=str(payload.get("task_uid") or ""),
            queue=str(payload.get("queue") or ""),
            error=dict(payload.get("error") or {}),
        )

    def open(self) -> bool:
        return self.status not in TERMINAL


def _not_found(error: Exception) -> bool:
    """Whether `_fetch`'s own `RuntimeError(... status=404 ...)` is this."""
    return "status=404" in str(error)


class DurableMixin:
    """Authenticated transport for durable's own workflow API."""

    def _durable_url(self, path: str) -> str:
        origin = self.urls.durable_url.rstrip("/")  # type: ignore[attr-defined]
        return f"{origin}/api/durable{path}"

    def start_durable_workflow(
        self,
        workflow: str,
        *,
        task_uid: str,
        queue: str = "",
        arguments: Optional[dict[str, Any]] = None,
    ) -> WorkflowRun:
        """Start a workflow under `task_uid` — the same request twice answers
        the run that already exists, never a second one for one task."""
        response = self._fetch(  # type: ignore[attr-defined]
            self._durable_url("/v1/workflows"),
            method="POST",
            json={
                "workflow": workflow,
                "task_uid": task_uid,
                "queue": queue,
                "arguments": arguments or {},
            },
        )
        return WorkflowRun.of(dict(response.json()))

    def describe_durable_workflow(self, uid: str) -> Optional[WorkflowRun]:
        """A literal workflow uid. For an execution's *current* attempt, once
        it may have retried, use `describe_durable_execution` instead — this
        only ever answers about the uid given, which for an execution means
        attempt 1 (`run_key`, unsuffixed)."""
        try:
            response = self._fetch(self._durable_url(f"/v1/workflows/{uid}"))  # type: ignore[attr-defined]
        except RuntimeError as error:
            if _not_found(error):
                return None
            raise
        return WorkflowRun.of(dict(response.json()))

    def describe_durable_execution(self, execution_id: str, *, account_uid: str) -> Optional[WorkflowRun]:
        """The run of an orchestration execution's *current* attempt — the
        one durable route that is execution-aware rather than a literal
        workflow uid (ORCHESTRATOR.md, O4-05)."""
        try:
            response = self._fetch(  # type: ignore[attr-defined]
                self._durable_url(f"/v1/executions/{execution_id}/run"),
                params={"account_uid": account_uid},
            )
        except RuntimeError as error:
            if _not_found(error):
                return None
            raise
        return WorkflowRun.of(dict(response.json()))

    def cancel_durable_workflow(self, uid: str, *, reason: str = "") -> bool:
        """Stop a run. Already over is `False`, not an error."""
        try:
            self._fetch(  # type: ignore[attr-defined]
                self._durable_url(f"/v1/workflows/{uid}/cancel"),
                method="POST",
                json={"reason": reason},
            )
        except RuntimeError as error:
            if "status=409" in str(error) or _not_found(error):
                return False
            raise
        return True

    def signal_durable_workflow(self, uid: str, name: str, payload: dict[str, Any]) -> bool:
        """Tell a waiting run something. Already over is `False`, not an error."""
        try:
            self._fetch(  # type: ignore[attr-defined]
                self._durable_url(f"/v1/workflows/{uid}/signal"),
                method="POST",
                json={"name": name, "payload": payload},
            )
        except RuntimeError as error:
            if "status=409" in str(error) or _not_found(error):
                return False
            raise
        return True

    def list_open_durable_workflows(self, *, task_uid: str = "", limit: int = 50) -> list[WorkflowRun]:
        response = self._fetch(  # type: ignore[attr-defined]
            self._durable_url("/v1/workflows"),
            params={"task_uid": task_uid, "limit": limit},
        )
        payload = dict(response.json())
        runs = [WorkflowRun.of(item) for item in payload.get("items") or []]
        return [run for run in runs if run.open()]

    def durable_operations(self) -> dict[str, Any]:
        """What durable's engine is, and whether it is reachable at all."""
        try:
            response = self._fetch(self._durable_url("/v1/operations"))  # type: ignore[attr-defined]
        except RuntimeError as error:
            return {"engine": "durable", "durable": False, "detail": str(error)}
        return dict(response.json())
