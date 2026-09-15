# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""The twelve commands, the five acknowledgements and the event envelope
(PLAN_ORCHESTRATOR.md, sections 6.2, 6.3, 6.4, O0-03).

The two rules of 6.4 that a schema can hold are held here: a mutating
command without an idempotency key does not validate, and an event that
cannot be placed in a tree — no execution, no root — does not validate
either. The rest of 6.4, leases and reconciliation, belongs to the control
plane."""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from datalayer_core.orchestration import (
    ACKNOWLEDGEMENT_ORDER,
    COMMAND_MODELS,
    MUTATING_COMMANDS,
    Acknowledgement,
    AcknowledgementKind,
    AgentsDiscover,
    Attempt,
    CommandName,
    ExecutionEvent,
    ExecutionsCancel,
    ExecutionsDelegate,
    MutatingCommand,
    ReadCommand,
    WorkerOperation,
    is_mutating,
    parse_command,
)
from datalayer_core.tests.test_orchestration_model import fixture

CANCEL = {
    "command": "executions.cancel",
    "executionId": "exec_8d21c4",
    "reason": "The user stopped the run.",
}


def test_the_twelve_commands_of_section_6_2_are_the_twelve() -> None:
    assert [name.value for name in COMMAND_MODELS] == [
        "agents.discover",
        "agents.create",
        "agents.attach",
        "executions.delegate",
        "executions.steer",
        "executions.pause",
        "executions.resume",
        "executions.cancel",
        "executions.checkpoint",
        "executions.collect",
        "executions.terminate",
        "executions.subscribe",
    ]
    assert set(COMMAND_MODELS) == set(CommandName)


def test_a_mutating_command_without_an_idempotency_key_is_refused() -> None:
    with pytest.raises(ValidationError, match="idempotencyKey"):
        parse_command(CANCEL)
    with pytest.raises(ValidationError, match="idempotencyKey"):
        parse_command({**CANCEL, "idempotencyKey": ""})
    assert parse_command({**CANCEL, "idempotencyKey": "k-1"}).idempotency_key == "k-1"


def test_every_command_that_changes_something_requires_a_key() -> None:
    assert {name.value for name in MUTATING_COMMANDS} == {
        "agents.create",
        "agents.attach",
        "executions.delegate",
        "executions.steer",
        "executions.pause",
        "executions.resume",
        "executions.cancel",
        "executions.checkpoint",
        "executions.terminate",
    }
    for name, model in COMMAND_MODELS.items():
        assert issubclass(model, MutatingCommand) == is_mutating(name)
        assert ("idempotency_key" in model.model_fields) == is_mutating(name)
        assert issubclass(model, (MutatingCommand, ReadCommand))


def test_a_reading_command_takes_no_key_at_all() -> None:
    # Repeating a query costs a query. Offering a key would suggest it
    # bought something, so the model refuses one.
    assert AgentsDiscover(capabilities=["notebook.validate"]).limit == 20
    with pytest.raises(ValidationError, match="idempotencyKey"):
        AgentsDiscover.from_wire({"idempotencyKey": "k-1"})


def test_a_command_is_read_as_whichever_of_the_twelve_it_says_it_is() -> None:
    delegate = parse_command(fixture()["ExecutionsDelegate"])
    assert isinstance(delegate, ExecutionsDelegate)
    assert delegate.command is CommandName.EXECUTIONS_DELEGATE
    assert isinstance(
        parse_command({**CANCEL, "idempotencyKey": "k"}), ExecutionsCancel
    )
    with pytest.raises(ValueError, match="must name itself"):
        parse_command({"executionId": "exec_8d21c4"})
    with pytest.raises(ValueError, match="not one of the twelve"):
        parse_command({"command": "executions.explode"})


def test_a_worker_declares_operations_the_commands_actually_offer() -> None:
    named = {name.value for name in CommandName}
    for operation in WorkerOperation:
        assert f"executions.{operation.value}" in named


def test_the_five_acknowledgements_are_ordered_and_are_not_the_transport() -> None:
    # 6.3: a transport-level response is `received`. Only a worker taking
    # responsibility is `accepted`, and the gap between them is where a task
    # is lost.
    assert [kind.value for kind in ACKNOWLEDGEMENT_ORDER] == [
        "received",
        "accepted",
        "started",
        "checkpointed",
        "completed",
    ]
    assert set(ACKNOWLEDGEMENT_ORDER) == set(AcknowledgementKind)
    accepted = Acknowledgement.from_wire(fixture()["Acknowledgement"])
    assert ACKNOWLEDGEMENT_ORDER.index(accepted.kind) > ACKNOWLEDGEMENT_ORDER.index(
        AcknowledgementKind.RECEIVED
    )


def test_an_acknowledgement_names_the_command_and_the_attempt_it_answers() -> None:
    accepted = Acknowledgement.from_wire(fixture()["Acknowledgement"])
    assert accepted.command is CommandName.EXECUTIONS_DELEGATE
    assert accepted.idempotency_key == fixture()["ExecutionsDelegate"]["idempotencyKey"]
    assert accepted.attempt_id == fixture()["Attempt"]["attemptId"]


def test_an_event_that_cannot_be_placed_in_a_tree_is_refused() -> None:
    record = fixture()["ExecutionEvent"]
    assert ExecutionEvent.from_wire(record).sequence == 7
    for identifier in ("eventId", "executionId", "rootExecutionId", "sequence"):
        without = {key: value for key, value in record.items() if key != identifier}
        with pytest.raises(ValidationError, match=identifier):
            ExecutionEvent.from_wire(without)


def test_an_event_carries_the_correlation_a_tree_is_assembled_from() -> None:
    event = ExecutionEvent.from_wire(fixture()["ExecutionEvent"])
    execution = fixture()["Execution"]
    assert event.root_execution_id == execution["rootExecutionId"]
    assert event.parent_execution_id == execution["parentExecutionId"]
    assert event.attempt_id == execution["currentAttemptId"]
    assert event.protocol == execution["agent"]["protocol"]
    assert event.session_id == execution["agent"]["sessionId"]
    assert event.traceparent == execution["trace"]["traceparent"]


def test_each_attempt_is_named_and_the_execution_points_at_the_current_one() -> None:
    # 6.4: each worker attempt has a distinct identifier, which is what makes
    # a retry distinguishable from a duplicate delivery.
    attempt = Attempt.from_wire(fixture()["Attempt"])
    execution = fixture()["Execution"]
    assert attempt.attempt_id == execution["currentAttemptId"]
    assert attempt.number == execution["attemptCount"] == 2
    assert attempt.execution_id == execution["executionId"]
    with pytest.raises(ValidationError, match="attemptId"):
        Attempt.from_wire(
            {
                key: value
                for key, value in fixture()["Attempt"].items()
                if key != "attemptId"
            }
        )
