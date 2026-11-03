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


def test_create_posts_the_account_and_prints_its_uid(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    sent: dict[str, Any] = {}

    def post(
        url: str, headers: dict[str, str], json: dict[str, Any], timeout: int
    ) -> _Response:
        sent.update(url=url, headers=headers, json=json)
        return _Response(
            200,
            {
                "success": True,
                "user": {
                    "uid": "01USER",
                    "handle_s": "ada",
                    "email_s": "ada@example.com",
                },
            },
        )

    monkeypatch.setattr(users, "DatalayerClient", _Client)
    monkeypatch.setattr(users.requests, "post", post)
    answer = CliRunner().invoke(
        users.app,
        [
            "create",
            "--handle",
            "ada",
            "--email",
            "ada@example.com",
            "--password",
            "correct horse battery",
            "--first-name",
            "Ada",
        ],
    )
    assert answer.exit_code == 0, answer.stdout
    assert sent["url"] == "https://iam.test/api/iam/v1/users"
    assert sent["json"] == {
        "handle": "ada",
        "email": "ada@example.com",
        "password": "correct horse battery",
        "first_name": "Ada",
        "last_name": "",
    }
    assert sent["headers"]["Authorization"] == "Bearer token-never-printed"
    assert "01USER" in answer.stdout and "ada@example.com" in answer.stdout
    # The password is sent once and never printed.
    assert (
        "correct horse battery" not in answer.stdout
        and "token-never-printed" not in answer.stdout
    )


def test_create_prints_iams_refusal_and_exits_1(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(users, "DatalayerClient", _Client)
    monkeypatch.setattr(
        users.requests,
        "post",
        lambda url, **kwargs: _Response(
            403, {"detail": "Creating an account is a platform administrator's."}
        ),
    )
    answer = CliRunner().invoke(
        users.app,
        [
            "create",
            "--handle",
            "ada",
            "--email",
            "ada@example.com",
            "--password",
            "x" * 12,
        ],
    )
    assert answer.exit_code == 1
    assert "platform administrator" in answer.stdout


def test_create_asks_for_the_password_when_not_given(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(users, "DatalayerClient", _Client)
    monkeypatch.setattr(
        users.requests,
        "post",
        lambda url, **kwargs: _Response(200, {"user": {"uid": "01USER"}}),
    )
    answer = CliRunner().invoke(
        users.app,
        ["create", "--handle", "ada", "--email", "ada@example.com"],
        input="secret-word-1\nsecret-word-1\n",
    )
    assert answer.exit_code == 0, answer.stdout
    assert "01USER" in answer.stdout and "secret-word-1" not in answer.stdout


def test_credits_add_reads_the_balance_and_sets_it_plus_the_amount(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """
    --add reads the balance by handle, then sets balance plus amount.
    """
    calls: list[tuple[str, str, Any]] = []

    def get(url: str, **kwargs: Any) -> _Response:
        """
        The handle's profile, then the balance.
        """
        calls.append(("GET", url, None))
        if url.endswith("/users/public/datalayer-demo"):
            return _Response(200, {"profile": {"uid": "01M4BDHQWKVGT55RS5AQPC430T"}})
        return _Response(200, {"credits": {"credits": 3689.14}})

    def put(url: str, **kwargs: Any) -> _Response:
        """
        The balance written.
        """
        calls.append(("PUT", url, kwargs["json"]))
        return _Response(200, {"success": True})

    monkeypatch.setattr(users, "DatalayerClient", _Client)
    monkeypatch.setattr(users.requests, "get", get)
    monkeypatch.setattr(users.requests, "put", put)
    answer = CliRunner().invoke(users.app, ["credits", "add", "datalayer-demo", "500"])
    assert answer.exit_code == 0, answer.stdout
    credits_url = (
        "https://iam.test/api/iam/v1/usage/credits/users/01M4BDHQWKVGT55RS5AQPC430T"
    )
    assert calls == [
        ("GET", "https://iam.test/api/iam/v1/users/public/datalayer-demo", None),
        ("GET", credits_url, None),
        ("PUT", credits_url, {"credits": pytest.approx(4189.14)}),
    ]
    assert "now 4,189.14" in answer.stdout


def test_credits_shows_the_balance_by_uid_without_writing(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """
    With no option, the balance is read and nothing is written.
    """
    monkeypatch.setattr(users, "DatalayerClient", _Client)
    monkeypatch.setattr(
        users.requests,
        "get",
        lambda url, **kwargs: _Response(200, {"credits": {"credits": 12.5}}),
    )
    monkeypatch.setattr(
        users.requests, "put", lambda *a, **k: pytest.fail("a read writes nothing")
    )
    answer = CliRunner().invoke(
        users.app, ["credits", "show", "01M4BDHQWKVGT55RS5AQPC430T"]
    )
    assert answer.exit_code == 0, answer.stdout
    assert "12.50 credits" in answer.stdout


@pytest.mark.parametrize(
    "args",
    [
        ["add", "01M4BDHQWKVGT55RS5AQPC430T", "0"],
        ["add", "01M4BDHQWKVGT55RS5AQPC430T", "--", "-1"],
        ["set", "01M4BDHQWKVGT55RS5AQPC430T", "--", "-3"],
    ],
)
def test_credits_refuses_unclear_amounts(
    monkeypatch: pytest.MonkeyPatch, args: list[str]
) -> None:
    """
    A zero or negative amount to add, or a negative balance, is refused before any call.
    """
    monkeypatch.setattr(users, "DatalayerClient", _Client)
    monkeypatch.setattr(
        users.requests, "get", lambda *a, **k: pytest.fail("refused before any call")
    )
    answer = CliRunner().invoke(users.app, ["credits", *args])
    assert answer.exit_code == 1


def test_credits_set_writes_the_balance(monkeypatch: pytest.MonkeyPatch) -> None:
    """
    set reads the balance, then writes the one given.
    """
    written: list[Any] = []
    monkeypatch.setattr(users, "DatalayerClient", _Client)
    monkeypatch.setattr(
        users.requests,
        "get",
        lambda url, **kwargs: _Response(200, {"credits": {"credits": 12.5}}),
    )
    monkeypatch.setattr(
        users.requests,
        "put",
        lambda url, **kwargs: written.append(kwargs["json"]) or _Response(200, {}),
    )
    answer = CliRunner().invoke(
        users.app, ["credits", "set", "01M4BDHQWKVGT55RS5AQPC430T", "1000"]
    )
    assert answer.exit_code == 0, answer.stdout
    assert written == [{"credits": 1000.0}]
    assert "now 1,000.00" in " ".join(answer.stdout.split())


def test_credits_has_no_command_named_after_an_account() -> None:
    """
    The verbs are show, add and set: an account's handle is never read as one.
    """
    answer = CliRunner().invoke(users.app, ["credits", "ada"])
    assert answer.exit_code != 0


def test_credits_prints_iams_refusal(monkeypatch: pytest.MonkeyPatch) -> None:
    """
    IAM's refusal is printed as it is, and the command exits 1.
    """
    monkeypatch.setattr(users, "DatalayerClient", _Client)
    monkeypatch.setattr(
        users.requests,
        "get",
        lambda url, **kwargs: _Response(
            403, {"detail": "Not a platform administrator."}
        ),
    )
    answer = CliRunner().invoke(
        users.app, ["credits", "add", "01M4BDHQWKVGT55RS5AQPC430T", "10"]
    )
    assert answer.exit_code == 1 and "Not a platform administrator." in answer.stdout
