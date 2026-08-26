# Copyright (c) 2023-2026 Datalayer, Inc.
# Datalayer License

"""`datalayer contents upload` resumes from the transfer the service answers.

The same fixture the service and the two clients are held to — the CLI goes
through the Python client's upload, so this is the proof that nothing in the
command's own path (its idempotency key, its overwrite flag, its rendering)
gets between the client and a resume.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import pytest
from typer.testing import CliRunner

from datalayer_core.cli.__main__ import app
from datalayer_core.cli.commands import contents as contents_commands
from datalayer_core.tests.test_contents_client import Client, Response

FIXTURE = (
    Path(__file__).resolve().parents[5]
    / "k8s" / "services" / "contents" / "tests" / "fixtures" / "interrupted-transfer.json"
)
pytestmark = pytest.mark.skipif(not FIXTURE.exists(), reason="the contents service checkout is not alongside")


def _content(size: int) -> bytes:
    return bytes((i * 7 + (i >> 16)) & 0xFF for i in range(size))


def test_the_command_uploads_only_the_missing_part(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    fixture = json.loads(FIXTURE.read_text())
    local = tmp_path / "interrupted.bin"
    local.write_bytes(_content(fixture["generator"]["size"]))
    finished = {**fixture["transfer"], "status": "succeeded", "part_count": 3, "received_bytes": fixture["generator"]["size"]}
    seen: list[Client] = []

    class Resuming(Client):
        """The real client over a fake wire that answers the fixture."""

        def __init__(self) -> None:
            super().__init__()
            self.responses = [Response(fixture["transfer"]), Response(finished), Response(finished)]
            seen.append(self)

    monkeypatch.setattr(contents_commands, "DatalayerClient", Resuming)
    result = CliRunner().invoke(
        app, ["contents", "--output", "json", "upload", str(local), "home-folder:///datasets/interrupted.bin"],
    )

    assert result.exit_code == 0, result.output
    assert json.loads(result.output)["status"] == "succeeded"
    client = seen[0]
    part_calls = [(url, kwargs) for url, kwargs in client.calls if "/parts/" in url]
    assert [url.rsplit("/", 1)[1] for url, _ in part_calls] == ["2"]
    assert part_calls[0][1]["headers"]["Content-SHA256"] == fixture["parts"][2]["checksum"]
    assert hashlib.sha256(part_calls[0][1]["data"]).hexdigest() == fixture["parts"][2]["checksum"]
