# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

# Copyright (c) 2023-2026 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""The ``datalayer mcp`` commands, against a client that answers what the gateway would."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pytest
from typer.testing import CliRunner

import datalayer_core.cli.commands.mcp as mcp_commands
from datalayer_core.cli.__main__ import app
from datalayer_core.models.mcp import (
    ConnectedAgent,
    McpAlert,
    McpAlertList,
    McpForwarding,
    McpActivity,
    McpAuditEventList,
    McpBinding,
    McpBindingList,
    McpEffectivePolicy,
    McpJobSchedule,
    McpTask,
    McpTaskList,
)

AGENT = "https://claude.ai/.well-known/mcp-client.json"


def task(status: str = "working") -> McpTask:
    return McpTask(uid="01T", status=status, tool="execute_cell", notebook_uid="01NB", initiating_client=AGENT, trace_id="abc")


#: What the commands asked of the client. Every command builds a client of
#: its own, so what one invocation recorded is read here, not on an instance.
RECORDED: dict[str, Any] = {}


class Client:
    def __init__(self) -> None:
        RECORDED.clear()

    def list_connected_agents(self) -> list[ConnectedAgent]:
        return [ConnectedAgent(uid="01G", client_id=AGENT, client_name="Claude Code", scopes=["notebooks:read"], created_at="2026-08-27T09:00:00Z")]

    def disconnect_agent(self, grant_uid: str) -> dict[str, Any]:
        RECORDED["disconnected"] = grant_uid
        return {"success": True, "message": "The agent has been disconnected."}

    def get_mcp_activity(self, **kwargs: Any) -> McpActivity:
        return McpActivity.model_validate({"at": "t", "clients": [{"client_id": AGENT, "client_name": "Claude Code", "grant_uid": "01G"}], "sandboxes": [], "tasks": [task().model_dump()], "calls": [], "today": {"calls": 3, "refusals": 1, "tasks": 1, "credits": 0.5}})

    def list_mcp_tasks(self, **kwargs: Any) -> McpTaskList:
        RECORDED["task_filters"] = kwargs
        return McpTaskList(items=[task()], next_cursor="n1")

    def get_mcp_task(self, task_uid: str) -> McpTask:
        return task()

    def cancel_mcp_task(self, task_uid: str) -> McpTask:
        RECORDED["cancelled"] = task_uid
        return task("cancelled")

    def answer_mcp_task(self, task_uid: str, input: Any, *, idempotency_key: str) -> McpTask:
        RECORDED.setdefault("answers", []).append(
            {"task": task_uid, "input": dict(input), "key": idempotency_key}
        )
        return task("working")

    def list_mcp_bindings(self, **kwargs: Any) -> McpBindingList:
        return McpBindingList(items=[McpBinding(uid="sb_1", kind="sandbox", sandbox_uid="01R", sandbox_provider="datalayer", state="active", client_id=AGENT)])

    def terminate_mcp_binding(self, binding_uid: str) -> McpBinding:
        return McpBinding(uid=binding_uid, kind="sandbox", state="closed")

    def get_mcp_effective_policy(self, **kwargs: Any) -> McpEffectivePolicy:
        return McpEffectivePolicy.model_validate({"scope": "organization", "scopes": ["notebooks:read"], "rules": [{"name": "tool_denylist", "value": ["delete_cell"], "decided_by": "organization"}], "tools": [{"tool": "delete_cell", "scope": "notebooks:write", "allowed": False, "decided_by": "organization"}]})

    def list_mcp_alerts(self, **kwargs: Any) -> McpAlertList:
        RECORDED["alert_filters"] = kwargs
        return McpAlertList.model_validate({
            "items": [
                {"uid": "alr_1", "rule_uid": "spend-cap", "org_uid": "01ORG",
                 "scope_uid": "01TEAM", "severity": "critical", "value": 120.0,
                 "at": "2026-08-29T10:00:00Z", "acknowledged": False},
                {"uid": "alr_2", "rule_uid": "task-failures", "org_uid": "01ORG",
                 "severity": "warning", "value": 9.0, "at": "2026-08-29T09:00:00Z",
                 "acknowledged": True, "acknowledged_by": "01USER",
                 "acknowledged_at": "2026-08-29T09:05:00Z"},
            ]
        })

    def acknowledge_mcp_alert(self, alert_uid: str) -> McpAlert:
        RECORDED["acknowledged"] = alert_uid
        return McpAlert.model_validate(
            {"uid": alert_uid, "acknowledged": True, "acknowledged_by": "01USER"}
        )

    def get_mcp_audit_forwarding(self, **kwargs: Any) -> McpForwarding:
        RECORDED["forwarding_filters"] = kwargs
        return McpForwarding.model_validate({
            "configured": True,
            "state": {"org_uid": "01ORG", "delivered": 42, "failed": 7,
                      "last_error": "refused with 401", "healthy": False},
        })

    def get_mcp_job_schedule(self) -> McpJobSchedule:
        return McpJobSchedule.model_validate({
            "running": True,
            "holder": "gateway-1",
            "jobs": [
                {"job": "audit-retention", "ran": 4, "skipped": 19, "failed": 7,
                 "last_ran_at": 1800000000, "last_error": "", "last_duration_seconds": 2.4,
                 "healthy": True},
                {"job": "alerts", "ran": 0, "skipped": 0, "failed": 2,
                 "last_error": "RuntimeError: solr is down", "healthy": False},
            ],
        })

    def list_mcp_audit_events(self, **kwargs: Any) -> McpAuditEventList:
        RECORDED["audit_filters"] = kwargs
        return McpAuditEventList.model_validate({"items": [{"uid": "01A", "at": "2026-08-27T10:00:00Z", "user_uid": "01U", "client_id": AGENT, "method": "tools/call", "tool": "execute_cell", "decision": "refused", "refusal_reason": "organization: tool_denylist", "task_id": "01T"}], "next_cursor": "n2"})

    def export_mcp_audit_events(self, **kwargs: Any) -> str:
        RECORDED["exported"] = kwargs
        return "uid,at,decision\n01A,2026-08-27T10:00:00Z,refused\n" if kwargs.get("format") == "csv" else '{"uid": "01A"}\n'

    def get_mcp_run_trace(self, task_uid: str) -> dict[str, Any]:
        return {"task_uid": task_uid, "trace_id": "abc", "spans": [{"span_id": "root", "span_name": "mcp.request", "service_name": "gateway", "duration_ms": 12.5, "start_time": "t"}, {"span_id": "c", "parent_span_id": "root", "span_name": "mcp.policy", "service_name": "gateway", "duration_ms": 1, "start_time": "t"}]}

    def get_mcp_run_logs(self, task_uid: str, **kwargs: Any) -> dict[str, Any]:
        return {"task_uid": task_uid, "trace_id": "abc", "records": [{"timestamp": "t", "severity_text": "INFO", "service_name": "worker", "body": "ran cell c1"}]}

    def get_mcp_metrics(self, **kwargs: Any) -> dict[str, Any]:
        RECORDED["metrics_filters"] = kwargs
        return {"filters": kwargs, "metrics": {"mcp.calls": [{}]}, "spans": [], "slis": {"availability": 0.99, "p95_call_duration_ms": 120, "task_success_rate": None, "p95_sandbox_launch_seconds": {"datalayer": 4.2}, "samples": {"calls": 100, "tasks": 0, "launches": 3}}}


