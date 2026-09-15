# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""
The orchestration control plane, as the Python client reaches it (ORCHESTRATOR.md, O1-13).

Every path comes from ``ORCHESTRATION_API``, generated from the control
plane's own OpenAPI document, so this module spells no route — the rule
``src/api/orchestration/client.ts`` follows too. Commands go as their
canonical records and answers come back as them, an execution an
``Execution`` and an event an ``ExecutionEvent``, with the envelope's own
facts beside them: whether the durable service took a delegation, whether a
workflow was told.

The event stream is resumed across a dropped connection from the last event
received (``Last-Event-ID``), so each event arrives once; a refusal is not
asked again.
"""

from __future__ import annotations

import json
import re
import time
from collections.abc import Callable, Iterator, Mapping
from dataclasses import dataclass, field
from typing import Any
from urllib.parse import quote, urlencode

import requests

from datalayer_core.orchestration import (
    Acknowledgement,
    AgentDescriptor,
    AgentsDiscover,
    Artifact,
    Attempt,
    Execution,
    ExecutionEvent,
    ExecutionsCancel,
    ExecutionsCollect,
    ExecutionsDelegate,
    ExecutionsSteer,
    ExecutionState,
)
from datalayer_core.utils.sse import read_server_sent_events

_PLACEHOLDER = re.compile(r"\{([^}]+)\}")


class SubscriptionDropped(RuntimeError):
    """The stream dropped more times in a row, with no event between, than the subscription allows."""


@dataclass(frozen=True)
class Receipt:
    """What a command to an execution came to."""

    execution: Execution
    acknowledgement: Acknowledgement
    #: For a delegation, whether the durable service took it; for any other
    #: command, whether the execution's workflow was told. Neither is acceptance.
    delivered: bool
    detail: str | None = None
    cancelled_execution_ids: list[str] = field(default_factory=list)

    def to_wire(self) -> dict[str, Any]:
        """The receipt as the CLI emits it: camel case, like the answer it came from."""
        return {
            "execution": self.execution.to_wire(),
            "acknowledgement": self.acknowledgement.to_wire(),
            "delivered": self.delivered,
            "detail": self.detail,
            "cancelledExecutionIds": list(self.cancelled_execution_ids),
        }


@dataclass(frozen=True)
class ExecutionRecord:
    """One execution, its attempts, and the milestones it reached."""

    execution: Execution
    attempts: list[Attempt]
    acknowledgements: list[Acknowledgement]

    def to_wire(self) -> dict[str, Any]:
        return {
            "execution": self.execution.to_wire(),
            "attempts": [attempt.to_wire() for attempt in self.attempts],
            "acknowledgements": [acknowledgement.to_wire() for acknowledgement in self.acknowledgements],
        }


@dataclass(frozen=True)
class Collection:
    """The artifacts registered against an execution, and its children's."""

    execution: Execution
    artifacts: list[Artifact]
    children: list[Execution]

    def to_wire(self) -> dict[str, Any]:
        return {
            "execution": self.execution.to_wire(),
            "artifacts": [artifact.to_wire() for artifact in self.artifacts],
            "children": [child.to_wire() for child in self.children],
        }


def operation_path(operation: str, parameters: Mapping[str, str] | None = None) -> tuple[str, str]:
    """
    The method and path of one operation, its parameters filled in and encoded.

    Raises
    ------
    ValueError
        When the control plane has no such operation, or a parameter its path
        names is missing.
    """
    # Read here rather than at import: the script that writes this table
    # imports `datalayer_core`, whose client imports this module.
    from datalayer_core.orchestration.api import ORCHESTRATION_API

    known = next((one for one in ORCHESTRATION_API if one.operation == operation), None)
    if known is None:
        raise ValueError(f"The control plane has no operation '{operation}'.")
    values = dict(parameters or {})
    path = known.path
    for name in _PLACEHOLDER.findall(known.path):
        value = values.get(name)
        if not value:
            raise ValueError(f"'{operation}' needs '{name}'.")
        path = path.replace(f"{{{name}}}", quote(value, safe=""))
    return known.method, path


def _query_value(value: Any) -> Any:
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, ExecutionState):
        return value.value
    return value


def _receipt(answer: Mapping[str, Any], *, delivered_field: str = "delivered") -> Receipt:
    return Receipt(
        execution=Execution.from_wire(answer["execution"]),
        acknowledgement=Acknowledgement.from_wire(answer["acknowledgement"]),
        delivered=bool(answer.get(delivered_field)),
        detail=answer.get("detail"),
        cancelled_execution_ids=list(answer.get("cancelledExecutionIds") or []),
    )


