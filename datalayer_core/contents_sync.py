# Copyright (c) 2023-2026 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""The local side of a synchronization session.

The service decides; this carries the decision out. It hashes the folder,
opens a session, applies the plan it is given — uploads through the
resumable transfer API, downloads by fetching only the blocks that differ,
deletions on either side — and reports back so the service can verify and
remember. In watch mode it keeps doing that until stopped.

What it remembers between runs lives beside the folder, under
`.datalayer-sync/`: the session it was in, and the manifest both sides last
accepted, so a reconnect resumes rather than restarts. That directory is
excluded from every manifest it produces.
"""

from __future__ import annotations

import hashlib
import json
import os
import tempfile
import time
from dataclasses import dataclass, field
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, Callable, Iterable
from uuid import uuid4

from datalayer_common.content_sync import (
    DEFAULT_BLOCK_SIZE,
    Exclusions,
    Manifest,
    scan_directory,
)

STATE_DIRECTORY = ".datalayer-sync"
#: Always excluded: the state must never be synchronized as content.
BUILT_IN_EXCLUSIONS = (f"{STATE_DIRECTORY}/",)

Progress = Callable[[str], None]


@dataclass
class SyncOutcome:
    """What one reconciliation did, as the command reports it."""

    session_uid: str
    status: str
    uploaded: list[str] = field(default_factory=list)
    downloaded: list[str] = field(default_factory=list)
    deleted_locally: list[str] = field(default_factory=list)
    deleted_remotely: list[str] = field(default_factory=list)
    conflicts: list[str] = field(default_factory=list)
    failed: dict[str, str] = field(default_factory=dict)
    transferred_bytes: int = 0

    def to_dict(self) -> dict[str, Any]:
        return {
            "session_uid": self.session_uid,
            "status": self.status,
            "uploaded": self.uploaded,
            "downloaded": self.downloaded,
            "deleted_locally": self.deleted_locally,
            "deleted_remotely": self.deleted_remotely,
            "conflicts": self.conflicts,
            "failed": self.failed,
            "transferred_bytes": self.transferred_bytes,
        }


class LocalSyncState:
    """The memory a folder keeps of its sessions."""

    def __init__(self, root: Path) -> None:
        self.directory = Path(root) / STATE_DIRECTORY

    def _path(self, remote_uri: str) -> Path:
        digest = hashlib.sha256(remote_uri.encode()).hexdigest()[:16]
        return self.directory / f"{digest}.json"

    def load(self, remote_uri: str) -> dict[str, Any]:
        path = self._path(remote_uri)
        if not path.is_file():
            return {}
        try:
            return json.loads(path.read_text())
        except ValueError:
            return {}

    def save(self, remote_uri: str, value: dict[str, Any]) -> None:
        self.directory.mkdir(parents=True, exist_ok=True)
        path = self._path(remote_uri)
        temporary = path.with_suffix(".tmp")
        temporary.write_text(json.dumps({**value, "remote_uri": remote_uri}, indent=2, sort_keys=True))
        os.replace(temporary, path)


def _remote_path(remote_uri: str, relative: str) -> str:
    prefix = remote_uri[len("home-folder:///"):].strip("/") if remote_uri.startswith("home-folder:///") else ""
    return f"{prefix}/{relative}" if prefix else relative


def _now() -> str:
    return datetime.now(UTC).isoformat(timespec="milliseconds").replace("+00:00", "Z")


class Synchronizer:
    """Drive one folder against one remote through the Contents client."""

    def __init__(
        self,
        client: Any,
        *,
        local_root: Path,
        remote_uri: str,
        direction: str = "bidirectional",
        conflict_policy: str = "manual",
        delete: bool = False,
        exclusions: Iterable[str] = (),
        block_size: int = DEFAULT_BLOCK_SIZE,
        progress: Progress | None = None,
    ) -> None:
        self.client = client
        self.root = Path(local_root)
        self.remote_uri = remote_uri
        self.direction = direction
        self.conflict_policy = conflict_policy
        self.delete = delete
        self.exclusions = Exclusions([*BUILT_IN_EXCLUSIONS, *exclusions])
        self.block_size = block_size
        self.progress = progress or (lambda message: None)
        self.state = LocalSyncState(self.root)

    # -- one pass ----------------------------------------------------------

    def scan(self) -> Manifest:
        remembered = self.state.load(self.remote_uri)
        return scan_directory(
            self.root,
            exclusions=self.exclusions,
            block_size=self.block_size,
            tombstones=remembered.get("tombstones") or {},
        )

    def run_once(self, *, watch: bool = False) -> SyncOutcome:
        """Open or resume a session, apply its plan, and report."""
        self.progress("Hashing the local folder")
        local = self.scan()
        remembered = self.state.load(self.remote_uri)
        session = None
        session_uid = remembered.get("session_uid")
        if session_uid:
            try:
                current = self.client.get_content_sync(session_uid)
                if current.status in {"watching", "conflicted", "transferring", "pending", "scanning"}:
                    self.progress("Resuming the session")
                    session = self.client.reconcile_content_sync(
                        session_uid, {"local_manifest": local.to_dict()}
                    )
            except Exception:
                session = None
        if session is None:
            self.progress("Comparing with the Home Folder")
            session = self.client.create_content_sync(
                {
                    "remote_uri": self.remote_uri,
                    "direction": self.direction,
                    "conflict_policy": self.conflict_policy,
                    "delete": self.delete,
                    "watch": watch,
                    "block_size": self.block_size,
                    "exclusions": [p for p in self.exclusions.patterns if p not in BUILT_IN_EXCLUSIONS],
                    "local_manifest": local.to_dict(),
                },
                idempotency_key=f"cli-sync-{uuid4()}",
            )
        return self._apply(session, local)

    def _apply(self, session: Any, local: Manifest) -> SyncOutcome:
        outcome = SyncOutcome(session_uid=session.uid, status=session.status)
        plan = (session.plan.actions if session.plan else []) or []
        applied: list[str] = []
        for action in plan:
            kind, path = action.kind, action.path
            try:
                if kind == "upload":
                    source = self.root / path
                    if path.endswith(".local") and not source.exists():
                        # keep-both: the local file goes up under its own name.
                        source = self.root / path[: -len(".local")]
                    self.progress(f"Uploading {path}")
                    transfer = self.client.upload_user_folder_file(
                        source,
                        _remote_path(self.remote_uri, path),
                        idempotency_key=f"sync-{session.uid}-{hashlib.sha256(path.encode()).hexdigest()[:16]}",
                        overwrite="replace",
                    )
                    outcome.transferred_bytes += int(getattr(transfer, "expected_size", 0) or 0)
                    outcome.uploaded.append(path)
                elif kind == "download":
                    self.progress(f"Downloading {path}")
                    outcome.transferred_bytes += self._download(action, local)
                    outcome.downloaded.append(path)
                elif kind == "delete_local":
                    target = self.root / path
                    if target.exists():
                        target.unlink()
                    outcome.deleted_locally.append(path)
                elif kind == "delete_remote":
                    self.progress(f"Deleting {path} remotely")
                    stat = self.client.stat_user_folder_object(_remote_path(self.remote_uri, path))
                    self.client.delete_user_folder_object(
                        stat.uid, idempotency_key=f"sync-{session.uid}-delete-{hashlib.sha256(path.encode()).hexdigest()[:16]}"
                    )
                    outcome.deleted_remotely.append(path)
                elif kind == "conflict":
                    outcome.conflicts.append(path)
                    continue
                else:
                    continue
                applied.append(path)
            except Exception as error:  # noqa: BLE001 - reported per path, not fatal
                outcome.failed[path] = str(error)
        reported = self.client.report_content_sync(
            session.uid,
            {
                "applied": applied,
                "transferred_bytes": outcome.transferred_bytes,
                "failed": outcome.failed,
            },
        )
        outcome.status = reported.status
        tombstones = dict(local.tombstones)
        now = _now()
        for path in [*outcome.deleted_locally, *outcome.deleted_remotely]:
            tombstones[path] = now
        self.state.save(
            self.remote_uri,
            {
                "session_uid": reported.uid,
                "status": reported.status,
                "tombstones": tombstones,
                "updated_at": now,
            },
        )
        return outcome

    def _download(self, action: Any, local: Manifest) -> int:
        """Fetch only the blocks that differ, writing the result atomically."""
        object_uid = getattr(action, "object_uid", None)
        if not object_uid:
            stat = self.client.stat_user_folder_object(_remote_path(self.remote_uri, action.path))
            object_uid = stat.uid
            version_uid = stat.current_version_uid
        else:
            version_uid = getattr(action, "version_uid", None)
        remote_size = int(self.client.stat_user_folder_object(_remote_path(self.remote_uri, action.path)).size)
        target = self.root / action.path
        target.parent.mkdir(parents=True, exist_ok=True)
        existing = local.entries.get(action.path)
        wanted = list(action.blocks or [])
        fetched = 0
        descriptor, temporary = tempfile.mkstemp(prefix=f".{target.name}.", suffix=".sync", dir=target.parent)
        try:
            with os.fdopen(descriptor, "wb") as output:
                if existing is not None and target.is_file() and wanted:
                    # Keep the blocks we already hold; fetch the rest by range.
                    with target.open("rb") as current:
                        total_blocks = max(len(existing.blocks), (remote_size + self.block_size - 1) // self.block_size)
                        for index in range(total_blocks):
                            start = index * self.block_size
                            if start >= remote_size:
                                break
                            end = min(start + self.block_size, remote_size) - 1
                            if index in wanted or index >= len(existing.blocks):
                                for chunk in self.client.iter_user_folder_object(
                                    object_uid, version_uid=version_uid, byte_range=f"bytes={start}-{end}"
                                ):
                                    output.write(chunk)
                                    fetched += len(chunk)
                            else:
                                current.seek(start)
                                output.write(current.read(end - start + 1))
                else:
                    for chunk in self.client.iter_user_folder_object(object_uid, version_uid=version_uid):
                        output.write(chunk)
                        fetched += len(chunk)
            os.replace(temporary, target)
        except Exception:
            Path(temporary).unlink(missing_ok=True)
            raise
        return fetched

    # -- watching ----------------------------------------------------------

    def watch(
        self,
        *,
        interval_seconds: float = 5.0,
        heartbeat_seconds: float = 30.0,
        stop: Callable[[], bool] | None = None,
        on_pass: Callable[[SyncOutcome], None] | None = None,
    ) -> SyncOutcome:
        """Reconcile until told to stop, or until the session ends.

        Local changes are found by rescanning: a folder is hashed again each
        interval and compared. No filesystem watcher is required, which is
        what makes the behaviour the same on every platform.
        """
        outcome = self.run_once(watch=True)
        if on_pass:
            on_pass(outcome)
        last_beat = time.monotonic()
        last_seen = self.scan()
        while not (stop and stop()) and outcome.status in {"watching", "conflicted", "transferring"}:
            time.sleep(interval_seconds)
            if time.monotonic() - last_beat >= heartbeat_seconds:
                try:
                    self.client.heartbeat_content_sync(outcome.session_uid)
                except Exception:
                    pass
                last_beat = time.monotonic()
            current = self.scan()
            if current.entries != last_seen.entries:
                last_seen = current
                session = self.client.reconcile_content_sync(
                    outcome.session_uid, {"local_manifest": current.to_dict()}
                )
                outcome = self._apply(session, current)
                if on_pass:
                    on_pass(outcome)
            else:
                # The remote may have changed under us: ask once in a while.
                session = self.client.reconcile_content_sync(
                    outcome.session_uid, {"local_manifest": current.to_dict()}
                )
                if session.plan and session.plan.actions:
                    outcome = self._apply(session, current)
                    if on_pass:
                        on_pass(outcome)
        return outcome
