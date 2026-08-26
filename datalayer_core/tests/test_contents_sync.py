# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""
The local side of synchronization, driven against a fake service.

The fake answers the way the service does — it hashes its own folder with the
shared engine and reconciles — so what these exercise is the client's part:
carrying a plan out, fetching only changed blocks, remembering the session and
the tombstones, and reporting honestly.
"""

from __future__ import annotations

import hashlib
import io
import json
from pathlib import Path
from types import SimpleNamespace
from typing import Any, Iterator

import pytest
from typer.testing import CliRunner

import datalayer_core.cli.commands.contents as contents_commands
from datalayer_core.cli.__main__ import app
from datalayer_core.contents_sync import STATE_DIRECTORY, Synchronizer
from datalayer_core.contents_sync_engine import (
    FileEntry,
    Manifest,
    accepted_after,
    hash_stream,
    reconcile,
)

BLOCK = 64 * 1024
REMOTE = "home-folder:///research"


class FakeContents:
    """The remote folder and the session logic, in memory."""

    def __init__(self) -> None:
        self.files: dict[str, bytes] = {}
        #: Files the folder has and the catalog does not — what a notebook
        #: wrote inside a sandbox.
        self.folder_only: dict[str, bytes] = {}
        self.by_path: list[str] = []
        self.sessions: dict[str, dict[str, Any]] = {}
        self.calls: list[str] = []
        self.ranges: list[str] = []
        self.counter = 0

    # -- the remote side -------------------------------------------------
    def _manifest(self) -> Manifest:
        manifest = Manifest(block_size=BLOCK)
        # The remote side is the folder: what Contents wrote and what a
        # notebook wrote, exactly as the service reports it.
        for path, content in {**self.files, **self.folder_only}.items():
            if not path.startswith("research/"):
                continue
            relative = path[len("research/") :]
            checksum, blocks, size = hash_stream(io.BytesIO(content), BLOCK)
            manifest.entries[relative] = FileEntry(
                relative, size, "2026-08-25T09:00:00.000Z", checksum, blocks
            )
        return manifest

    def _view(self, uid: str) -> SimpleNamespace:
        session = self.sessions[uid]
        actions = [SimpleNamespace(**a) for a in session["plan"]]
        return SimpleNamespace(
            uid=uid, status=session["status"], plan=SimpleNamespace(actions=actions)
        )

    def _plan(self, uid: str, local: dict[str, Any]) -> None:
        session = self.sessions[uid]
        local_manifest = Manifest.from_dict(local)
        remote = self._manifest()
        base = Manifest.from_dict(session["accepted"]) if session["accepted"] else None
        plan = reconcile(
            local_manifest,
            remote,
            base,
            direction=session["direction"],
            conflict_policy=session["conflict_policy"],
            delete=session["delete"],
        )
        session["local"], session["remote"] = local_manifest, remote
        session["plan_obj"] = plan
        session["plan"] = [
            {
                **a.to_dict(),
                "blocks": list(a.blocks),
                # Only what the catalog knows carries an identity; a file
                # only the folder has is named by its path alone.
                **(
                    {"object_uid": f"o-{a.path}", "version_uid": f"v-{a.path}"}
                    if f"research/{a.path}" in self.files
                    else {}
                ),
            }
            for a in plan.actions
        ]
        session["status"] = (
            "transferring"
            if plan.actions
            else ("watching" if session["watch"] else "transferring")
        )

    # -- the client surface ---------------------------------------------
    def create_content_sync(
        self, request: dict[str, Any], *, idempotency_key: str
    ) -> SimpleNamespace:
        self.calls.append("create")
        self.counter += 1
        uid = f"S{self.counter}"
        # As the service does: a new session starts from what the last one
        # on this remote agreed, so a deletion is not mistaken for a new file.
        previous = [
            item
            for item in self.sessions.values()
            if item["remote_uri"] == request["remote_uri"] and item.get("accepted")
        ]
        inherited = previous[-1]["accepted"] if previous else None
        self.sessions[uid] = {**request, "accepted": inherited, "plan": []}
        self._plan(uid, request["local_manifest"])
        return self._view(uid)

    def get_content_sync(self, uid: str) -> SimpleNamespace:
        return self._view(uid)

    def reconcile_content_sync(
        self, uid: str, request: dict[str, Any]
    ) -> SimpleNamespace:
        self.calls.append("reconcile")
        self._plan(uid, request["local_manifest"])
        return self._view(uid)

    def heartbeat_content_sync(self, uid: str) -> SimpleNamespace:
        self.calls.append("heartbeat")
        return self._view(uid)

    def report_content_sync(self, uid: str, request: dict[str, Any]) -> SimpleNamespace:
        self.calls.append("report")
        session = self.sessions[uid]
        verified = []
        for path in request["applied"]:
            action = next((a for a in session["plan"] if a["path"] == path), None)
            if action is None:
                continue
            if action["kind"] == "upload":
                stored = self.files.get(f"research/{path}")
                expected = session["local"].entries.get(path)
                if (
                    stored is None
                    or expected is None
                    or hashlib.sha256(stored).hexdigest() != expected.checksum
                ):
                    continue
            verified.append(path)
        session["accepted"] = accepted_after(
            session["local"], self._manifest(), session["plan_obj"], applied=verified
        ).to_dict()
        session["plan"] = [a for a in session["plan"] if a["path"] not in verified]
        if session["watch"]:
            session["status"] = "watching"
        else:
            session["status"] = "failed" if request.get("failed") else "succeeded"
        return self._view(uid)

    def cancel_content_sync(self, uid: str) -> SimpleNamespace:
        self.sessions[uid]["status"] = "cancelled"
        return self._view(uid)

    def upload_home_folder_file(
        self,
        local_path: str | Path,
        destination_path: str,
        *,
        idempotency_key: str,
        overwrite: str = "reject",
        **kwargs: Any,
    ) -> SimpleNamespace:
        content = Path(local_path).read_bytes()
        self.files[destination_path] = content
        return SimpleNamespace(uid="T", status="succeeded", expected_size=len(content))

    def stat_home_folder_object(self, path: str) -> SimpleNamespace:
        if path not in self.files:
            raise RuntimeError(f"no such object {path}")
        return SimpleNamespace(
            uid=f"o-{path}", current_version_uid=f"v-{path}", size=len(self.files[path])
        )

    def delete_home_folder_object(
        self, object_uid: str, *, idempotency_key: str
    ) -> None:
        path = object_uid[len("o-") :]
        self.files.pop(path, None)

    def iter_home_folder_file(
        self,
        path: str,
        *,
        byte_range: str | None = None,
        chunk_size: int = 1 << 20,
    ) -> Iterator[bytes]:
        """Read by path: what a file only the folder has is fetched with."""
        self.by_path.append(path)
        content = self.folder_only[path]
        if byte_range:
            self.ranges.append(byte_range)
            start, end = byte_range[len("bytes=") :].split("-")
            content = content[int(start) : int(end) + 1]
        for index in range(0, len(content), chunk_size):
            yield content[index : index + chunk_size]

    def iter_home_folder_object(
        self,
        object_uid: str,
        *,
        version_uid: str | None = None,
        byte_range: str | None = None,
        chunk_size: int = 1 << 20,
    ) -> Iterator[bytes]:
        path = object_uid[len("o-") :]
        if not path.startswith("research/"):
            path = f"research/{path}"
        content = self.files[path]
        if byte_range:
            self.ranges.append(byte_range)
            start, end = byte_range[len("bytes=") :].split("-")
            content = content[int(start) : int(end) + 1]
        for index in range(0, len(content), chunk_size):
            yield content[index : index + chunk_size]


def synchronizer(fake: FakeContents, root: Path, **overrides: Any) -> Synchronizer:
    settings: dict[str, Any] = dict(
        local_root=root, remote_uri=REMOTE, block_size=BLOCK
    )
    settings.update(overrides)
    return Synchronizer(fake, **settings)


def test_a_push_uploads_what_is_missing_and_remembers_the_session(
    tmp_path: Path,
) -> None:
    fake = FakeContents()
    (tmp_path / "a.csv").write_text("alpha")
    (tmp_path / "sub").mkdir()
    (tmp_path / "sub" / "b.csv").write_text("beta")

    outcome = synchronizer(fake, tmp_path, direction="push").run_once()

    assert outcome.status == "succeeded"
    assert sorted(outcome.uploaded) == ["a.csv", "sub/b.csv"]
    assert fake.files["research/sub/b.csv"] == b"beta"
    state = json.loads(next((tmp_path / STATE_DIRECTORY).glob("*.json")).read_text())
    assert state["session_uid"] == "S1"


def test_the_state_directory_is_never_synchronized(tmp_path: Path) -> None:
    fake = FakeContents()
    (tmp_path / "a.csv").write_text("alpha")
    synchronizer(fake, tmp_path, direction="push").run_once()

    again = synchronizer(fake, tmp_path, direction="push").run_once()

    assert again.uploaded == []
    assert not any(key.startswith(f"research/{STATE_DIRECTORY}") for key in fake.files)


def test_a_pull_fetches_only_the_blocks_that_changed(tmp_path: Path) -> None:
    fake = FakeContents()
    original = b"a" * BLOCK + b"b" * BLOCK + b"tail"
    (tmp_path / "big.bin").write_bytes(original)
    fake.files["research/big.bin"] = original
    # Agree on the file first, then change one block remotely.
    synchronizer(fake, tmp_path, direction="pull").run_once()
    fake.files["research/big.bin"] = b"a" * BLOCK + b"B" * BLOCK + b"tail"

    outcome = synchronizer(fake, tmp_path, direction="pull").run_once()

    assert outcome.downloaded == ["big.bin"]
    assert (tmp_path / "big.bin").read_bytes() == fake.files["research/big.bin"]
    # Only the second block crossed the network.
    assert fake.ranges == [f"bytes={BLOCK}-{2 * BLOCK - 1}"]


def test_a_new_remote_file_is_fetched_whole_and_written_atomically(
    tmp_path: Path,
) -> None:
    fake = FakeContents()
    fake.files["research/new.txt"] = b"fresh"

    outcome = synchronizer(fake, tmp_path, direction="pull").run_once()

    assert outcome.downloaded == ["new.txt"]
    assert (tmp_path / "new.txt").read_text() == "fresh"
    assert not list(tmp_path.glob(".new.txt.*.sync"))


def test_a_manual_conflict_is_left_for_a_person(tmp_path: Path) -> None:
    fake = FakeContents()
    (tmp_path / "c.txt").write_text("mine")
    fake.files["research/c.txt"] = b"theirs"

    outcome = synchronizer(fake, tmp_path).run_once()

    assert outcome.conflicts == ["c.txt"]
    assert (tmp_path / "c.txt").read_text() == "mine"
    assert fake.files["research/c.txt"] == b"theirs"


def test_a_local_deletion_propagates_only_with_delete_and_leaves_a_tombstone(
    tmp_path: Path,
) -> None:
    fake = FakeContents()
    (tmp_path / "gone.txt").write_text("v1")
    synchronizer(fake, tmp_path, direction="push").run_once()
    (tmp_path / "gone.txt").unlink()

    kept = synchronizer(fake, tmp_path, direction="push").run_once()
    assert kept.deleted_remotely == []
    assert "research/gone.txt" in fake.files

    removed = synchronizer(fake, tmp_path, direction="push", delete=True).run_once()
    assert removed.deleted_remotely == ["gone.txt"]
    assert "research/gone.txt" not in fake.files
    state = json.loads(next((tmp_path / STATE_DIRECTORY).glob("*.json")).read_text())
    assert "gone.txt" in state["tombstones"]


def test_a_failed_action_is_reported_not_hidden(tmp_path: Path) -> None:
    fake = FakeContents()
    (tmp_path / "a.csv").write_text("alpha")

    def refuse(*args: Any, **kwargs: Any) -> SimpleNamespace:
        raise RuntimeError("quota exceeded")

    fake.upload_home_folder_file = refuse  # type: ignore[method-assign]

    outcome = synchronizer(fake, tmp_path, direction="push").run_once()

    assert outcome.status == "failed"
    assert outcome.failed == {"a.csv": "quota exceeded"}


def test_watch_reconciles_when_the_folder_changes_and_stops_when_told(
    tmp_path: Path,
) -> None:
    fake = FakeContents()
    (tmp_path / "a.csv").write_text("v1")
    passes: list[Any] = []
    ticks = {"n": 0}

    def stop() -> bool:
        ticks["n"] += 1
        if ticks["n"] == 1:
            (tmp_path / "a.csv").write_text("v2")
        return ticks["n"] > 2

    outcome = synchronizer(fake, tmp_path, direction="push").watch(
        interval_seconds=0, heartbeat_seconds=0, stop=stop, on_pass=passes.append
    )

    assert fake.files["research/a.csv"] == b"v2"
    assert [p.uploaded for p in passes] == [["a.csv"], ["a.csv"]]
    assert "heartbeat" in fake.calls
    assert outcome.status == "watching"


# --- the command line ------------------------------------------------------


class Client(FakeContents):
    last: "Client | None" = None

    def __init__(self) -> None:
        super().__init__()
        Client.last = self


def test_sync_command_reports_the_outcome_as_json(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    monkeypatch.setattr(contents_commands, "DatalayerClient", Client)
    (tmp_path / "a.csv").write_text("alpha")

    result = CliRunner().invoke(
        app,
        [
            "contents",
            "--output",
            "json",
            "sync",
            str(tmp_path),
            REMOTE,
            "--direction",
            "push",
        ],
    )

    assert result.exit_code == 0, result.stdout
    assert '"uploaded"' in result.stdout and '"a.csv"' in result.stdout
    assert Client.last is not None and Client.last.files["research/a.csv"] == b"alpha"


def test_sync_command_refuses_a_remote_it_cannot_serve(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    monkeypatch.setattr(contents_commands, "DatalayerClient", Client)

    result = CliRunner().invoke(
        app, ["contents", "sync", str(tmp_path), "sandbox://box/work"]
    )

    assert result.exit_code == 1
    assert "home-folder:///" in result.output


def test_sync_resolve_validates_the_choice(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    monkeypatch.setattr(contents_commands, "DatalayerClient", Client)

    result = CliRunner().invoke(
        app, ["contents", "sync-resolve", "S1", "C1", "--use", "coin"]
    )

    assert result.exit_code == 1
    assert "local, remote or keep-both" in result.output


def test_a_file_only_the_folder_has_is_fetched_by_its_path(tmp_path: Path) -> None:
    """The download the catalog cannot serve.

    A notebook wrote the file straight into the mounted folder, so there is
    no object and no version to ask for — the plan names the path, and the
    client reads it from the folder through the service.
    """
    fake = FakeContents()
    payload = b"written inside the sandbox\n"
    fake.folder_only["research/from-the-sandbox.md"] = payload

    outcome = synchronizer(fake, tmp_path, direction="pull").run_once()

    assert outcome.downloaded == ["from-the-sandbox.md"]
    assert (tmp_path / "from-the-sandbox.md").read_bytes() == payload
    # Asked for by path, not by object: there is no object.
    assert fake.by_path == ["research/from-the-sandbox.md"]
