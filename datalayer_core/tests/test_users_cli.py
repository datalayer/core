# Copyright (c) 2023-2026 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""`datalayer users create`: an account a platform administrator makes."""

from typing import Any

import pytest
from typer.testing import CliRunner

from datalayer_core.cli.commands import users


class _Client:
    def __init__(self, api_key: Any = None) -> None:
        self.api_key = api_key
        self.urls = type("Urls", (), {"iam_url": "https://iam.test"})()

    def _get_api_key(self) -> str:
        return "token-never-printed"


class _Response:
    def __init__(self, status: int, body: dict[str, Any]) -> None:
        self.status_code = status
        self.ok = status < 400
        self._body = body
        self.text = str(body)

    def json(self) -> dict[str, Any]:
        return self._body


def test_create_posts_the_account_and_prints_its_uid(monkeypatch: pytest.MonkeyPatch) -> None:
    sent: dict[str, Any] = {}

    def post(url: str, headers: dict[str, str], json: dict[str, Any], timeout: int) -> _Response:
        sent.update(url=url, headers=headers, json=json)
        return _Response(200, {"success": True, "user": {"uid": "01USER", "handle_s": "ada", "email_s": "ada@example.com"}})

    monkeypatch.setattr(users, "DatalayerClient", _Client)
    monkeypatch.setattr(users.requests, "post", post)
    answer = CliRunner().invoke(
        users.app,
        ["create", "--handle", "ada", "--email", "ada@example.com", "--password", "correct horse battery", "--first-name", "Ada"],
    )
    assert answer.exit_code == 0, answer.stdout
    assert sent["url"] == "https://iam.test/api/iam/v1/users"
    assert sent["json"] == {"handle": "ada", "email": "ada@example.com", "password": "correct horse battery", "first_name": "Ada", "last_name": ""}
    assert sent["headers"]["Authorization"] == "Bearer token-never-printed"
    assert "01USER" in answer.stdout and "ada@example.com" in answer.stdout
    # The password is sent once and never printed.
    assert "correct horse battery" not in answer.stdout and "token-never-printed" not in answer.stdout


def test_create_prints_iams_refusal_and_exits_1(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(users, "DatalayerClient", _Client)
    monkeypatch.setattr(
        users.requests, "post", lambda url, **kwargs: _Response(403, {"detail": "Creating an account is a platform administrator's."})
    )
    answer = CliRunner().invoke(users.app, ["create", "--handle", "ada", "--email", "ada@example.com", "--password", "x" * 12])
    assert answer.exit_code == 1
    assert "platform administrator" in answer.stdout


def test_create_asks_for_the_password_when_not_given(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(users, "DatalayerClient", _Client)
    monkeypatch.setattr(users.requests, "post", lambda url, **kwargs: _Response(200, {"user": {"uid": "01USER"}}))
    answer = CliRunner().invoke(users.app, ["create", "--handle", "ada", "--email", "ada@example.com"], input="secret-word-1\nsecret-word-1\n")
    assert answer.exit_code == 0, answer.stdout
    assert "01USER" in answer.stdout and "secret-word-1" not in answer.stdout
