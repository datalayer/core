# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""
The bridge protocol: a root that cannot be left, a channel that cannot be read.

These are the properties the relay and the sandbox side build on. Each test
names the mutation it would catch: drop the realpath check and the symlink
test fails; skip the tag and the tampering test fails; forget `EROFS` and the
read-only test fails.
"""

from __future__ import annotations

import errno
import os
from pathlib import Path

import pytest

from datalayer_core.contents_bridge_protocol import (
    BLOCK_SIZE,
    BridgeFileSystemClient,
    BridgeProtocolError,
    BridgeRemoteError,
    LocalRootServer,
    PipeTransport,
    RootBinding,
    SecureChannel,
    decode_frame,
    encode_frame,
    fingerprint_local_root,
)


def folder(tmp_path: Path) -> Path:
    root = tmp_path / "root"
    (root / "docs").mkdir(parents=True)
    (root / "docs" / "notes.txt").write_text("hello, bridge")
    (root / "data.bin").write_bytes(bytes(range(256)) * 10)
    (root / "build").mkdir()
    (root / "build" / "out.o").write_bytes(b"object")
    outside = tmp_path / "outside"
    outside.mkdir()
    (outside / "secret.txt").write_text("not yours")
    os.symlink(outside / "secret.txt", root / "escape")
    os.symlink(outside, root / "escape-dir")
    os.symlink(root / "docs", root / "docs-link")
    return root


def client_for(server: LocalRootServer, *, encrypted: bool = False) -> BridgeFileSystemClient:
    if not encrypted:
        return BridgeFileSystemClient(PipeTransport(server.handle))
    client_channel = SecureChannel(role="client", bridge_uid="B1", session_key="ab" * 32)
    mount_channel = SecureChannel(role="mount", bridge_uid="B1", session_key="ab" * 32)
    client_channel.establish(mount_channel.hello())
    mount_channel.establish(client_channel.hello())
    # The "sandbox" holds the mount channel; the "computer" answers on the
    # client channel — the same pairing the relay produces.
    return BridgeFileSystemClient(
        PipeTransport(lambda frame: client_channel.seal(server.handle(client_channel.open(frame)))),
        channel=mount_channel,
    )


# -- frames --------------------------------------------------------------------


def test_a_frame_carries_its_header_and_bytes_apart() -> None:
    frame = encode_frame({"id": 1, "op": "read"}, b"\x00\x01binary")
    header, payload = decode_frame(frame)
    assert header == {"id": 1, "op": "read"}
    assert payload == b"\x00\x01binary"
    with pytest.raises(BridgeProtocolError):
        decode_frame(b"\x00\x00\x00\x10short")


# -- confinement ---------------------------------------------------------------


def test_dot_dot_never_reaches_the_filesystem(tmp_path: Path) -> None:
    client = client_for(LocalRootServer(folder(tmp_path)))
    for path in ("../outside/secret.txt", "docs/../../outside/secret.txt", "/../outside"):
        with pytest.raises(BridgeRemoteError) as refused:
            client.stat(path)
        assert refused.value.code == "EACCES"
        assert refused.value.errno == errno.EACCES


def test_a_symlink_out_of_the_root_is_refused_not_followed(tmp_path: Path) -> None:
    client = client_for(LocalRootServer(folder(tmp_path)))
    with pytest.raises(BridgeRemoteError) as refused:
        client.read("escape")
    assert refused.value.code == "EACCES"
    with pytest.raises(BridgeRemoteError) as refused:
        client.list("escape-dir")
    assert refused.value.code == "EACCES"
    with pytest.raises(BridgeRemoteError) as refused:
        client.stat("escape-dir/secret.txt")
    assert refused.value.code == "EACCES"
    # A link that stays inside the root is just a path.
    assert [e["name"] for e in client.list("docs-link")] == ["notes.txt"]


def test_a_listing_shows_an_escaping_link_as_a_link_and_nothing_behind_it(tmp_path: Path) -> None:
    client = client_for(LocalRootServer(folder(tmp_path)))
    entries = {e["name"]: e for e in client.list("")}
    assert entries["escape"]["kind"] == "symlink"
    assert entries["escape-dir"]["kind"] == "symlink"
    assert entries["docs-link"]["kind"] == "dir"
    assert entries["docs"]["kind"] == "dir"
    assert entries["data.bin"]["kind"] == "file"
    assert entries["data.bin"]["size"] == 2560


def test_the_binding_resolves_inside_and_refuses_outside(tmp_path: Path) -> None:
    binding = RootBinding(folder(tmp_path))
    real, relative = binding.resolve("/docs//./notes.txt")
    assert relative == "docs/notes.txt"
    assert real == binding.root / "docs" / "notes.txt"
    assert binding.resolve("/") == (binding.root, "")
    with pytest.raises(BridgeRemoteError):
        binding.resolve("docs\\notes.txt")
    with pytest.raises(BridgeRemoteError):
        binding.resolve("a\x00b")


def test_excluded_paths_are_absent_not_refused(tmp_path: Path) -> None:
    server = LocalRootServer(folder(tmp_path), exclusions=["build/", "*.bin"])
    client = client_for(server)
    names = [e["name"] for e in client.list("")]
    assert "build" not in names
    assert "data.bin" not in names
    assert "docs" in names
    for path in ("build/out.o", "data.bin", "build"):
        with pytest.raises(BridgeRemoteError) as refused:
            client.stat(path)
        assert refused.value.code == "ENOENT"


# -- modes -----------------------------------------------------------------------


def test_read_only_refuses_every_write_with_erofs(tmp_path: Path) -> None:
    root = folder(tmp_path)
    client = client_for(LocalRootServer(root, mode="ro"))
    attempts = [
        lambda: client.write("new.txt", 0, b"x"),
        lambda: client.mkdir("new"),
        lambda: client.unlink("data.bin"),
        lambda: client.rmdir("build"),
        lambda: client.rename("data.bin", "moved.bin"),
        lambda: client.truncate("data.bin", 0),
    ]
    for attempt in attempts:
        with pytest.raises(BridgeRemoteError) as refused:
            attempt()
        assert refused.value.code == "EROFS"
    assert (root / "data.bin").exists()
    assert not (root / "new.txt").exists()
    # Reading still works.
    assert client.read("docs/notes.txt") == b"hello, bridge"


def test_read_write_edits_the_folder_in_place(tmp_path: Path) -> None:
    root = folder(tmp_path)
    client = client_for(LocalRootServer(root, mode="rw"))
    client.mkdir("new")
    assert client.write("new/file.txt", 0, b"hello world") == 11
    client.write("new/file.txt", 6, b"bridge", truncate=True)
    assert (root / "new" / "file.txt").read_bytes() == b"hello bridge"
    client.truncate("new/file.txt", 5)
    assert (root / "new" / "file.txt").read_bytes() == b"hello"
    client.rename("new/file.txt", "new/renamed.txt")
    assert client.stat("new/renamed.txt")["size"] == 5
    client.unlink("new/renamed.txt")
    client.rmdir("new")
    assert not (root / "new").exists()
    with pytest.raises(BridgeRemoteError) as refused:
        client.unlink("docs")
    assert refused.value.code == "EISDIR"
    with pytest.raises(BridgeRemoteError) as refused:
        client.rmdir("docs")
    assert refused.value.code == "ENOTEMPTY"
    with pytest.raises(BridgeRemoteError) as refused:
        client.rename("docs/notes.txt", "../escaped.txt")
    assert refused.value.code == "EACCES"
    with pytest.raises(BridgeRemoteError) as refused:
        client.stat("nowhere")
    assert refused.value.code == "ENOENT"
    assert isinstance(refused.value, FileNotFoundError) or refused.value.errno == 2


# -- blocks ----------------------------------------------------------------------


def test_reads_are_capped_at_the_engine_block_size(tmp_path: Path) -> None:
    root = tmp_path / "big"
    root.mkdir()
    content = os.urandom(BLOCK_SIZE + 1000)
    (root / "big.bin").write_bytes(content)
    server = LocalRootServer(root)
    client = client_for(server)
    assert client.ping()["block_size"] == BLOCK_SIZE
    first = client.read("big.bin", 0, BLOCK_SIZE * 4)
    assert len(first) == BLOCK_SIZE
    assert first == content[:BLOCK_SIZE]
    rest = client.read("big.bin", BLOCK_SIZE, BLOCK_SIZE)
    assert rest == content[BLOCK_SIZE:]
    assert b"".join(client.read_blocks("big.bin")) == content
    assert [len(b) for b in client.read_blocks("big.bin", block_size=1024)][:2] == [1024, 1024]


# -- the channel ---------------------------------------------------------------


def test_the_channel_hides_the_frames_and_the_client_still_works(tmp_path: Path) -> None:
    client = client_for(LocalRootServer(folder(tmp_path)), encrypted=True)
    assert client.read("docs/notes.txt") == b"hello, bridge"
    assert client.stat("data.bin")["size"] == 2560


def test_a_tampered_or_replayed_frame_is_refused() -> None:
    left = SecureChannel(role="client", bridge_uid="B1", session_key="00" * 32)
    right = SecureChannel(role="mount", bridge_uid="B1", session_key="00" * 32)
    left.establish(right.hello())
    right.establish(left.hello())
    sealed = left.seal(b"stat /")
    assert b"stat" not in sealed
    assert right.open(sealed) == b"stat /"
    with pytest.raises(BridgeProtocolError):
        right.open(sealed)  # replay
    flipped = bytearray(left.seal(b"again"))
    flipped[-1] ^= 0x01
    with pytest.raises(BridgeProtocolError):
        right.open(bytes(flipped))


def test_a_relay_that_swaps_keys_learns_nothing_without_the_session_key() -> None:
    """The exchange is mixed with the session key; a man in the middle who
    lacks it derives a different key on each side and every frame fails."""
    honest_client = SecureChannel(role="client", bridge_uid="B1", session_key="11" * 32)
    honest_mount = SecureChannel(role="mount", bridge_uid="B1", session_key="11" * 32)
    relay_as_mount = SecureChannel(role="mount", bridge_uid="B1", session_key="")
    relay_as_client = SecureChannel(role="client", bridge_uid="B1", session_key="")
    honest_client.establish(relay_as_mount.hello())
    relay_as_mount.establish(honest_client.hello())
    honest_mount.establish(relay_as_client.hello())
    relay_as_client.establish(honest_mount.hello())
    with pytest.raises(BridgeProtocolError):
        relay_as_mount.open(honest_client.seal(b"list /"))
    with pytest.raises(BridgeProtocolError):
        honest_mount.open(relay_as_client.seal(b"list /"))


def test_a_channel_for_another_bridge_cannot_read_this_one() -> None:
    a = SecureChannel(role="client", bridge_uid="B1", session_key="22" * 32)
    b = SecureChannel(role="mount", bridge_uid="B2", session_key="22" * 32)
    a.establish(b.hello())
    b.establish(a.hello())
    with pytest.raises(BridgeProtocolError):
        b.open(a.seal(b"hello"))


# -- the fingerprint -------------------------------------------------------------


def test_the_fingerprint_names_the_folder_without_saying_where_it_is(tmp_path: Path) -> None:
    root = folder(tmp_path)
    spelled_twice = fingerprint_local_root(root), fingerprint_local_root(root / "docs" / "..")
    assert spelled_twice[0] == spelled_twice[1]
    assert len(spelled_twice[0]) == 64
    assert str(root) not in spelled_twice[0]
    assert fingerprint_local_root(root / "docs") != spelled_twice[0]
