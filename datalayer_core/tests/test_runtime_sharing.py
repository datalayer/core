# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

# Copyright (c) 2023-2026 Datalayer, Inc.
# Datalayer License

"""Sharing a runtime from the SDK and the CLI: which routes, what merges."""

from __future__ import annotations

from types import SimpleNamespace

import pytest

from datalayer_core.client.client import DatalayerClient


class Response:
    def __init__(self, payload):
        self._payload = payload

    def json(self):
        return self._payload


HELD = {"success": True, "sharing": {"runtime_name": "rt-1", "owner_uid": "u-1", "shared": True, "access": {
    "view": {"userUids": ["u-a"], "teamUids": [], "organizationUids": [], "agentUids": []},
    "update": {"userUids": [], "teamUids": [], "organizationUids": [], "agentUids": []},
    "execute": {"userUids": [], "teamUids": [], "organizationUids": [], "agentUids": ["agt-7"]},
}}}


class Client(DatalayerClient):
    urls = property(lambda self: SimpleNamespace(runtimes_url="https://runtimes.example"))

    def __init__(self, *answers):
        self.calls = []
        self.answers = list(answers)

    def _fetch(self, url, **kwargs):
        self.calls.append((url, kwargs))
        answer = self.answers.pop(0)
        if isinstance(answer, Exception):
            raise answer
        return Response(answer)


class TestSharing:
    def test_share_adds_to_the_level(self):
        client = Client(HELD, HELD)
        client.share_runtime("rt-1", level="view", users=["u-b", "u-a"], agents=["agt-9"])
        url, kwargs = client.calls[1]
        assert url.endswith("/runtimes/rt-1/sharing") and kwargs["method"] == "PUT"
        assert kwargs["json"] == {"access": {"view": {"userUids": ["u-a", "u-b"], "teamUids": [], "organizationUids": [], "agentUids": ["agt-9"]}}}

    def test_replace_makes_the_lists_the_whole_grant(self):
        client = Client(HELD)
        client.share_runtime("rt-1", level="view", users=["u-b"], replace=True)
        assert client.calls[0][1]["json"]["access"]["view"]["userUids"] == ["u-b"]

    def test_a_level_that_is_not_one(self):
        with pytest.raises(ValueError, match="not a level"):
            Client().share_runtime("rt-1", level="admin", users=["u-b"])

    def test_unshare_one_principal_at_one_level(self):
        client = Client(HELD, HELD)
        client.unshare_runtime("rt-1", level="execute", agents=["agt-7"])
        assert client.calls[1][1]["json"] == {"access": {"execute": {"userUids": [], "teamUids": [], "organizationUids": [], "agentUids": []}}}

    def test_unshare_everybody_everywhere(self):
        client = Client(HELD, HELD)
        client.unshare_runtime("rt-1")
        access = client.calls[1][1]["json"]["access"]
        assert set(access) == {"view", "update", "execute"} and all(not v for level in access.values() for v in level.values())

    def test_a_refusal_is_an_error_in_words(self):
        with pytest.raises(RuntimeError, match="Only the runtime's owner"):
            Client({"success": False, "detail": "Only the runtime's owner may share it."}).runtime_sharing("rt-1")

    def test_permissions(self):
        client = Client({"success": True, "permissions": {"view": True, "update": False, "execute": False, "owner": False, "owner_uid": "u-1"}})
        assert client.runtime_permissions("rt-1")["view"] is True
        assert client.calls[0][0].endswith("/runtimes/rt-1/permissions")


class TestTheCli:
    def test_the_commands_exist(self):
        from datalayer_core.cli.commands.mcp import sandboxes_app

        names = {command.name for command in sandboxes_app.registered_commands}
        assert names == {"share", "unshare", "sharing", "permissions"}

    def test_share_names_somebody(self, monkeypatch):
        from typer.testing import CliRunner

        from datalayer_core.cli.commands import mcp as cli

        monkeypatch.setattr(cli, "_client", lambda: Client(HELD, HELD))
        runner = CliRunner()
        empty = runner.invoke(cli.app, ["sandboxes", "share", "rt-1"])
        assert empty.exit_code != 0 and "Name somebody" in (empty.output + str(empty.exception or ""))
        shared = runner.invoke(cli.app, ["sandboxes", "share", "rt-1", "--user", "u-b", "--level", "view"])
        assert shared.exit_code == 0, shared.output
        assert "rt-1: shared" in shared.output
