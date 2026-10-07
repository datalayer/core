# Copyright (c) 2023-2026 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

from typing import Any

import pytest
from typer.testing import CliRunner

from datalayer_core.cli.commands import api_keys


class _Client:
    deleted: list[str] = []

    def __init__(self, api_key: Any = None) -> None:
        self.api_key = api_key

    def create_api_key(self, **kwargs: Any) -> dict[str, Any]:
        assert kwargs["expiration_date"] == 1_791_447_004
        return {
            "success": True,
            "accessToken": "secret-value",
            "apiKey": {
                "uid": "key-1",
                "name_s": "slack-local",
                "description_t": "Temporary Slack adapter key",
                "variant_s": "temporary",
            },
        }

    def delete_api_key(self, uid: str) -> bool:
        self.deleted.append(uid)
        return True


def test_create_accepts_the_current_iam_response(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(api_keys, "DatalayerClient", _Client)

    answer = CliRunner().invoke(
        api_keys.app,
        [
            "create",
            "slack-local",
            "Temporary Slack adapter key",
            "--api-key-type",
            "temporary",
            "--expiration-date",
            "1791447004",
        ],
    )

    assert answer.exit_code == 0
    assert "secret-value" in answer.stdout
    assert "key-1" in answer.stdout


def test_create_requires_an_expiration_date() -> None:
    answer = CliRunner().invoke(
        api_keys.app,
        ["create", "slack-local", "Temporary Slack adapter key"],
    )

    assert answer.exit_code != 0
    assert "--expiration-date" in answer.stderr


def test_create_removes_metadata_when_iam_omits_the_one_time_value(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    class ClientWithoutValue(_Client):
        def create_api_key(self, **kwargs: Any) -> dict[str, Any]:
            return {
                "success": True,
                "apiKey": {"uid": "unusable-key"},
            }

    ClientWithoutValue.deleted = []
    monkeypatch.setattr(api_keys, "DatalayerClient", ClientWithoutValue)

    answer = CliRunner().invoke(
        api_keys.app,
        [
            "create",
            "slack-local",
            "Temporary Slack adapter key",
            "--expiration-date",
            "1791447004",
        ],
    )

    assert answer.exit_code == 1
    assert "did not return the one-time key value" in answer.stdout
    assert ClientWithoutValue.deleted == ["unusable-key"]
