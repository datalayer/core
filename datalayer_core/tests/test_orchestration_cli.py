# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""The ``datalayer agents`` and ``datalayer executions`` commands (ORCHESTRATOR.md, O1-13).

Against a client that answers what the control plane would: which worker a
run is delegated to and with what, the key a command carries when none is
named, what is refused before anything is asked, and the event stream in the
words the app's execution page uses.
"""

from __future__ import annotations

import json
import re
from typing import Any, Iterator

import pytest
from typer.testing import CliRunner

import datalayer_core.cli.commands.orchestration_common as common
from datalayer_core.cli.__main__ import app
from datalayer_core.mixins.orchestration import Collection, Receipt
from datalayer_core.orchestration import (
    Acknowledgement,
    AcknowledgementKind,
    AgentBinding,
    AgentDescriptor,
    AgentProtocol,
    Artifact,
    ArtifactStatus,
    ArtifactType,
    CommandName,
    ErrorCode,
    Execution,
    ExecutionEvent,
    ExecutionEventType,
    ExecutionState,
    Objective,
    OrchestrationError,
    ProtocolEndpoint,
)

NOW = "2026-09-10T10:00:00+00:00"

#: What the commands asked of the client, across the invocations of one test.
RECORDED: dict[str, Any] = {}
#: What the client answers, when a test says.
ANSWERS: dict[str, Any] = {}

VALIDATOR = AgentDescriptor(
    agent_id="validator",
    name="Notebook validator",
    capabilities=["notebook.validate"],
    endpoints=[
        ProtocolEndpoint(protocol=AgentProtocol.A2A, url="https://agents.example/a2a"),
        ProtocolEndpoint(protocol=AgentProtocol.ACP, url="wss://agents.example/acp"),
    ],
)


def an_execution(status: ExecutionState = ExecutionState.RUNNING) -> Execution:
    return Execution(
        execution_id="exec_1",
        root_execution_id="exec_1",
        agent=AgentBinding(agent_id="validator", capability="notebook.validate", protocol=AgentProtocol.A2A),
        objective=Objective(goal="Validate the notebook"),
        status=status,
        created_at=NOW,
        updated_at=NOW,
    )


def a_receipt(command: CommandName, **fields: Any) -> Receipt:
    acknowledgement = Acknowledgement(
        kind=AcknowledgementKind.RECEIVED, execution_id="exec_1", command=command, acknowledged_at=NOW
    )
    return Receipt(execution=fields.pop("execution", an_execution()), acknowledgement=acknowledgement, **fields)


class Client:
    def discover_agents(self, command: Any, *, account_uid: str | None = None) -> list[AgentDescriptor]:
        RECORDED.setdefault("discovered", []).append((command, account_uid))
        return ANSWERS.get("agents", [VALIDATOR])

    def delegate_execution(self, command: Any, *, account_uid: str | None = None) -> Receipt:
        RECORDED.setdefault("delegated", []).append((command, account_uid))
        return a_receipt(CommandName.EXECUTIONS_DELEGATE, delivered=True)

    def steer_execution(self, command: Any, *, account_uid: str | None = None) -> Receipt:
        RECORDED["steered"] = command
        return a_receipt(CommandName.EXECUTIONS_STEER, delivered=True)

    def cancel_execution(self, command: Any, *, account_uid: str | None = None) -> Receipt:
        RECORDED["cancelled"] = command
        return a_receipt(
            CommandName.EXECUTIONS_CANCEL,
            execution=an_execution(ExecutionState.CANCELLED),
            delivered=True,
            cancelled_execution_ids=["exec_1", "exec_2"],
        )

    def collect_execution(self, command: Any, *, account_uid: str | None = None) -> Collection:
        RECORDED["collected"] = command
        artifact = Artifact(
            artifact_id="art_profile",
            type=ArtifactType.REPORT,
            name="profile-report",
            status=ArtifactStatus.COMMITTED,
            committed_by="att_1_1",
        )
        return Collection(execution=an_execution(), artifacts=[artifact], children=[])

    def subscribe_execution(self, execution_id: str, **kwargs: Any) -> Iterator[tuple[ExecutionEvent, str]]:
        RECORDED["subscribed"] = (execution_id, kwargs)
        yield from ANSWERS.get("events", [])


@pytest.fixture(autouse=True)
def client(monkeypatch: pytest.MonkeyPatch) -> None:
    RECORDED.clear()
    ANSWERS.clear()
    monkeypatch.setattr(common, "DatalayerClient", Client)


def invoke(*arguments: str) -> Any:
    return CliRunner().invoke(app, list(arguments))


def plain(text: str) -> str:
    return re.sub(r"\x1b\[[0-9;]*m", "", text)


def an_event(execution_id: str, **fields: Any) -> ExecutionEvent:
    return ExecutionEvent(
        event_id=f"evt_{execution_id}",
        type=fields.pop("type", ExecutionEventType.PROGRESS),
        sequence=1,
        emitted_at=NOW,
        root_execution_id="exec_1",
        execution_id=execution_id,
        **fields,
    )


class TestDiscover:
    def test_it_lists_the_workers_found_under_the_constraints_given(self) -> None:
        result = invoke(
            "agents", "discover", "--capability", "notebook.validate", "--protocol", "acp", "--account", "org-1"
        )
        assert result.exit_code == 0, result.output
        assert "validator" in plain(result.stdout)
        [(command, account)] = RECORDED["discovered"]
        assert (command.capabilities, command.protocols, account) == (
            ["notebook.validate"],
            [AgentProtocol.ACP],
            "org-1",
        )

    def test_it_emits_the_descriptors_as_json(self) -> None:
        result = invoke("agents", "discover", "-o", "json")
        assert json.loads(plain(result.stdout))[0]["agentId"] == "validator"


class TestRun:
    def test_it_delegates_to_the_discovered_worker_with_its_context(self) -> None:
        result = invoke(
            "executions", "run",
            "--agent", "validator",
            "--goal", "Validate the notebook",
            "--protocol", "acp",
            "--context", "notebook:nb-1@3",
            "--context", "datalayer:notebook/nb-2@1",
            "--criterion", "No failing cell",
        )
        assert result.exit_code == 0, result.output
        [(command, _)] = RECORDED["delegated"]
        assert (command.agent.agent_id, command.agent.protocol, command.agent.endpoint) == (
            "validator",
            AgentProtocol.ACP,
            "wss://agents.example/acp",
        )
        assert [reference.uri for reference in command.context.references] == [
            "datalayer:notebook/nb-1@3",
            "datalayer:notebook/nb-2@1",
        ]
        assert command.objective.acceptance_criteria == ["No failing cell"]
        assert command.idempotency_key.startswith("cmd-")
        assert "Delegated" in plain(result.stdout)

    def test_the_same_command_twice_is_one_key_and_a_named_key_is_kept(self) -> None:
        arguments = ("executions", "run", "--agent", "validator", "--goal", "Validate the notebook")
        invoke(*arguments)
        invoke(*arguments)
        invoke(*arguments, "--idempotency-key", "mine")
        keys = [command.idempotency_key for command, _ in RECORDED["delegated"]]
        assert keys[0] == keys[1] and keys[2] == "mine"

    def test_a_worker_nobody_discovered_is_refused_and_nothing_is_delegated(self) -> None:
        result = invoke("executions", "run", "--agent", "someone-else", "--goal", "Validate")
        assert result.exit_code == 1
        assert "datalayer agents discover" in plain(result.output)
        assert "delegated" not in RECORDED

    def test_a_context_that_is_not_a_reference_is_refused_before_anything_is_asked(self) -> None:
        result = invoke("executions", "run", "--agent", "validator", "--goal", "Validate", "--context", "the notebook")
        assert result.exit_code == 1
        assert "not a context reference" in plain(result.output)
        assert "discovered" not in RECORDED


class TestSteerCancelAndArtifacts:
    def test_steer_and_cancel_carry_what_they_ask_under_a_derived_key(self) -> None:
        assert invoke("executions", "steer", "exec_1", "Check the statistical assumptions").exit_code == 0
        steered = RECORDED["steered"]
        assert steered.instructions == "Check the statistical assumptions"
        assert steered.idempotency_key.startswith("cmd-")
        result = invoke("executions", "cancel", "exec_1", "--reason", "The question changed", "--no-cascade")
        cancelled = RECORDED["cancelled"]
        assert (cancelled.execution_id, cancelled.reason, cancelled.cascade) == ("exec_1", "The question changed", False)
        assert "Cancelled 2 executions: exec_1, exec_2." in plain(result.stdout)

    def test_artifacts_lists_what_was_registered_with_its_children_by_default(self) -> None:
        table = invoke("executions", "artifacts", "exec_1")
        assert table.exit_code == 0, table.output
        assert "Artifact" in plain(table.stdout)
        assert RECORDED["collected"].include_children is True
        # The table fits the terminal; what was registered is read from the JSON.
        emitted = json.loads(plain(invoke("executions", "artifacts", "exec_1", "-o", "json").stdout))
        assert [(one["name"], one["status"], one["committedBy"]) for one in emitted["artifacts"]] == [
            ("profile-report", "committed", "att_1_1")
        ]


class TestWatch:
    def test_it_prints_each_event_in_the_page_s_words_and_says_when_it_is_over(self) -> None:
        ANSWERS["events"] = [
            (an_event("exec_1", message="Re-attached to task-1."), "exec_1:1"),
            (
                an_event(
                    "exec_2",
                    type=ExecutionEventType.ERROR,
                    error=OrchestrationError(code=ErrorCode.APPROVAL_TIMED_OUT, message="Nobody approved it in time."),
                ),
                "exec_1:1,exec_2:1",
            ),
        ]
        result = invoke("executions", "watch", "exec_1")
        assert result.exit_code == 0, result.output
        text = plain(result.stdout)
        assert f"{NOW}  Re-attached to task-1." in text
        assert f"{NOW}  [exec_2] approval_timed_out: Nobody approved it in time." in text
        assert "Over: every execution exec_1 covers has ended." in text
        assert RECORDED["subscribed"] == (
            "exec_1",
            {"include_children": True, "from_sequence": None, "last_event_id": None, "account_uid": None},
        )

    def test_as_json_it_is_one_line_per_event_with_its_cursor(self) -> None:
        ANSWERS["events"] = [(an_event("exec_1", message="Started."), "exec_1:1")]
        result = invoke("executions", "watch", "exec_1", "-o", "json", "--last-event-id", "exec_1:0")
        assert result.exit_code == 0, result.output
        [line] = [one for one in result.stdout.splitlines() if one.strip()]
        assert json.loads(line)["cursor"] == "exec_1:1"
        assert RECORDED["subscribed"][1]["last_event_id"] == "exec_1:0"
