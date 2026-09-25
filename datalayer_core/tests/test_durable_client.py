# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

# Copyright (c) 2023-2026 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""`DurableMixin` reaches `/api/durable` only, as itself — a platform
administrator's own Bearer token, never a service's X-API-Key
(ORCHESTRATOR.md's note on `durable/datalayer_durable/auth.py`, 2026-09-13).
"""

from __future__ import annotations

from typing import Any

import pytest

from datalayer_core.mixins.durable import DurableMixin, WorkflowRun
from datalayer_core.utils.urls import DatalayerURLs


class Answer:
    def __init__(self, value: Any) -> None:
        self._value = value

    def json(self) -> Any:
        return self._value


class Client(DurableMixin):
    def __init__(self, *answers: Any) -> None:
        self.urls = DatalayerURLs.from_environment(durable_url="https://durable.test")
        self.calls: list[tuple[str, dict[str, Any]]] = []
        self.answers = list(answers)

    def _fetch(self, url: str, **kwargs: Any) -> Any:
        self.calls.append((url, kwargs))
        answer = self.answers.pop(0)
        if isinstance(answer, Exception):
            raise answer
        return answer


class TestTheUrl:
    def test_every_call_goes_under_api_durable(self) -> None:
        client = Client(Answer({"uid": "wf_1", "workflow": "W", "status": "running"}))
        client.describe_durable_workflow("wf_1")
        url, _ = client.calls[0]
        assert url == "https://durable.test/api/durable/v1/workflows/wf_1"


class TestDescribe:
    def test_a_run_is_parsed_into_a_workflow_run(self) -> None:
        client = Client(
            Answer(
                {
                    "uid": "wf_1",
                    "workflow": "NotebookRunWorkflow",
                    "status": "running",
                    "task_uid": "tsk_1",
                    "queue": "q",
                }
            )
        )
        run = client.describe_durable_workflow("wf_1")
        assert run == WorkflowRun(
            uid="wf_1",
            workflow="NotebookRunWorkflow",
            status="running",
            task_uid="tsk_1",
            queue="q",
        )

    def test_a_404_is_none_not_an_exception(self) -> None:
        client = Client(
            RuntimeError("Failed to request the URL x (status=404, body=not found)")
        )
        assert client.describe_durable_workflow("no-such-uid") is None

    def test_another_failure_still_raises(self) -> None:
        client = Client(
            RuntimeError("Failed to request the URL x (status=500, body=boom)")
        )
        with pytest.raises(RuntimeError, match="status=500"):
            client.describe_durable_workflow("wf_1")


class TestDescribeExecution:
    def test_the_account_travels_as_a_query_param(self) -> None:
        client = Client(
            Answer(
                {
                    "uid": "exec_1",
                    "workflow": "OrchestrationWorkflow",
                    "status": "running",
                }
            )
        )
        client.describe_durable_execution("exec_1", account_uid="org-1")
        url, kwargs = client.calls[0]
        assert url == "https://durable.test/api/durable/v1/executions/exec_1/run"
        assert kwargs["params"] == {"account_uid": "org-1"}

    def test_no_run_for_the_execution_is_none(self) -> None:
        client = Client(
            RuntimeError("Failed to request the URL x (status=404, body=none)")
        )
        assert (
            client.describe_durable_execution("exec_missing", account_uid="org-1")
            is None
        )


class TestStartSignalCancel:
    def test_start_sends_the_workflow_task_uid_queue_and_arguments(self) -> None:
        client = Client(Answer({"uid": "tsk_1", "workflow": "W", "status": "running"}))
        run = client.start_durable_workflow(
            "W", task_uid="tsk_1", queue="q", arguments={"a": 1}
        )
        assert run.uid == "tsk_1"
        _, kwargs = client.calls[0]
        assert kwargs["method"] == "POST"
        assert kwargs["json"] == {
            "workflow": "W",
            "task_uid": "tsk_1",
            "queue": "q",
            "arguments": {"a": 1},
        }

    def test_signal_delivered_is_true(self) -> None:
        client = Client(Answer({"ok": True}))
        assert (
            client.signal_durable_workflow("wf_1", "approved", {"decision": True})
            is True
        )

    def test_signalling_an_ended_run_is_false_not_an_error(self) -> None:
        client = Client(
            RuntimeError("Failed to request the URL x (status=409, body=already ended)")
        )
        assert client.signal_durable_workflow("wf_1", "approved", {}) is False

    def test_cancel_stopped_is_true(self) -> None:
        client = Client(Answer({"ok": True}))
        assert client.cancel_durable_workflow("wf_1", reason="asked") is True

    def test_cancelling_an_ended_run_is_false_not_an_error(self) -> None:
        client = Client(
            RuntimeError("Failed to request the URL x (status=409, body=already ended)")
        )
        assert client.cancel_durable_workflow("wf_1") is False


class TestListOpen:
    def test_only_open_runs_are_kept(self) -> None:
        client = Client(
            Answer(
                {
                    "items": [
                        {"uid": "wf_1", "workflow": "W", "status": "running"},
                        {"uid": "wf_2", "workflow": "W", "status": "completed"},
                    ]
                }
            )
        )
        runs = client.list_open_durable_workflows()
        assert [run.uid for run in runs] == ["wf_1"]


class TestOperations:
    def test_answers_what_the_service_reports(self) -> None:
        client = Client(Answer({"engine": "dbos", "durable": True}))
        assert client.durable_operations() == {"engine": "dbos", "durable": True}

    def test_unreachable_answers_durable_false_rather_than_raising(self) -> None:
        client = Client(
            RuntimeError("Failed to request the URL x (status=None, body=timeout)")
        )
        answer = client.durable_operations()
        assert answer["durable"] is False and "detail" in answer