class OrchestrationMixin:
    """Authenticated transport for the orchestration control plane of AI Agents."""

    def _orchestration_url(
        self,
        operation: str,
        parameters: Mapping[str, str] | None = None,
        query: Mapping[str, Any] | None = None,
        *,
        account_uid: str | None = None,
    ) -> tuple[str, str]:
        method, path = operation_path(operation, parameters)
        present = {
            name: _query_value(value)
            for name, value in (query or {}).items()
            if value is not None and value != ""
        }
        if account_uid:
            present["account_uid"] = account_uid
        suffix = f"?{urlencode(present)}" if present else ""
        origin = self.urls.ai_agents_url.rstrip("/")  # type: ignore[attr-defined]
        return method, f"{origin}{path}{suffix}"

    def _orchestration_call(
        self,
        operation: str,
        *,
        body: Mapping[str, Any] | None = None,
        parameters: Mapping[str, str] | None = None,
        query: Mapping[str, Any] | None = None,
        account_uid: str | None = None,
    ) -> dict[str, Any]:
        method, url = self._orchestration_url(operation, parameters, query, account_uid=account_uid)
        arguments: dict[str, Any] = {"method": method}
        if body is not None:
            arguments["json"] = dict(body)
        response = self._fetch(url, **arguments)  # type: ignore[attr-defined]
        return dict(response.json())

    def discover_agents(self, command: AgentsDiscover, *, account_uid: str | None = None) -> list[AgentDescriptor]:
        """``agents.discover``: the workers meeting every constraint the command states."""
        answer = self._orchestration_call("agents.discover", body=command.to_wire(), account_uid=account_uid)
        return [AgentDescriptor.from_wire(agent) for agent in answer.get("agents") or []]

    def delegate_execution(self, command: ExecutionsDelegate, *, account_uid: str | None = None) -> Receipt:
        """``executions.delegate``: an objective and its context, to a worker."""
        answer = self._orchestration_call("executions.delegate", body=command.to_wire(), account_uid=account_uid)
        return _receipt(answer, delivered_field="dispatched")

    def steer_execution(self, command: ExecutionsSteer, *, account_uid: str | None = None) -> Receipt:
        """``executions.steer``: instructions added while the work runs."""
        return _receipt(self._orchestration_call("executions.steer", body=command.to_wire(), account_uid=account_uid))

    def cancel_execution(self, command: ExecutionsCancel, *, account_uid: str | None = None) -> Receipt:
        """``executions.cancel``: stop the work, and by default everything below it."""
        return _receipt(self._orchestration_call("executions.cancel", body=command.to_wire(), account_uid=account_uid))

    def collect_execution(self, command: ExecutionsCollect, *, account_uid: str | None = None) -> Collection:
        """``executions.collect``: the artifacts of an execution, and of its children."""
        answer = self._orchestration_call("executions.collect", body=command.to_wire(), account_uid=account_uid)
        return Collection(
            execution=Execution.from_wire(answer["execution"]),
            artifacts=[Artifact.from_wire(artifact) for artifact in answer.get("artifacts") or []],
            children=[Execution.from_wire(child) for child in answer.get("children") or []],
        )

    def get_execution(self, execution_id: str, *, account_uid: str | None = None) -> ExecutionRecord:
        """One execution, its attempts, and the milestones it reached."""
        answer = self._orchestration_call(
            "executions.get", parameters={"execution_id": execution_id}, account_uid=account_uid
        )
        return ExecutionRecord(
            execution=Execution.from_wire(answer["execution"]),
            attempts=[Attempt.from_wire(attempt) for attempt in answer.get("attempts") or []],
            acknowledgements=[Acknowledgement.from_wire(one) for one in answer.get("acknowledgements") or []],
        )

    def list_executions(
        self,
        *,
        root_execution_id: str | None = None,
        parent_execution_id: str | None = None,
        status: ExecutionState | None = None,
        account_uid: str | None = None,
    ) -> list[Execution]:
        """The account's executions, oldest first: a tree by its root, a level by its parent."""
        answer = self._orchestration_call(
            "executions.list",
            query={"rootExecutionId": root_execution_id, "parentExecutionId": parent_execution_id, "status": status},
            account_uid=account_uid,
        )
        return [Execution.from_wire(execution) for execution in answer.get("executions") or []]

    def subscribe_execution(
        self,
        execution_id: str,
        *,
        include_children: bool = True,
        from_sequence: int | None = None,
        last_event_id: str | None = None,
        account_uid: str | None = None,
        max_reconnects: int = 5,
        reconnect_delay: float = 1.0,
        on_tree: Callable[[dict[str, Any], str], None] | None = None,
    ) -> Iterator[tuple[ExecutionEvent, str]]:
        """
        ``executions.subscribe``: each event of an execution, and of its tree, until every one is over.

        Yields each event with the cursor it moved the subscription to — the
        id to resume from. A dropped connection, before the service answered or
        in the middle of the stream, is resumed from the last event received; a
        refusal raises at once. After ``max_reconnects`` drops in a row with no
        event between them, ``SubscriptionDropped`` is raised.

        After each batch the service sends the ``orchestration.tree`` roll-up
        of the executions the stream covers (O2-03). It moves the cursor, is
        handed to ``on_tree`` with it when one is given, and is never yielded
        as an event.
        """
        _, url = self._orchestration_url(
            "executions.subscribe",
            {"execution_id": execution_id},
            {"includeChildren": include_children, "fromSequence": from_sequence},
            account_uid=account_uid,
        )
        cursor = last_event_id
        drops = 0
        while True:
            headers = {"Accept": "text/event-stream"}
            if cursor:
                headers["Last-Event-ID"] = cursor
            received = ended = False
            try:
                # No read timeout: an execution whose worker is thinking sends
                # nothing for as long as it thinks, and that is not a drop.
                response = self._fetch(url, method="GET", headers=headers, stream=True, timeout=(10, None))  # type: ignore[attr-defined]
            except requests.exceptions.RequestException:
                response = None
            if response is not None:
                try:
                    for framed in read_server_sent_events(response.iter_lines(decode_unicode=True)):
                        if framed.event == "end":
                            ended = True
                            break
                        if framed.id:
                            cursor = framed.id
                        received = True
                        if framed.event == "orchestration.tree":
                            # What the tree is doing, not something that
                            # happened to one execution (O2-03).
                            if on_tree is not None:
                                on_tree(json.loads(framed.data), framed.id or "")
                            continue
                        yield ExecutionEvent.from_wire(json.loads(framed.data)), framed.id or ""
                except requests.exceptions.RequestException:
                    pass
                finally:
                    response.close()
            if ended:
                return
            drops = 0 if received else drops + 1
            if drops > max_reconnects:
                raise SubscriptionDropped(
                    f"The subscription to '{execution_id}' dropped {drops} times with no event in between."
                )
            time.sleep(reconnect_delay)
