# Copyright (c) 2023-2026 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""The ``datalayer durable`` commands (2026-09-13): a platform administrator
troubleshooting durable directly, over the same client seam
``datalayer executions``' own CLI tests use.
"""

from __future__ import annotations

from typing import Any

import pytest
from typer.testing import CliRunner

import datalayer_core.cli.commands.orchestration_common as common
from datalayer_core.cli.__main__ import app
from datalayer_core.mixins.durable import WorkflowRun

RECORDED: dict[str, Any] = {}
ANSWERS: dict[str, Any] = {}


def a_run(**fields: Any) -> WorkflowRun:
    base = {"uid": "wf_1", "workflow": "NotebookRunWorkflow", "status": "running"}
    base.update(fields)
    return WorkflowRun(**base)


class Client:
    def list_open_durable_workflows(self, *, task_uid: str = "", limit: int = 50) -> list[WorkflowRun]:
        RECORDED["listed"] = (task_uid, limit)
        return ANSWERS.get("runs", [a_run()])

    def describe_durable_workflow(self, uid: str) -> WorkflowRun | None:
        RECORDED["described"] = uid
        return ANSWERS.get("run", a_run(uid=uid))

    def describe_durable_execution(self, execution_id: str, *, account_uid: str) -> WorkflowRun | None:
        RECORDED["described_execution"] = (execution_id, account_uid)
        return ANSWERS.get("run", a_run(uid=execution_id))

    def start_durable_workflow(
        self, workflow: str, *, task_uid: str, queue: str = "", arguments: dict[str, Any] | None = None
    ) -> WorkflowRun:
        RECORDED["started"] = (workflow, task_uid, queue, arguments)
        return a_run(uid=task_uid, workflow=workflow)

    def signal_durable_workflow(self, uid: str, name: str, payload: dict[str, Any]) -> bool:
        RECORDED["signalled"] = (uid, name, payload)
        return ANSWERS.get("delivered", True)

    def cancel_durable_workflow(self, uid: str, *, reason: str = "") -> bool:
        RECORDED["cancelled"] = (uid, reason)
        return ANSWERS.get("cancelled", True)

    def durable_operations(self) -> dict[str, Any]:
        RECORDED["operations"] = True
        return ANSWERS.get("operations", {"engine": "dbos", "durable": True})


@pytest.fixture(autouse=True)
def client(monkeypatch: pytest.MonkeyPatch) -> None:
    RECORDED.clear()
    ANSWERS.clear()
    monkeypatch.setattr(common, "DatalayerClient", Client)


def invoke(*arguments: str) -> Any:
    return CliRunner().invoke(app, list(arguments))


class TestList:
    def test_lists_the_open_runs(self) -> None:
        result = invoke("durable", "list")
        assert result.exit_code == 0
        assert "wf_1" in result.stdout

    def test_nothing_open_says_so(self) -> None:
        ANSWERS["runs"] = []
        result = invoke("durable", "list")
        assert result.exit_code == 0
        assert "Nothing open." in result.stdout


class TestDescribe:
    def test_describes_a_run_by_its_uid(self) -> None:
        result = invoke("durable", "describe", "wf_1")
        assert result.exit_code == 0
        assert RECORDED["described"] == "wf_1"
        assert "wf_1" in result.stdout

    def test_no_run_is_a_clean_refusal_not_a_traceback(self) -> None:
        ANSWERS["run"] = None
        result = invoke("durable", "describe", "no-such")
        assert result.exit_code == 1
        assert "No run" in result.stdout


class TestDescribeExecution:
    def test_the_account_is_required_and_sent(self) -> None:
        result = invoke("durable", "describe-execution", "exec_1", "--account", "org-1")
        assert result.exit_code == 0
        assert RECORDED["described_execution"] == ("exec_1", "org-1")

    def test_without_account_it_refuses_before_calling_anything(self) -> None:
        result = invoke("durable", "describe-execution", "exec_1")
        assert result.exit_code != 0
        assert "described_execution" not in RECORDED


class TestStart:
    def test_starts_with_the_given_task_uid_and_arguments(self) -> None:
        result = invoke(
            "durable", "start", "NotebookRunWorkflow", "--task-uid", "tsk_1", "--arguments", '{"a": 1}'
        )
        assert result.exit_code == 0
        assert RECORDED["started"] == ("NotebookRunWorkflow", "tsk_1", "", {"a": 1})


class TestSignalAndCancel:
    def test_signal_says_delivered(self) -> None:
        result = invoke("durable", "signal", "wf_1", "approved", "--payload", '{"ok": true}')
        assert result.exit_code == 0
        assert RECORDED["signalled"] == ("wf_1", "approved", {"ok": True})
        assert "Delivered." in result.stdout

    def test_signal_on_an_ended_run_says_so_not_an_error(self) -> None:
        ANSWERS["delivered"] = False
        result = invoke("durable", "signal", "wf_1", "approved")
        assert result.exit_code == 0
        assert "Nothing was waiting" in result.stdout

    def test_cancel_says_cancelled(self) -> None:
        result = invoke("durable", "cancel", "wf_1", "--reason", "asked")
        assert result.exit_code == 0
        assert RECORDED["cancelled"] == ("wf_1", "asked")
        assert "Cancelled." in result.stdout

    def test_cancel_on_an_ended_run_says_so_not_an_error(self) -> None:
        ANSWERS["cancelled"] = False
        result = invoke("durable", "cancel", "wf_1")
        assert result.exit_code == 0
        assert "Nothing was left running" in result.stdout


class TestOperations:
    def test_reports_the_engine(self) -> None:
        result = invoke("durable", "operations")
        assert result.exit_code == 0
        assert "dbos" in result.stdout
