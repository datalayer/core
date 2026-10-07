# Copyright (c) 2023-2026 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

from types import SimpleNamespace
from typing import Any

import pytest

from datalayer_core.mixins.api_keys import ApiKeysCreateMixin
from datalayer_core.models.api_key import ApiKeyType


class _Response:
    def json(self) -> dict[str, Any]:
        return {"success": True, "apiKey": {"uid": "key-1"}}


class _Client(ApiKeysCreateMixin):
    def __init__(self) -> None:
        self.urls = SimpleNamespace(iam_url="https://iam.example")
        self.request: dict[str, Any] | None = None

    def _fetch(self, url: str, **kwargs: Any) -> _Response:
        self.request = {"url": url, **kwargs}
        return _Response()


def test_create_api_key_uses_current_iam_contract() -> None:
    client = _Client()

    result = client._create_api_key(
        name="slack-local",
        description="Temporary Slack adapter key",
        expiration_date=1_791_447_004,
        api_key_type=ApiKeyType.TEMPORARY,
    )

    assert result["success"] is True
    assert client.request == {
        "url": "https://iam.example/api/iam/v1/api-keys",
        "method": "POST",
        "json": {
            "name": "slack-local",
            "description": "Temporary Slack adapter key",
            "variant": "temporary",
            "expirationDate": 1_791_447_004_000,
        },
    }


def test_create_api_key_requires_an_expiration() -> None:
    client = _Client()

    with pytest.raises(ValueError, match="positive Unix timestamp"):
        client._create_api_key("name", "description", expiration_date=0)
