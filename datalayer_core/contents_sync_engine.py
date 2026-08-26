# Copyright (c) 2023-2026 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""
Block hashing, manifests and reconciliation for Contents synchronization.

One implementation, used by both ends. The CLI hashes the local folder with
it; the Contents service hashes the remote one with it; both compare the
result with the same `reconcile`. That is what makes a plan deterministic:
two machines given the same three manifests produce the same actions, in the
same order, whatever their platform — which is the property the conflict and
deletion policies are tested against.

Nothing here touches the network or a database. A manifest is a value, and a
plan is a value computed from three of them.
"""

from __future__ import annotations

import fnmatch
import hashlib
import os
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path, PurePosixPath
from typing import Any, Iterable, Literal, Mapping

from datalayer_core.contents_paths import normalize_object_path

#: Files are hashed in blocks of this size, so a change in one block of a
#: large file is detected — and later moved — without touching the rest.
DEFAULT_BLOCK_SIZE = 4 * 1024 * 1024
#: Small enough that a pathological request cannot make the service hash a
#: file one byte at a time; large enough to be pointless to exceed.
MIN_BLOCK_SIZE = 64 * 1024
MAX_BLOCK_SIZE = 64 * 1024 * 1024

Direction = Literal["push", "pull", "bidirectional"]
ConflictPolicy = Literal["manual", "newest", "local", "remote"]
ActionKind = Literal["upload", "download", "delete_remote", "delete_local", "conflict"]

DIRECTIONS: tuple[Direction, ...] = ("push", "pull", "bidirectional")
CONFLICT_POLICIES: tuple[ConflictPolicy, ...] = ("manual", "newest", "local", "remote")


def _sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def _timestamp(value: float) -> str:
    """One instant, as manifests state them: UTC, milliseconds, `Z`."""
    return (
        datetime.fromtimestamp(value, timezone.utc)
        .isoformat(timespec="milliseconds")
        .replace("+00:00", "Z")
    )


@dataclass(frozen=True)
class FileEntry:
    """One file as a manifest describes it."""

    path: str
    size: int
    modified_at: str
    checksum: str
    blocks: tuple[str, ...]

    def to_dict(self) -> dict[str, Any]:
        return {
            "path": self.path,
            "size": self.size,
            "modified_at": self.modified_at,
            "checksum": self.checksum,
            "blocks": list(self.blocks),
        }

    @classmethod
    def from_dict(cls, value: Mapping[str, Any]) -> "FileEntry":
        return cls(
            path=normalize_object_path(str(value["path"])),
            size=int(value["size"]),
            modified_at=str(value.get("modified_at") or ""),
            checksum=str(value["checksum"]),
            blocks=tuple(str(block) for block in value.get("blocks") or ()),
        )

    def same_content(self, other: "FileEntry") -> bool:
        """
        Whether two entries hold the same bytes.

        The whole-file checksum decides; the timestamp does not. A file
        copied with its bytes intact but a new mtime is not a change.
        """
        return self.size == other.size and self.checksum == other.checksum


@dataclass
class Manifest:
    """
    What one side holds: its files, and what it deleted.

    Tombstones are the paths a side deleted, with when. They exist so that a
    file deleted on one side is not quietly brought back by the other on the
    next reconciliation — the reason deletion needs memory at all.
    """

    block_size: int = DEFAULT_BLOCK_SIZE
    entries: dict[str, FileEntry] = field(default_factory=dict)
    tombstones: dict[str, str] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return {
            "block_size": self.block_size,
            "entries": [self.entries[path].to_dict() for path in sorted(self.entries)],
            "tombstones": {
                path: self.tombstones[path] for path in sorted(self.tombstones)
            },
        }

    @classmethod
    def from_dict(cls, value: Mapping[str, Any] | None) -> "Manifest":
        if not value:
            return cls()
        entries = [FileEntry.from_dict(item) for item in value.get("entries") or ()]
        return cls(
            block_size=int(value.get("block_size") or DEFAULT_BLOCK_SIZE),
            entries={entry.path: entry for entry in entries},
            tombstones={
                normalize_object_path(str(path)): str(when)
                for path, when in (value.get("tombstones") or {}).items()
            },
        )


@dataclass(frozen=True)
class Action:
    """One thing a client must do to make the two sides agree."""

    kind: ActionKind
    path: str
    #: Why — the rule that produced it, so a person reading a plan can check it.
    reason: str
    #: For downloads: which blocks differ, so only those cross the network.
    blocks: tuple[int, ...] = ()

    def to_dict(self) -> dict[str, Any]:
        value: dict[str, Any] = {
            "kind": self.kind,
            "path": self.path,
            "reason": self.reason,
        }
        if self.blocks:
            value["blocks"] = list(self.blocks)
        return value


@dataclass(frozen=True)
class Plan:
    actions: tuple[Action, ...]

    def to_dict(self) -> dict[str, Any]:
        return {"actions": [action.to_dict() for action in self.actions]}

    def of(self, kind: ActionKind) -> list[Action]:
        return [action for action in self.actions if action.kind == kind]


def validate_block_size(value: int) -> int:
    if not isinstance(value, int) or not MIN_BLOCK_SIZE <= value <= MAX_BLOCK_SIZE:
        raise ValueError(
            f"block_size must be between {MIN_BLOCK_SIZE} and {MAX_BLOCK_SIZE} bytes"
        )
    return value


def hash_stream(
    stream: Any, block_size: int = DEFAULT_BLOCK_SIZE
) -> tuple[str, tuple[str, ...], int]:
    """
    Hash bytes once, producing the whole-file digest and every block's.

    Reads sequentially, so a file is hashed in a single pass whatever its
    size, and never held in memory.
    """
    validate_block_size(block_size)
    whole = hashlib.sha256()
    blocks: list[str] = []
    size = 0
    while True:
        block = stream.read(block_size)
        if not block:
            break
        whole.update(block)
        blocks.append(_sha256(block))
        size += len(block)
    return whole.hexdigest(), tuple(blocks), size


def hash_file(
    path: Path, relative: str, block_size: int = DEFAULT_BLOCK_SIZE
) -> FileEntry:
    stat = path.stat()
    with path.open("rb") as stream:
        checksum, blocks, size = hash_stream(stream, block_size)
    return FileEntry(
        path=normalize_object_path(relative),
        size=size,
        modified_at=_timestamp(stat.st_mtime),
        checksum=checksum,
        blocks=blocks,
    )


class Exclusions:
    """
    Gitignore-style patterns, applied before a manifest leaves the client.

    Deliberately the useful subset rather than the whole gitignore grammar:
    `*` and `?` globs, a trailing `/` for directories only, a leading `/` to
    anchor at the root, and a leading `!` to re-include. A pattern without a
    slash matches at any depth, the way gitignore does.
    """

    def __init__(self, patterns: Iterable[str] = ()) -> None:
        self._rules: list[tuple[bool, bool, bool, str]] = []
        for raw in patterns:
            pattern = raw.strip()
            if not pattern or pattern.startswith("#"):
                continue
            negated = pattern.startswith("!")
            if negated:
                pattern = pattern[1:]
            directory_only = pattern.endswith("/")
            pattern = pattern.rstrip("/")
            anchored = pattern.startswith("/")
            pattern = pattern.lstrip("/")
            if pattern:
                self._rules.append((negated, directory_only, anchored, pattern))

    @property
    def patterns(self) -> list[str]:
        return [
            f"{'!' if negated else ''}{'/' if anchored else ''}{pattern}{'/' if directory_only else ''}"
            for negated, directory_only, anchored, pattern in self._rules
        ]

    def excludes(self, relative: str, *, is_directory: bool) -> bool:
        """Whether a path is left out. The last matching rule decides."""
        posix = PurePosixPath(relative)
        decision = False
        for negated, directory_only, anchored, pattern in self._rules:
            if directory_only and not is_directory:
                continue
            if anchored:
                matched = fnmatch.fnmatchcase(str(posix), pattern)
            elif "/" in pattern:
                matched = fnmatch.fnmatchcase(str(posix), pattern) or any(
                    fnmatch.fnmatchcase(
                        str(PurePosixPath(*posix.parts[index:])), pattern
                    )
                    for index in range(1, len(posix.parts))
                )
            else:
                matched = any(
                    fnmatch.fnmatchcase(part, pattern) for part in posix.parts
                )
            if matched:
                decision = not negated
        return decision


def scan_directory(
    root: Path,
    *,
    exclusions: Exclusions | None = None,
    block_size: int = DEFAULT_BLOCK_SIZE,
    tombstones: Mapping[str, str] | None = None,
) -> Manifest:
    """
    Hash every file under a folder into a manifest.

    Exclusions are applied here, on the client, before anything is sent: an
    excluded file is not merely skipped by the transfer, it is absent from
    the manifest the other side ever sees.
    """
    root = Path(root)
    rules = exclusions or Exclusions()
    manifest = Manifest(block_size=block_size, tombstones=dict(tombstones or {}))
    for directory, directories, files in os.walk(root):
        current = Path(directory)
        relative_directory = current.relative_to(root).as_posix()
        # Prune excluded directories so their contents are never hashed.
        directories[:] = sorted(
            name
            for name in directories
            if not rules.excludes(
                f"{relative_directory}/{name}" if relative_directory != "." else name,
                is_directory=True,
            )
        )
        for name in sorted(files):
            relative = (
                f"{relative_directory}/{name}" if relative_directory != "." else name
            )
            if rules.excludes(relative, is_directory=False):
                continue
            path = current / name
            if not path.is_file() or path.is_symlink():
                # A symlink is a path, not content; following it could walk out.
                continue
            entry = hash_file(path, relative, block_size)
            manifest.entries[entry.path] = entry
    return manifest


def changed_blocks(local: FileEntry | None, remote: FileEntry) -> tuple[int, ...]:
    """Which blocks of `remote` a client lacks, given what it has."""
    if local is None or local.blocks == () or remote.blocks == ():
        return tuple(range(len(remote.blocks))) if remote.blocks else ()
    return tuple(
        index
        for index, block in enumerate(remote.blocks)
        if index >= len(local.blocks) or local.blocks[index] != block
    )


def _newer(left: FileEntry, right: FileEntry) -> bool:
    """
    Whether `left` wins under `newest`.

    Ties on the timestamp are broken by the checksum, lexically: the rule
    must pick the same side on every machine, and two clocks can agree to
    the millisecond.
    """
    if left.modified_at != right.modified_at:
        return left.modified_at > right.modified_at
    return left.checksum > right.checksum


def reconcile(
    local: Manifest,
    remote: Manifest,
    base: Manifest | None,
    *,
    direction: Direction,
    conflict_policy: ConflictPolicy = "manual",
    delete: bool = False,
) -> Plan:
    """
    Decide what has to happen for the two sides to agree.

    Three manifests: what the local side holds, what the remote holds, and
    what both agreed on last time (`base`). With a base, a difference can be
    attributed to the side that made it; without one, only agreement and
    disagreement are visible, and disagreement is a conflict in both
    directions.

    Every branch is deterministic in its inputs, and the actions come out in
    path order, so a plan is reproducible.
    """
    if direction not in DIRECTIONS:
        raise ValueError(f"direction must be one of {', '.join(DIRECTIONS)}")
    if conflict_policy not in CONFLICT_POLICIES:
        raise ValueError(
            f"conflict_policy must be one of {', '.join(CONFLICT_POLICIES)}"
        )
    base_entries = base.entries if base else {}
    base_tombstones = base.tombstones if base else {}
    actions: list[Action] = []
    paths = sorted(
        set(local.entries)
        | set(remote.entries)
        | set(local.tombstones)
        | set(remote.tombstones)
    )
    for path in paths:
        here = local.entries.get(path)
        there = remote.entries.get(path)
        before = base_entries.get(path)
        buried = path in base_tombstones

        if here is not None and there is not None:
            if here.same_content(there):
                continue
            local_changed = before is None or not before.same_content(here)
            remote_changed = before is None or not before.same_content(there)
            if direction == "push":
                actions.append(Action("upload", path, "push: local differs"))
            elif direction == "pull":
                actions.append(
                    Action(
                        "download",
                        path,
                        "pull: remote differs",
                        changed_blocks(here, there),
                    )
                )
            elif local_changed and not remote_changed:
                actions.append(Action("upload", path, "changed locally only"))
            elif remote_changed and not local_changed:
                actions.append(
                    Action(
                        "download",
                        path,
                        "changed remotely only",
                        changed_blocks(here, there),
                    )
                )
            else:
                actions.append(
                    _resolve(
                        path, here, there, conflict_policy, "changed on both sides"
                    )
                )
            continue

        if here is not None and there is None:
            # Present locally, absent remotely: created here, or deleted there.
            deleted_remotely = before is not None or path in remote.tombstones
            if deleted_remotely and delete and direction in ("pull", "bidirectional"):
                recreated = before is not None and not before.same_content(here)
                if recreated and direction == "bidirectional":
                    actions.append(
                        _resolve(
                            path,
                            here,
                            None,
                            conflict_policy,
                            "deleted remotely, changed locally",
                        )
                    )
                else:
                    actions.append(Action("delete_local", path, "deleted remotely"))
            elif direction in ("push", "bidirectional"):
                if deleted_remotely and not delete and direction == "bidirectional":
                    # Without --delete a remote deletion is not applied here,
                    # and the file is not pushed back either: doing so would
                    # undo a deletion nobody asked to propagate.
                    continue
                if buried and before is None and direction == "bidirectional":
                    # A tombstone from an earlier session and no record of
                    # the file since: it was re-created, and re-creation is a
                    # change.
                    actions.append(Action("upload", path, "re-created after deletion"))
                else:
                    actions.append(Action("upload", path, "missing remotely"))
            continue

        if here is None and there is not None:
            deleted_locally = before is not None or path in local.tombstones
            if deleted_locally and delete and direction in ("push", "bidirectional"):
                recreated = before is not None and not before.same_content(there)
                if recreated and direction == "bidirectional":
                    actions.append(
                        _resolve(
                            path,
                            None,
                            there,
                            conflict_policy,
                            "deleted locally, changed remotely",
                        )
                    )
                else:
                    actions.append(Action("delete_remote", path, "deleted locally"))
            elif direction in ("pull", "bidirectional"):
                if deleted_locally and not delete and direction == "bidirectional":
                    continue
                actions.append(
                    Action(
                        "download", path, "missing locally", changed_blocks(None, there)
                    )
                )
            continue
        # Absent on both sides: only tombstones remain, and there is nothing to do.
    return Plan(tuple(actions))


def _resolve(
    path: str,
    here: FileEntry | None,
    there: FileEntry | None,
    policy: ConflictPolicy,
    reason: str,
) -> Action:
    """Turn a disagreement into an action under the chosen policy."""
    if policy == "manual":
        return Action("conflict", path, reason)
    if policy == "local" or (
        policy == "newest"
        and (there is None or (here is not None and _newer(here, there)))
    ):
        if here is None:
            return Action("delete_remote", path, f"{reason}; {policy} wins")
        return Action("upload", path, f"{reason}; {policy} wins")
    if there is None:
        return Action("delete_local", path, f"{reason}; {policy} wins")
    return Action(
        "download", path, f"{reason}; {policy} wins", changed_blocks(here, there)
    )


def accepted_after(
    local: Manifest,
    remote: Manifest,
    plan: Plan,
    *,
    applied: Iterable[str],
) -> Manifest:
    """
    The manifest both sides agree on once the applied actions are done.

    Recorded as the base of the next reconciliation. Paths whose action was
    not applied — a conflict left for a person, an action that failed — keep
    whatever the previous base said, so the next plan sees them again.
    """
    done = set(applied)
    accepted = Manifest(block_size=remote.block_size)
    by_path = {action.path: action for action in plan.actions}
    for path in sorted(set(local.entries) | set(remote.entries)):
        action = by_path.get(path)
        if action is None:
            entry = remote.entries.get(path) or local.entries.get(path)
            if entry is not None:
                accepted.entries[path] = entry
            continue
        if path not in done:
            continue
        if action.kind == "upload":
            accepted.entries[path] = local.entries[path]
        elif action.kind == "download":
            accepted.entries[path] = remote.entries[path]
        elif action.kind in ("delete_remote", "delete_local"):
            accepted.tombstones[path] = _timestamp(
                datetime.now(timezone.utc).timestamp()
            )
    for path, when in {**local.tombstones, **remote.tombstones}.items():
        if path not in accepted.entries:
            accepted.tombstones.setdefault(path, when)
    return accepted
