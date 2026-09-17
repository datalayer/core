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


def test_it_says_which_encoding_that_is() -> None:
    """A reader is never left to guess from the bytes.

    A raw value can be valid base64 too, and guessing wrong on a credential is
    worse than not guessing — so the client says, and a secret written before
    this simply carries no marker.
    """
    client = _Client()
    client._create_secret(
        name="K", description="d", value="dGhpcyBpcyBiYXNlNjQ=", secret_type="generic"
    )
    body = client.sent["json"]
    assert body["encoding"] == "plain"
    # Even a value that *is* valid base64 goes out untouched.
    assert body["value"] == "dGhpcyBpcyBiYXNlNjQ="


def test_it_posts_to_the_secrets_route() -> None:
    client = _Client()
    client._create_secret(name="K", description="d", value="v", secret_type="generic")
    assert client.sent["url"] == "https://iam.example/api/iam/v1/secrets"
    assert client.sent["method"] == "POST"
