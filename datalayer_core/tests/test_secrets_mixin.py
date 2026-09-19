# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

# Copyright (c) 2023-2026 Datalayer, Inc.
# BSD 3-Clause License

"""
What creating a secret sends.

The value used to go out base64-encoded and nothing on the other side undid
it: a build secret resolved for an environment build arrived encoded and was
mounted that way, so a key created here opened nothing (PLAN_ENVS.md E3-05,
found 2026-09-17).
"""

from typing import Any
from unittest.mock import MagicMock

from datalayer_core.mixins.secrets import SecretsCreateMixin


class _Client(SecretsCreateMixin):
    """The mixin with the one seam it uses, and nothing else."""

    def __init__(self) -> None:
        self.sent: dict[str, Any] = {}
        self.urls = MagicMock(iam_url="https://iam.example")

    def _fetch(self, url: str, method: str = "GET", **kwargs: Any) -> Any:
        self.sent = {"url": url, "method": method, **kwargs}
        response = MagicMock()
        response.json.return_value = {"success": True}
        return response


def test_the_value_is_sent_as_it_is() -> None:
    client = _Client()
    client._create_secret(
        name="DAYTONA_API_KEY",
        description="a provider credential",
        value="dtn_a-real-key",
        secret_type="generic",
    )
    body = client.sent["json"]
    assert body["value"] == "dtn_a-real-key"
    assert body["name"] == "DAYTONA_API_KEY"
    assert body["variant"] == "generic"


def test_a_value_that_is_itself_base64_goes_out_untouched() -> None:
    """There is one representation, so nothing inspects the bytes.

    A value that happens to be valid base64 is a value, not an encoding, and
    no reader is left to tell the difference.
    """
    client = _Client()
    client._create_secret(
        name="K", description="d", value="dGhpcyBpcyBiYXNlNjQ=", secret_type="generic"
    )
    body = client.sent["json"]
    assert body["value"] == "dGhpcyBpcyBiYXNlNjQ="
    assert "encoding" not in body


def test_it_posts_to_the_secrets_route() -> None:
    client = _Client()
    client._create_secret(name="K", description="d", value="v", secret_type="generic")
    assert client.sent["url"] == "https://iam.example/api/iam/v1/secrets"
    assert client.sent["method"] == "POST"
