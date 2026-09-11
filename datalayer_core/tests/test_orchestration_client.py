# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""The orchestration client reaches the control plane only through the generated routes (O1-13).

Every path comes from ``ORCHESTRATION_API``; commands go as canonical records
and answers come back as them; and the event stream is resumed across a drop
from the last event received, each event once, while a refusal is not asked
again.
"""

from __future__ import annotations

import json
from typing import Any, Iterator

import pytest
import requests

from datalayer_core.mixins.orchestration import OrchestrationMixin, SubscriptionDropped, operation_path
from datalayer_core.orchestration import (
    Acknowledgement,
    AcknowledgementKind,
    AgentBinding,
    AgentDescriptor,
    AgentProtocol,
    AgentsDiscover,
    CommandName,
    Execution,
    ExecutionEvent,
    ExecutionEventType,
    ExecutionState,
    ExecutionsDelegate,
    ExecutionsSteer,
    Objective,
    ProtocolEndpoint,
    binding_for,
    command_idempotency_key,
)
from datalayer_core.orchestration.api import ORCHESTRATION_API
from datalayer_core.utils.sse import ServerSentEvent, read_server_sent_events
from datalayer_core.utils.urls import DatalayerURLs

NOW = "2026-09-10T10:00:00+00:00"


def an_execution(status: ExecutionState = ExecutionState.RUNNING) -> Execution:
    return Execution(
        execution_id="exec_1",
        root_execution_id="exec_1",
        agent=AgentBinding(
            agent_id="validator",
            capability="notebook.validate",
            protocol=AgentProtocol.A2A,
            endpoint="https://agents.example/a2a",
        ),
        objective=Objective(goal="Validate the notebook"),
        status=status,
        created_at=NOW,
        updated_at=NOW,
    )


def an_acknowledgement(command: CommandName = CommandName.EXECUTIONS_DELEGATE) -> Acknowledgement:
    return Acknowledgement(
        kind=AcknowledgementKind.RECEIVED,
        execution_id="exec_1",
        command=command,
        idempotency_key="key-1",
        acknowledged_at=NOW,
    )


def an_event(sequence: int) -> ExecutionEvent:
    return ExecutionEvent(
        event_id=f"evt_{sequence}",
        type=ExecutionEventType.PROGRESS,
        sequence=sequence,
        emitted_at=NOW,
        root_execution_id="exec_1",
        execution_id="exec_1",
        message=f"Step {sequence}.",
    )


class Answer:
    def __init__(self, value: Any) -> None:
        self._value = value

    def json(self) -> Any:
        return self._value


class Stream:
    """A streamed response: its lines, then a break when one is given."""

    def __init__(self, lines: list[str], *, then: Exception | None = None) -> None:
        self._lines = lines
        self._then = then
        self.closed = False

    def iter_lines(self, decode_unicode: bool = False) -> Iterator[str]:
        yield from self._lines
        if self._then is not None:
            raise self._then

    def close(self) -> None:
        self.closed = True


def framed(event: ExecutionEvent, cursor: str) -> list[str]:
    return [f"id: {cursor}", f"event: {event.type.value}", f"data: {json.dumps(event.to_wire())}", ""]


class Client(OrchestrationMixin):
    def __init__(self, *answers: Any) -> None:
        self.urls = DatalayerURLs.from_environment(ai_agents_url="https://agents.test")
        self.calls: list[tuple[str, dict[str, Any]]] = []
        self.answers = list(answers)

    def _fetch(self, url: str, **kwargs: Any) -> Any:
        self.calls.append((url, kwargs))
        answer = self.answers.pop(0)
        if isinstance(answer, Exception):
            raise answer
        return answer


class TestTheRoutes:
    def test_every_command_of_the_control_plane_has_its_generated_operation(self) -> None:
        named = {operation.operation for operation in ORCHESTRATION_API}
        assert {name.value for name in CommandName} <= named
        assert all(operation.path.startswith("/api/ai-agents/v1/orchestration/") for operation in ORCHESTRATION_API)

    def test_a_path_is_filled_and_encoded_and_a_missing_parameter_refused(self) -> None:
        assert operation_path("executions.get", {"execution_id": "exec 1/2"}) == (
            "GET",
            "/api/ai-agents/v1/orchestration/executions/exec%201%2F2",
        )
        with pytest.raises(ValueError, match="needs 'execution_id'"):
            operation_path("executions.get")
        with pytest.raises(ValueError, match="no operation"):
            operation_path("executions.nothing")


class TestTheCalls:
    def test_a_command_goes_as_its_canonical_record_for_the_account_named(self) -> None:
        client = Client(Answer({"agents": [AgentDescriptor(agent_id="validator", name="Validator").to_wire()]}))
        agents = client.discover_agents(AgentsDiscover(capabilities=["notebook.validate"]), account_uid="org-1")
        assert [agent.agent_id for agent in agents] == ["validator"]
        url, kwargs = client.calls[0]
        assert url == "https://agents.test/api/ai-agents/v1/orchestration/agents/discover?account_uid=org-1"
        assert kwargs["method"] == "POST" and kwargs["json"]["capabilities"] == ["notebook.validate"]

    def test_a_delegation_says_whether_the_durable_service_took_it(self) -> None:
        client = Client(
            Answer(
                {
                    "execution": an_execution().to_wire(),
                    "acknowledgement": an_acknowledgement().to_wire(),
                    "dispatched": False,
                    "detail": "No durable service is configured.",
                }
            )
        )
        command = ExecutionsDelegate(
            idempotency_key="key-1", agent=an_execution().agent, objective=Objective(goal="Validate the notebook")
        )
        receipt = client.delegate_execution(command)
        assert (receipt.delivered, receipt.detail) == (False, "No durable service is configured.")
        assert receipt.execution.execution_id == "exec_1"
        assert client.calls[0][1]["json"]["idempotencyKey"] == "key-1"

    def test_a_steer_says_whether_the_run_was_told(self) -> None:
        client = Client(
            Answer(
                {
                    "execution": an_execution().to_wire(),
                    "acknowledgement": an_acknowledgement(CommandName.EXECUTIONS_STEER).to_wire(),
                    "delivered": True,
                }
            )
        )
        receipt = client.steer_execution(
            ExecutionsSteer(idempotency_key="key-2", execution_id="exec_1", instructions="Check the assumptions")
        )
        assert receipt.delivered is True
        assert client.calls[0][0] == "https://agents.test/api/ai-agents/v1/orchestration/executions/steer"

    def test_a_list_asks_by_state_and_a_read_answers_attempts_and_milestones(self) -> None:
        client = Client(
            Answer({"executions": [an_execution().to_wire()]}),
            Answer(
                {
                    "execution": an_execution().to_wire(),
                    "attempts": [],
                    "acknowledgements": [an_acknowledgement().to_wire()],
                }
            ),
        )
        assert [one.execution_id for one in client.list_executions(status=ExecutionState.RUNNING)] == ["exec_1"]
        record = client.get_execution("exec_1")
        assert client.calls[0][0] == "https://agents.test/api/ai-agents/v1/orchestration/executions?status=running"
        assert client.calls[1][0] == "https://agents.test/api/ai-agents/v1/orchestration/executions/exec_1"
        assert [one.kind for one in record.acknowledgements] == [AcknowledgementKind.RECEIVED]


class TestTheStream:
    def test_a_drop_is_resumed_from_the_last_event_and_each_event_arrives_once(self) -> None:
        first, second, third = an_event(1), an_event(2), an_event(3)
        client = Client(
            Stream(
                [*framed(first, "exec_1:1"), *framed(second, "exec_1:2")],
                then=requests.exceptions.ChunkedEncodingError("dropped"),
            ),
            Stream([*framed(third, "exec_1:3"), "event: end", "data: {}", ""]),
        )
        received = list(client.subscribe_execution("exec_1", reconnect_delay=0))
        assert [(event.event_id, cursor) for event, cursor in received] == [
            ("evt_1", "exec_1:1"),
            ("evt_2", "exec_1:2"),
            ("evt_3", "exec_1:3"),
        ]
        (first_url, first_call), (_, second_call) = client.calls
        assert first_url == (
            "https://agents.test/api/ai-agents/v1/orchestration/executions/exec_1/events?includeChildren=true"
        )
        assert first_call["stream"] is True and "Last-Event-ID" not in first_call["headers"]
        assert second_call["headers"]["Last-Event-ID"] == "exec_1:2"

    def test_a_refusal_is_not_asked_again(self) -> None:
        client = Client(RuntimeError("Failed to request the URL (status=404)"))
        with pytest.raises(RuntimeError, match="status=404"):
            list(client.subscribe_execution("exec_1", reconnect_delay=0))
        assert len(client.calls) == 1

    def test_a_stream_that_keeps_dropping_with_nothing_between_gives_up(self) -> None:
        client = Client(*[requests.exceptions.ConnectionError("gone") for _ in range(3)])
        with pytest.raises(SubscriptionDropped, match="dropped 3 times"):
            list(client.subscribe_execution("exec_1", max_reconnects=2, reconnect_delay=0))
        assert len(client.calls) == 3


class TestServerSentEvents:
    def test_the_framing_of_the_event_stream_format(self) -> None:
        lines = [": a comment", "id: 7", "event: execution.progress", "data: first", "data: second\r", "", "", "data: unfinished"]
        assert list(read_server_sent_events(lines)) == [
            ServerSentEvent(event="execution.progress", data="first\nsecond", id="7")
        ]


class TestTheHelpers:
    def test_a_derived_key_is_what_the_command_asks_and_nothing_else(self) -> None:
        steer = ExecutionsSteer(idempotency_key="one", execution_id="exec_1", instructions="Check the assumptions")
        again = ExecutionsSteer(
            idempotency_key="two", execution_id="exec_1", instructions="Check the assumptions", issued_at=NOW
        )
        other = ExecutionsSteer(idempotency_key="one", execution_id="exec_1", instructions="Check the plots")
        assert command_idempotency_key(steer) == command_idempotency_key(again)
        assert command_idempotency_key(steer) != command_idempotency_key(other)

    def test_a_binding_is_the_worker_s_endpoint_over_the_protocol_asked_for(self) -> None:
        descriptor = AgentDescriptor(
            agent_id="validator",
            name="Validator",
            capabilities=["notebook.validate"],
            endpoints=[
                ProtocolEndpoint(protocol=AgentProtocol.A2A, url="https://agents.example/a2a"),
                ProtocolEndpoint(protocol=AgentProtocol.ACP, url="wss://agents.example/acp"),
            ],
        )
        assert binding_for(descriptor).endpoint == "https://agents.example/a2a"
        acp = binding_for(descriptor, protocol=AgentProtocol.ACP)
        assert (acp.protocol, acp.endpoint, acp.capability) == (
            AgentProtocol.ACP,
            "wss://agents.example/acp",
            "notebook.validate",
        )
        with pytest.raises(ValueError, match="does not declare the capability"):
            binding_for(descriptor, capability="web.research")
        with pytest.raises(ValueError, match="declares no endpoint over acp"):
            binding_for(
                AgentDescriptor(
                    agent_id="researcher",
                    name="Researcher",
                    endpoints=[ProtocolEndpoint(protocol=AgentProtocol.A2A, url="https://agents.example/r")],
                ),
                protocol=AgentProtocol.ACP,
            )
