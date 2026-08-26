# Copyright (c) 2023-2026 Datalayer, Inc.
# Datalayer License

"""The Python client resumes from the transfer the service answers.

The fixture is the service's own — `k8s/services/contents/tests/fixtures/
interrupted-transfer.json`, proved there to be what the service says after a
connection drops with two parts of three received. Handed that answer, the
client must upload only the third part, with the checksum the service will
verify it against, and then complete. The TypeScript client and the CLI are
held to the same file.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import pytest

from datalayer_core.tests.test_contents_client import Client, Response

FIXTURE = (
    Path(__file__).resolve().parents[5]
    / "k8s" / "services" / "contents" / "tests" / "fixtures" / "interrupted-transfer.json"
)
pytestmark = pytest.mark.skipif(not FIXTURE.exists(), reason="the contents service checkout is not alongside")


def _content(size: int) -> bytes:
    return bytes((i * 7 + (i >> 16)) & 0xFF for i in range(size))


def test_the_client_uploads_only_the_missing_part(tmp_path) -> None:
    fixture = json.loads(FIXTURE.read_text())
    local = tmp_path / "interrupted.bin"
    local.write_bytes(_content(fixture["generator"]["size"]))
    finished = {**fixture["transfer"], "status": "succeeded", "part_count": 3, "received_bytes": fixture["generator"]["size"]}
    client = Client()
    client.responses = [Response(fixture["transfer"]), Response(finished), Response(finished)]

    result = client.upload_home_folder_file(
        local, "datasets/interrupted.bin",
        idempotency_key="resume-fixture",
    )

    assert result.status == "succeeded"
    urls = [url for url, _ in client.calls]
    assert urls[0].endswith("/transfers")
    # The whole-file checksum the client computed is the fixture's: same bytes.
    assert client.calls[0][1]["json"]["checksum"] == fixture["checksum"]
    # Exactly one part goes up — the third — and it is the third.
    part_calls = [(url, kwargs) for url, kwargs in client.calls if "/parts/" in url]
    assert [url.rsplit("/", 1)[1] for url, _ in part_calls] == ["2"]
    url, kwargs = part_calls[0]
    assert kwargs["headers"]["Content-SHA256"] == fixture["parts"][2]["checksum"]
    assert hashlib.sha256(kwargs["data"]).hexdigest() == fixture["parts"][2]["checksum"]
    assert urls[-1].endswith("/complete")
