# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

# Copyright (c) 2023-2026 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

from typing import Any

import pytest
from typer.testing import CliRunner

from datalayer_core.cli.commands import secrets
from datalayer_core.models.secret import SecretModel


class _Client:
    def __init__(self, api_key: Any = None) -> None:
        self.api_key = api_key

    def list_secrets(self) -> list[SecretModel]:
        return [
            SecretModel(
                uid="secret-1",
                name="DATALAYER_ODOO_URL",
                description="Odoo origin",
                secret_type="generic",
            )
        ]

    def get_secret_value(self, name: str) -> str:
        assert name == "DATALAYER_ODOO_URL"
        return "https://example.odoo.com"


def test_get_hides_the_value_by_default(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(secrets, "DatalayerClient", _Client)
    answer = CliRunner().invoke(secrets.app, ["get", "DATALAYER_ODOO_URL"])
    assert answer.exit_code == 0
    assert "DATALAYER_ODOO_URL" in answer.stdout
    assert "Value hidden" in answer.stdout
    assert "https://example.odoo.com" not in answer.stdout


def test_get_can_explicitly_write_only_the_raw_value(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(secrets, "DatalayerClient", _Client)
    answer = CliRunner().invoke(secrets.app, ["get", "secret-1", "--show-value"])
    assert answer.exit_code == 0
    assert answer.stdout == "https://example.odoo.com\n"


def test_get_refuses_an_unknown_reference(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(secrets, "DatalayerClient", _Client)
    answer = CliRunner().invoke(secrets.app, ["get", "missing"])
    assert answer.exit_code == 1
    assert "No secret has the UID or name 'missing'" in answer.stdout
