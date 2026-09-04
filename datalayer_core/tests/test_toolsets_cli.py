# Copyright (c) 2023-2026 Datalayer, Inc.
# Datalayer License

"""`datalayer mcp toolsets list|enable|disable`, and the SDK under them."""

from __future__ import annotations

from types import SimpleNamespace

import pytest
from typer.testing import CliRunner

from datalayer_core.cli.commands import mcp as cli
from datalayer_core.client.client import DatalayerClient


class Response:
    def __init__(self, payload):
        self._payload = payload

    def json(self):
        return self._payload


class Client(DatalayerClient):
    urls = property(lambda self: SimpleNamespace(contents_url="https://contents.example"))

    def __init__(self, *, sources=(), manifests=None, sessions=(), answer=None, fail=None):
        self.calls: list[tuple[str, str, dict]] = []
        self._sources = list(sources)
        self._manifests = manifests or {}
        self._sessions = list(sessions)
        self._answer = answer or {}
        self._fail = fail

    def list_content_sources(self, **kwargs):
        return SimpleNamespace(items=[SimpleNamespace(source=s) for s in self._sources])

    def _fetch(self, url, **kwargs):
        self.calls.append((kwargs.get("method", "GET"), url, kwargs))
        if self._fail:
            raise RuntimeError(self._fail)
        if "/mcp/tools" in url:
            uid = url.rsplit("/sources/", 1)[1].split("/")[0]
            if uid not in self._manifests:
                raise RuntimeError("no manifest")
            return Response(self._manifests[uid])
        if url.endswith("/mcp-sessions") and kwargs.get("method") == "GET":
            return Response({"items": self._sessions})
        return Response(self._answer)


SOURCE = SimpleNamespace(uid="src-1", name="Docs", kind="github")
QUIET = SimpleNamespace(uid="src-2", name="Nothing", kind="dataset")
EMPTY = SimpleNamespace(uid="src-3", name="Registered", kind="mcp")
#: `src-3` answers a manifest and lends nothing in it — a different thing
#: from `src-2`, which answers no manifest at all. Both are left out.
MANIFEST = {"src-1": {"tools": [{"name": "search"}, {"name": "read_file"}]}, "src-3": {"tools": []}}


class TestTheCatalogue:
    def test_only_sources_that_lend_tools(self):
        client = Client(sources=[SOURCE, QUIET, EMPTY], manifests=MANIFEST)
        assert client.list_toolsets() == [
            {"uid": "src-1", "name": "Docs", "kind": "github", "tools": ["read_file", "search"]}
        ]

    def test_a_source_whose_manifest_fails_is_left_out_not_fatal(self):
        client = Client(sources=[SOURCE], manifests={})
        assert client.list_toolsets() == []


class TestEnablingAndDisabling:
    def test_enable_posts_a_session_with_an_idempotency_key(self):
        client = Client(answer={"uid": "sess-1", "allowed_tools": ["search"]})
        assert client.enable_toolset("src-1", tools=["search"])["uid"] == "sess-1"
        method, url, kwargs = client.calls[-1]
        assert (method, url) == ("POST", "https://contents.example/api/contents/v1/mcp-sessions")
        assert kwargs["json"] == {"source_uid": "src-1", "tools": ["search"]}
        assert kwargs["headers"]["Idempotency-Key"] == "cli-enable-src-1"

    def test_enable_without_tools_asks_for_everything_the_source_allows(self):
        client = Client(answer={"uid": "sess-1"})
        client.enable_toolset("src-1")
        assert client.calls[-1][2]["json"] == {"source_uid": "src-1"}

    def test_disable_deletes_the_session(self):
        client = Client(answer={"uid": "sess-1", "status": "revoked"})
        assert client.disable_toolset("sess-1")["status"] == "revoked"
        method, url, _ = client.calls[-1]
        assert (method, url) == ("DELETE", "https://contents.example/api/contents/v1/mcp-sessions/sess-1")

    def test_a_refusal_is_an_error_in_words(self):
        client = Client(fail="403 Forbidden")
        with pytest.raises(RuntimeError, match="could not be enabled"):
            client.enable_toolset("src-1")


class TestTheCommands:
    def test_the_three_exist(self):
        assert {command.name for command in cli.toolsets_app.registered_commands} == {"list", "enable", "disable"}

    def test_list_says_which_are_enabled(self, monkeypatch):
        client = Client(
            sources=[SOURCE], manifests=MANIFEST,
            sessions=[{"uid": "sess-1", "source_uid": "src-1", "status": "active"},
                      {"uid": "sess-0", "source_uid": "src-1", "status": "revoked"}],
        )
        monkeypatch.setattr(cli, "_client", lambda: client)
        answer = CliRunner().invoke(cli.app, ["toolsets", "list"])
        assert answer.exit_code == 0, answer.output
        assert "Docs" in answer.output and "enabled (sess-1)" in answer.output
        assert "sess-0" not in answer.output, "a revoked session is not an enabled toolset"
        assert "read_file, search" in answer.output

    def test_list_when_nothing_lends_tools(self, monkeypatch):
        monkeypatch.setattr(cli, "_client", lambda: Client(sources=[QUIET], manifests={}))
        answer = CliRunner().invoke(cli.app, ["toolsets", "list"])
        assert answer.exit_code == 0 and "No source of yours lends tools" in answer.output

    def test_enable_prints_what_was_allowed(self, monkeypatch):
        monkeypatch.setattr(cli, "_client", lambda: Client(answer={"uid": "sess-1", "allowed_tools": ["search"], "expires_at": "2026-09-05T00:00:00Z", "approval_policy": "explicit"}))
        answer = CliRunner().invoke(cli.app, ["toolsets", "enable", "src-1", "--tool", "search"])
        assert answer.exit_code == 0, answer.output
        assert "sess-1" in answer.output and "search" in answer.output and "explicit" in answer.output

    def test_disable_asks_before_revoking(self, monkeypatch):
        client = Client(answer={"uid": "sess-1", "status": "revoked"})
        monkeypatch.setattr(cli, "_client", lambda: client)
        refused = CliRunner().invoke(cli.app, ["toolsets", "disable", "sess-1"], input="n\n")
        assert refused.exit_code == 0 and client.calls == []
        agreed = CliRunner().invoke(cli.app, ["toolsets", "disable", "sess-1", "--yes"])
        assert agreed.exit_code == 0 and "revoked" in agreed.output
