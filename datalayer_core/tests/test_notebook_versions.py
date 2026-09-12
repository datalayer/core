# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

# Copyright (c) 2023-2026 Datalayer, Inc.
# Datalayer License

"""The SDK's notebook versions: which route, what body, what comes back."""

from __future__ import annotations

from types import SimpleNamespace

import pytest

from datalayer_core.client.client import DatalayerClient


class Response:
    def __init__(self, payload):
        self._payload = payload

    def json(self):
        return self._payload


class Client(DatalayerClient):
    """A client whose HTTP is a list of canned answers."""

    # The parent's `urls` is a read-only property; this one answers a fixed
    # spacer without the environment.
    urls = property(lambda self: SimpleNamespace(spacer_url="https://spacer.example"))

    def __init__(self, *answers):
        self.calls = []
        self.answers = list(answers)

    def _fetch(self, url, **kwargs):
        self.calls.append((url, kwargs))
        answer = self.answers.pop(0)
        if isinstance(answer, Exception):
            raise answer
        return Response(answer)


class TestListing:
    def test_it_asks_the_versions_route(self):
        client = Client({"success": True, "versions": [{"uid": "v1"}, {"uid": "v0"}]})
        assert [v["uid"] for v in client.list_notebook_versions("ntb-1")] == ["v1", "v0"]
        url, kwargs = client.calls[0]
        assert url == "https://spacer.example/api/spacer/v1/notebooks/ntb-1/versions"
        assert kwargs["method"] == "GET"

    def test_a_failure_is_an_empty_list(self):
        assert Client(RuntimeError("down")).list_notebook_versions("ntb-1") == []


class TestSnapshot:
    def test_it_posts_the_message(self):
        client = Client({"success": True, "version": {"uid": "v9", "message": "before"}})
        assert client.snapshot_notebook("ntb-1", "before")["uid"] == "v9"
        url, kwargs = client.calls[0]
        assert url.endswith("/notebooks/ntb-1/versions") and kwargs["method"] == "POST"
        assert kwargs["json"] == {"message": "before"}

    def test_a_refusal_is_an_error_in_words(self):
        client = Client({"success": False, "detail": "Not authorized to access this notebook's versions."})
        with pytest.raises(RuntimeError, match="Not authorized"):
            client.snapshot_notebook("ntb-1")


class TestRestore:
    def test_it_posts_to_the_versions_restore_route(self):
        client = Client({"success": True, "restored": {"uid": "v1"}, "kept": {"uid": "v2", "reason": "restore"}})
        outcome = client.restore_notebook_version("ntb-1", "v1")
        assert outcome == {"restored": {"uid": "v1"}, "kept": {"uid": "v2", "reason": "restore"}}
        url, kwargs = client.calls[0]
        assert url.endswith("/notebooks/ntb-1/versions/v1/restore") and kwargs["method"] == "POST"

    def test_an_unknown_version(self):
        with pytest.raises(RuntimeError, match="Version not found"):
            Client({"success": False, "detail": "Version not found."}).restore_notebook_version("ntb-1", "nope")