@pytest.fixture(autouse=True)
def fake_client(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(mcp_commands, "DatalayerClient", Client)
    # Rich folds a table to the terminal's width; the runner's is eighty
    # columns, which would truncate the very cells the assertions read.
    monkeypatch.setenv("COLUMNS", "250")


def test_agents_list_and_revoke() -> None:
    runner = CliRunner()
    listed = runner.invoke(app, ["mcp", "agents", "list"])
    as_json = runner.invoke(app, ["mcp", "--output", "json", "agents", "list"])
    revoked = runner.invoke(app, ["mcp", "agents", "revoke", "01G", "--yes"])

    assert listed.exit_code == 0, listed.output
    assert "Claude Code" in listed.output and "notebooks:read" in listed.output
    assert json.loads(as_json.output)[0]["uid"] == "01G"
    assert revoked.exit_code == 0
    assert "disconnected" in revoked.output
    assert RECORDED["disconnected"] == "01G"


def test_audit_pages_with_filters_and_exports_to_a_file(tmp_path: Path) -> None:
    runner = CliRunner()
    paged = runner.invoke(app, ["mcp", "audit", "--org", "01ORG", "--decision", "refused", "--task", "01T"])
    assert paged.exit_code == 0, paged.output
    assert "tool_denylist" in paged.output and "Next cursor: n2" in paged.output
    assert RECORDED["audit_filters"]["org"] == "01ORG"
    assert RECORDED["audit_filters"]["task_id"] == "01T"

    as_json = runner.invoke(app, ["mcp", "-o", "json", "audit"])
    assert json.loads(as_json.output)["items"][0]["uid"] == "01A"

    exported = runner.invoke(app, ["mcp", "audit", "--export", "csv", "--file", str(tmp_path / "audit.csv"), "--org", "01ORG"])
    assert exported.exit_code == 0
    assert (tmp_path / "audit.csv").read_text().startswith("uid,at,decision")
    assert RECORDED["exported"]["format"] == "csv" and RECORDED["exported"]["org"] == "01ORG"

    streamed = runner.invoke(app, ["mcp", "audit", "--export", "jsonl"])
    assert streamed.output.startswith('{"uid": "01A"}')
    refused = runner.invoke(app, ["mcp", "audit", "--export", "xml"])
    assert refused.exit_code == 1


def test_trace_metrics_and_logs_are_thin_over_otel() -> None:
    runner = CliRunner()
    traced = runner.invoke(app, ["mcp", "trace", "01T"])
    assert traced.exit_code == 0, traced.output
    assert "mcp.request" in traced.output and "└ mcp.policy" in traced.output

    metrics = runner.invoke(app, ["mcp", "metrics", "--agent", AGENT, "--since", "2026-08-27T00:00:00Z"])
    assert metrics.exit_code == 0, metrics.output
    assert "99.0%" in metrics.output and "120 ms" in metrics.output and "datalayer" in metrics.output
    assert RECORDED["metrics_filters"] == {"agent": AGENT, "org": None, "since": "2026-08-27T00:00:00Z"}

    logs = runner.invoke(app, ["mcp", "logs", "01T", "--limit", "5"])
    assert logs.exit_code == 0 and "ran cell c1" in logs.output
    as_json = runner.invoke(app, ["mcp", "-o", "json", "trace", "01T"])
    assert json.loads(as_json.output)["trace_id"] == "abc"


def test_activity_tasks_bindings_and_policy() -> None:
    runner = CliRunner()
    activity = runner.invoke(app, ["mcp", "activity"])
    assert activity.exit_code == 0, activity.output
    assert "Connected clients" in activity.output and "Running tasks" in activity.output

    tasks = runner.invoke(app, ["mcp", "tasks", "list", "--status", "working"])
    assert tasks.exit_code == 0 and "execute_cell" in tasks.output and "Next cursor: n1" in tasks.output
    assert RECORDED["task_filters"]["status"] == "working"

    cancelled = runner.invoke(app, ["mcp", "tasks", "cancel", "01T"])
    assert cancelled.exit_code == 0 and "01T: cancelled" in cancelled.output
    assert RECORDED["cancelled"] == "01T"
    bindings = runner.invoke(app, ["mcp", "bindings", "list"])
    assert bindings.exit_code == 0 and "sb_1" in bindings.output and "datalayer" in bindings.output
    policy = runner.invoke(app, ["mcp", "policy"])
    assert policy.exit_code == 0 and "tool_denylist" in policy.output and "organization" in policy.output


def _answer(runner: CliRunner, *arguments: str) -> dict:
    """Run one `tasks input` and return what the client was asked to send.

    Read per invocation: every command builds a client of its own and each one
    clears `RECORDED`, so keys cannot be accumulated across runs.
    """
    result = runner.invoke(app, ["mcp", "tasks", "input", *arguments])
    assert result.exit_code == 0, result.output
    return RECORDED["answers"][-1]


def test_answering_a_task_twice_with_the_same_input_is_one_answer() -> None:
    """A POST that timed out may well have arrived.

    Deriving the key from the task and the input is what makes the obvious
    reaction — run it again — safe. A freshly generated key on the retry
    would be a second answer to a question already answered.
    """
    runner = CliRunner()
    first = _answer(runner, "01T", "--input", '{"approve": true}')
    # The same answer written differently is the same answer: the key comes
    # from canonical JSON rather than from the bytes the user typed.
    retried = _answer(runner, "01T", "--input", '{"approve":  true }')
    assert first["key"] == retried["key"], "the retry asked to be a different answer"

    # A different answer to the same task is a different key.
    changed = _answer(runner, "01T", "--input", '{"approve": false}')
    assert changed["key"] != first["key"]

    # And the same answer to a different task is a different key too, or one
    # task's approval would silently satisfy another's.
    elsewhere = _answer(runner, "01U", "--input", '{"approve": true}')
    assert elsewhere["key"] != first["key"]


def test_answering_a_task_reads_the_input_from_a_file_or_a_flag(tmp_path: Path) -> None:
    runner = CliRunner()
    document = tmp_path / "answer.json"
    document.write_text('{"choice": "rerun"}')
    assert _answer(runner, "01T", "--file", str(document))["input"] == {"choice": "rerun"}
    assert _answer(runner, "01T", "--key", "mine", "--input", "{}")["key"] == "mine"


def test_an_answer_that_is_not_a_json_object_is_refused_before_the_call() -> None:
    """The gateway sends this on as the tool's arguments, and arguments are an
    object. Refusing here saves a round trip and gives a better message."""
    runner = CliRunner()
    for bad in ("[1, 2]", '"yes"', "not json at all"):
        RECORDED.pop("answers", None)
        refused = runner.invoke(app, ["mcp", "tasks", "input", "01T", "--input", bad])
        assert refused.exit_code == 1, bad
        assert "answers" not in RECORDED, f"{bad} reached the gateway"


def test_answering_needs_exactly_one_source_of_input(tmp_path: Path) -> None:
    runner = CliRunner()
    document = tmp_path / "a.json"
    document.write_text("{}")
    for arguments in ([], ["--input", "{}", "--file", str(document)]):
        RECORDED.pop("answers", None)
        refused = runner.invoke(app, ["mcp", "tasks", "input", "01T", *arguments])
        assert refused.exit_code == 1, arguments
        assert "answers" not in RECORDED


def test_alerts_name_who_acknowledged_rather_than_showing_a_tick() -> None:
    """"Who saw this" is the question. A tick answers a different one."""
    runner = CliRunner()
    listed = runner.invoke(app, ["mcp", "alerts", "list", "--org", "01ORG"])

    assert listed.exit_code == 0, listed.output
    assert "spend-cap" in listed.output and "critical" in listed.output
    assert "01USER" in listed.output, "an acknowledged alert does not say by whom"
    assert "no" in listed.output, "an unacknowledged alert does not say so"
    assert RECORDED["alert_filters"]["org"] == "01ORG"


def test_alerts_can_be_narrowed_to_a_team_and_to_what_nobody_has_seen() -> None:
    runner = CliRunner()
    runner.invoke(
        app, ["mcp", "alerts", "list", "--org", "01ORG", "--team", "01TEAM", "--unacknowledged"]
    )
    assert RECORDED["alert_filters"]["team"] == "01TEAM"
    assert RECORDED["alert_filters"]["unacknowledged"] is True


def test_acknowledging_an_alert_names_it() -> None:
    runner = CliRunner()
    acked = runner.invoke(app, ["mcp", "alerts", "ack", "alr_1"])
    assert acked.exit_code == 0 and "acknowledged" in acked.output
    assert RECORDED["acknowledged"] == "alr_1"


def test_forwarding_says_it_is_unhealthy_and_why() -> None:
    """Forwarding never fails the call it describes, so a failure is
    invisible unless something reports it."""
    runner = CliRunner()
    shown = runner.invoke(app, ["mcp", "forwarding", "--org", "01ORG"])

    assert shown.exit_code == 0, shown.output
    assert "no" in shown.output and "401" in shown.output
    assert "42" in shown.output and "7" in shown.output
    assert RECORDED["forwarding_filters"]["org"] == "01ORG"


def test_forwarding_never_shows_the_destination() -> None:
    """A URL is not a credential, but it is where somebody's audit goes."""
    runner = CliRunner()
    body = json.loads(runner.invoke(app, ["mcp", "-o", "json", "forwarding"]).output)
    assert "url" not in json.dumps(body) and "secret" not in json.dumps(body)


def test_jobs_names_the_replica_and_keeps_skipped_separate_from_failed() -> None:
    """`skipped` is the ordinary outcome on every replica but one.

    Rendering it as a problem, or folding it into failures, turns a working
    scheduler into a page somebody investigates.
    """
    runner = CliRunner()
    listed = runner.invoke(app, ["mcp", "jobs"])

    assert listed.exit_code == 0, listed.output
    # The replica is named, because every count below belongs to it alone.
    assert "gateway-1" in listed.output
    assert "audit-retention" in listed.output and "19" in listed.output
    # Skipped and failed are separate columns. Summed they would read 26, and
    # a scheduler doing its job would look like one failing seven times.
    assert "26" not in listed.output
    # A failing job shows why rather than only that.
    assert "solr is down" in listed.output
    # A job that has never run says so rather than showing an empty cell.
    assert "never" in listed.output

    as_json = runner.invoke(app, ["mcp", "-o", "json", "jobs"])
    payload = json.loads(as_json.output)
    assert payload["holder"] == "gateway-1"
    assert payload["jobs"][0]["skipped"] == 19 and payload["jobs"][0]["failed"] == 7
    assert payload["jobs"][1]["healthy"] is False


def test_setup_writes_each_client_s_file(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("DATALAYER_JUPYTER_MCP_SERVER_URL", "https://mcp.test/mcp")
    runner = CliRunner()
    written = runner.invoke(app, ["mcp", "setup", "cursor", "--path", str(tmp_path / "mcp.json"), "--scopes", "notebooks:read"])
    assert written.exit_code == 0, written.output
    document = json.loads((tmp_path / "mcp.json").read_text())
    assert document == {"mcpServers": {"datalayer": {"url": "https://mcp.test/mcp?scopes=notebooks:read"}}}
    assert "dynamic client registration" in written.output

    printed = runner.invoke(app, ["mcp", "setup", "vscode", "--print", "--path", str(tmp_path / ".vscode" / "mcp.json"), "--url", "https://other.test/mcp"])
    assert printed.exit_code == 0, printed.output
    assert '"servers"' in printed.output and "https://other.test/mcp" in printed.output
    assert not (tmp_path / ".vscode" / "mcp.json").exists()

    codex = runner.invoke(app, ["mcp", "-o", "json", "setup", "codex", "--path", str(tmp_path / "config.toml")])
    assert codex.exit_code == 0, codex.output
    answer = json.loads(codex.output)
    assert answer["registration"] == "dcr"
    assert (tmp_path / "config.toml").read_text() == '[mcp_servers.datalayer]\nurl = "https://mcp.test/mcp"\n'

    unknown = runner.invoke(app, ["mcp", "setup", "emacs"])
    assert unknown.exit_code == 1


def test_setup_help_says_which_clients_register_by_url() -> None:
    result = CliRunner().invoke(app, ["mcp", "setup", "--help"])
    assert result.exit_code == 0
    assert "Client ID Metadata Document" in result.output
    assert "dynamic client registration" in result.output
    assert "mcp-clients/cli.json" in result.output
