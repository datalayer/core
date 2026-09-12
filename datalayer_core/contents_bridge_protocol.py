# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""
The filesystem protocol a local bridge speaks, end to end.

A bridge binds one folder of a person's computer to one path inside one
sandbox. The two ends never see each other: both dial out to a relay that
forwards frames between them and reads nothing but their length. What this
module gives each end is everything above the relay:

- an **encrypted channel** over the relay's frames, keyed by an X25519
  exchange the two ends do in their first frame each, mixed with a session
  key the relay was never handed, so the relay routes bytes it cannot read;
- a **request/response protocol** on that channel — `stat`, `list`, `read`,
  `write`, `mkdir`, `unlink`, `rmdir`, `rename`, `truncate` — with paths
  normalized by the same rules as synchronization and confined to the bound
  root, and with reads in the engine's block size;
- a `LocalRootServer` that answers those requests from a directory, which is
  what the CLI runs on the person's computer; and
- a `BridgeFileSystemClient` that asks them, which is what the sandbox side
  wraps in FUSE.

Nothing here touches the network: a transport is anything with `send` and
`recv`, and the relay's framing is the transport's business.
"""

from __future__ import annotations

import errno as errno_module
import hashlib
import json
import os
import stat as stat_module
import struct
import threading
import unicodedata
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Callable, Iterable, Iterator, Literal, Mapping, Protocol

from datalayer_core.contents_paths import normalize_object_path
from datalayer_core.contents_sync_engine import DEFAULT_BLOCK_SIZE, Exclusions

__all__ = [
    "BLOCK_SIZE",
    "OPERATIONS",
    "PROTOCOL_VERSION",
    "BridgeFileSystemClient",
    "BridgeProtocolError",
    "BridgeRemoteError",
    "LocalRootServer",
    "PipeTransport",
    "RootBinding",
    "SecureChannel",
    "Transport",
    "decode_frame",
    "encode_frame",
    "fingerprint_local_root",
]

PROTOCOL_VERSION = 1
#: A read never returns more than one block: the same unit synchronization
#: hashes and moves, so a client that caches by block sees the same boundaries
#: in both.
BLOCK_SIZE = DEFAULT_BLOCK_SIZE
OPERATIONS: tuple[str, ...] = (
    "ping",
    "stat",
    "list",
    "read",
    "write",
    "mkdir",
    "unlink",
    "rmdir",
    "rename",
    "truncate",
)
Role = Literal["client", "mount"]
Mode = Literal["ro", "rw"]

_HEADER = struct.Struct(">I")
_CHANNEL_INFO = b"datalayer-contents-bridge/v1/"
_NONCE_BYTES = 12
_KEY_BYTES = 32


class BridgeProtocolError(Exception):
    """A frame or a handshake that cannot be understood; the channel is over."""


class BridgeRemoteError(OSError):
    """The other end refused an operation, with a POSIX name for why.

    Raised on the client, so a FUSE layer can hand `errno` straight back to
    the kernel and a script can `except FileNotFoundError` as it would for a
    local file.
    """

    def __init__(self, code: str, message: str) -> None:
        number = getattr(errno_module, code, errno_module.EIO)
        super().__init__(number, message)
        self.code = code
        self.message = message

    def __str__(self) -> str:
        return f"{self.code}: {self.message}"


# -- frames --------------------------------------------------------------------


def encode_frame(header: Mapping[str, Any], payload: bytes = b"") -> bytes:
    """One frame: a length-prefixed JSON header and the raw bytes after it.

    Bytes travel beside the JSON rather than inside it, so a block read is a
    block of bytes on the wire and not four thirds of one in base64.
    """
    encoded = json.dumps(header, separators=(",", ":"), sort_keys=True).encode()
    return _HEADER.pack(len(encoded)) + encoded + bytes(payload)


def decode_frame(frame: bytes) -> tuple[dict[str, Any], bytes]:
    if len(frame) < _HEADER.size:
        raise BridgeProtocolError("frame is shorter than its header length")
    (length,) = _HEADER.unpack_from(frame)
    end = _HEADER.size + length
    if end > len(frame):
        raise BridgeProtocolError("frame header runs past the end of the frame")
    try:
        header = json.loads(frame[_HEADER.size : end].decode())
    except (UnicodeDecodeError, ValueError) as error:
        raise BridgeProtocolError("frame header is not JSON") from error
    if not isinstance(header, dict):
        raise BridgeProtocolError("frame header is not an object")
    return header, bytes(frame[end:])


# -- the encrypted channel -----------------------------------------------------


def _cryptography() -> Any:
    try:
        from cryptography.hazmat.primitives import hashes
        from cryptography.hazmat.primitives.asymmetric.x25519 import (
            X25519PrivateKey,
            X25519PublicKey,
        )
        from cryptography.hazmat.primitives.ciphers.aead import ChaCha20Poly1305
        from cryptography.hazmat.primitives.kdf.hkdf import HKDF
    except ImportError as error:  # pragma: no cover - environment-specific
        raise BridgeProtocolError(
            "the bridge channel needs the `cryptography` package for its "
            "X25519 exchange and ChaCha20-Poly1305 frames; install it"
        ) from error
    return hashes, X25519PrivateKey, X25519PublicKey, ChaCha20Poly1305, HKDF


class SecureChannel:
    """
    End-to-end encryption over frames a relay forwards but must not read.

    Each end sends its ephemeral X25519 public key as its first frame and
    derives, from the shared secret and the bridge's session key, one key per
    direction. The session key is minted by Contents and handed to each end
    on its own path — the client when it opens the bridge, the sandbox when
    the attachment is prepared — and never to the relay, so a relay that
    swapped public keys in flight would still derive nothing it can use.

    Frames are ChaCha20-Poly1305 with a per-direction counter as the nonce,
    checked on receipt: a replayed or reordered frame is refused rather than
    delivered.
    """

    def __init__(
        self, *, role: Role, bridge_uid: str, session_key: bytes | str = b""
    ) -> None:
        if role not in ("client", "mount"):
            raise ValueError("role must be client or mount")
        _, X25519PrivateKey, _, _, _ = _cryptography()
        self.role: Role = role
        self.bridge_uid = bridge_uid
        self._session_key = (
            bytes.fromhex(session_key) if isinstance(session_key, str) else bytes(session_key)
        )
        self._private = X25519PrivateKey.generate()
        self._send_key: bytes | None = None
        self._receive_key: bytes | None = None
        self._sent = 0
        self._received = 0
        self._lock = threading.Lock()

    @property
    def established(self) -> bool:
        return self._send_key is not None

    def hello(self) -> bytes:
        """The frame to send first: this end's public key."""
        from cryptography.hazmat.primitives import serialization

        return self._private.public_key().public_bytes(
            serialization.Encoding.Raw, serialization.PublicFormat.Raw
        )

    def establish(self, peer_hello: bytes) -> None:
        hashes, _, X25519PublicKey, _, HKDF = _cryptography()
        if len(peer_hello) != _KEY_BYTES:
            raise BridgeProtocolError("the peer's hello is not an X25519 public key")
        own = self.hello()
        shared = self._private.exchange(X25519PublicKey.from_public_bytes(peer_hello))
        # Both sides must agree on the salt whichever of them sent first.
        salt = hashlib.sha256(b"".join(sorted((own, peer_hello)))).digest()
        material = HKDF(
            algorithm=hashes.SHA256(),
            length=2 * _KEY_BYTES,
            salt=salt,
            info=_CHANNEL_INFO + self.bridge_uid.encode(),
        ).derive(shared + self._session_key)
        client_to_mount, mount_to_client = material[:_KEY_BYTES], material[_KEY_BYTES:]
        if self.role == "client":
            self._send_key, self._receive_key = client_to_mount, mount_to_client
        else:
            self._send_key, self._receive_key = mount_to_client, client_to_mount
        self._sent = self._received = 0

    def _aead(self, key: bytes) -> Any:
        _, _, _, ChaCha20Poly1305, _ = _cryptography()
        return ChaCha20Poly1305(key)

    def seal(self, plaintext: bytes) -> bytes:
        if self._send_key is None:
            raise BridgeProtocolError("the channel is not established")
        with self._lock:
            nonce = self._sent.to_bytes(_NONCE_BYTES, "big")
            self._sent += 1
        return nonce + self._aead(self._send_key).encrypt(
            nonce, bytes(plaintext), self.bridge_uid.encode()
        )

    def open(self, ciphertext: bytes) -> bytes:
        if self._receive_key is None:
            raise BridgeProtocolError("the channel is not established")
        if len(ciphertext) < _NONCE_BYTES + 16:
            raise BridgeProtocolError("frame is too short to carry a tag")
        nonce = bytes(ciphertext[:_NONCE_BYTES])
        with self._lock:
            expected = self._received.to_bytes(_NONCE_BYTES, "big")
            if nonce != expected:
                raise BridgeProtocolError("frame is out of order or replayed")
            self._received += 1
        try:
            return self._aead(self._receive_key).decrypt(
                nonce, bytes(ciphertext[_NONCE_BYTES:]), self.bridge_uid.encode()
            )
        except Exception as error:  # noqa: BLE001 - InvalidTag, whatever its module
            raise BridgeProtocolError("frame failed authentication") from error


# -- the bound root ------------------------------------------------------------


def fingerprint_local_root(root: str | os.PathLike[str]) -> str:
    """
    What the service is told about the folder: a digest, never the path.

    The absolute, symlink-resolved, NFC-normalized path is hashed, so the
    same folder fingerprints the same however it was spelled on the command
    line, and the service can tell two bridges of one folder apart from two
    folders without learning where either is.
    """
    resolved = os.path.realpath(os.path.abspath(os.fspath(root)))
    normalized = unicodedata.normalize("NFC", resolved)
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()


def _relative(path: str) -> str:
    """The path as the protocol names it: relative to the root, `""` for the root."""
    if not isinstance(path, str):
        raise BridgeRemoteError("EINVAL", "path must be a string")
    if "\x00" in path:
        raise BridgeRemoteError("EINVAL", "path contains NUL")
    collapsed = "/".join(part for part in path.split("/") if part not in ("", "."))
    if not collapsed:
        return ""
    try:
        return normalize_object_path(collapsed)
    except ValueError as error:
        # `..`, a backslash, an empty segment: names nothing inside the root.
        raise BridgeRemoteError("EACCES", f"path leaves the bound root: {error}") from error


class RootBinding:
    """
    One directory, and the rule that nothing outside it is reachable.

    Every path is normalized, joined to the root and resolved through
    symlinks; the result has to lie under the root's own resolved path. A
    `..` never gets that far — the normalizer refuses it — and a symlink
    inside the root that points outside resolves outside, which is refused
    the same way. Excluded paths are absent: not refused, absent, so a
    listing does not name a file a `stat` then fails to find.
    """

    def __init__(self, root: str | os.PathLike[str], exclusions: Exclusions | Iterable[str] | None = None) -> None:
        self.root = Path(os.path.realpath(os.path.abspath(os.fspath(root))))
        if not self.root.is_dir():
            raise NotADirectoryError(str(root))
        self.exclusions = (
            exclusions if isinstance(exclusions, Exclusions) else Exclusions(exclusions or ())
        )

    def resolve(self, path: str) -> tuple[Path, str]:
        """The local path a protocol path names, or `EACCES` if it names none."""
        relative = _relative(path)
        candidate = self.root.joinpath(*relative.split("/")) if relative else self.root
        real = Path(os.path.realpath(candidate))
        if real != self.root and self.root not in real.parents:
            raise BridgeRemoteError("EACCES", "path leaves the bound root")
        if relative and self.excluded(relative, real):
            raise BridgeRemoteError("ENOENT", "no such file or directory")
        return real, relative

    def excluded(self, relative: str, real: Path | None = None) -> bool:
        if not relative:
            return False
        is_directory = bool(real is not None and real.is_dir())
        # Any ancestor excluded excludes what is under it, as it would have
        # been pruned from a scan.
        parts = relative.split("/")
        for depth in range(1, len(parts) + 1):
            prefix = "/".join(parts[:depth])
            directory = depth < len(parts) or is_directory
            if self.exclusions.excludes(prefix, is_directory=directory):
                return True
        return False


# -- the server ----------------------------------------------------------------


def _entry(name: str, status: os.stat_result) -> dict[str, Any]:
    mode = status.st_mode
    if stat_module.S_ISDIR(mode):
        kind = "dir"
    elif stat_module.S_ISREG(mode):
        kind = "file"
    elif stat_module.S_ISLNK(mode):
        kind = "symlink"
    else:
        kind = "other"
    return {
        "name": name,
        "kind": kind,
        "size": int(status.st_size),
        "mtime": float(status.st_mtime),
        "mode": int(stat_module.S_IMODE(mode)),
    }


def _oserror_code(error: OSError) -> str:
    return errno_module.errorcode.get(error.errno or 0, "EIO")


class LocalRootServer:
    """
    Answers protocol requests from a directory on this machine.

    `handle` takes one plaintext request frame and returns one plaintext
    response frame; whoever owns the transport wraps them in the channel.
    It never raises for a request it can answer with an error — a bad path,
    a missing file, a write on a read-only bridge — because those are
    answers. It raises only for a frame that is not a request at all.
    """

    def __init__(
        self,
        root: str | os.PathLike[str],
        *,
        mode: Mode = "ro",
        exclusions: Exclusions | Iterable[str] | None = None,
        block_size: int = BLOCK_SIZE,
    ) -> None:
        if mode not in ("ro", "rw"):
            raise ValueError("mode must be ro or rw")
        self.binding = RootBinding(root, exclusions)
        self.mode: Mode = mode
        self.block_size = int(block_size)

    @property
    def root(self) -> Path:
        return self.binding.root

    def handle(self, frame: bytes) -> bytes:
        header, payload = decode_frame(frame)
        request_id = header.get("id")
        operation = header.get("op")
        arguments = header.get("args") or {}
        if not isinstance(arguments, dict):
            return encode_frame(
                {"id": request_id, "error": {"code": "EINVAL", "message": "args must be an object"}}
            )
        try:
            if operation not in OPERATIONS:
                raise BridgeRemoteError("ENOSYS", f"unknown operation: {operation!r}")
            result, out = getattr(self, f"_op_{operation}")(payload=payload, **arguments)
        except BridgeRemoteError as error:
            return encode_frame(
                {"id": request_id, "error": {"code": error.code, "message": error.message}}
            )
        except OSError as error:
            return encode_frame(
                {
                    "id": request_id,
                    "error": {"code": _oserror_code(error), "message": error.strerror or str(error)},
                }
            )
        except TypeError as error:
            # A wrong argument name or a missing one: the request is malformed.
            return encode_frame(
                {"id": request_id, "error": {"code": "EINVAL", "message": str(error)}}
            )
        return encode_frame({"id": request_id, "result": result}, out)

    # -- operations ------------------------------------------------------------

    def _writable(self) -> None:
        if self.mode != "rw":
            raise BridgeRemoteError("EROFS", "the bridge is read-only")

    def _op_ping(self, *, payload: bytes = b"") -> tuple[dict[str, Any], bytes]:
        return (
            {"protocol": PROTOCOL_VERSION, "mode": self.mode, "block_size": self.block_size},
            b"",
        )

    def _op_stat(self, *, path: str, payload: bytes = b"") -> tuple[dict[str, Any], bytes]:
        real, relative = self.binding.resolve(path)
        status = real.stat()
        return _entry(relative.rsplit("/", 1)[-1] if relative else "", status), b""

    def _op_list(self, *, path: str = "", payload: bytes = b"") -> tuple[dict[str, Any], bytes]:
        real, relative = self.binding.resolve(path)
        if not real.is_dir():
            raise BridgeRemoteError("ENOTDIR", "not a directory")
        entries = []
        for name in sorted(os.listdir(real)):
            child = real / name
            child_relative = f"{relative}/{name}" if relative else name
            try:
                status = child.lstat()
            except OSError:
                continue
            if self.binding.excluded(child_relative, child):
                continue
            if stat_module.S_ISLNK(status.st_mode):
                # A link is shown as what it points to when that stays inside
                # the root, and as a link otherwise: never as a way out.
                try:
                    target = Path(os.path.realpath(child))
                    if target == self.root or self.root in target.parents:
                        status = child.stat()
                except OSError:
                    pass
            entries.append(_entry(name, status))
        return {"entries": entries}, b""

    def _op_read(
        self, *, path: str, offset: int = 0, length: int | None = None, payload: bytes = b""
    ) -> tuple[dict[str, Any], bytes]:
        real, _ = self.binding.resolve(path)
        if real.is_dir():
            raise BridgeRemoteError("EISDIR", "is a directory")
        offset = int(offset)
        if offset < 0:
            raise BridgeRemoteError("EINVAL", "offset must not be negative")
        wanted = self.block_size if length is None else min(int(length), self.block_size)
        if wanted < 0:
            raise BridgeRemoteError("EINVAL", "length must not be negative")
        with real.open("rb") as stream:
            stream.seek(offset)
            data = stream.read(wanted)
        return {"offset": offset, "length": len(data), "eof": len(data) < wanted}, data

    def _op_write(
        self, *, path: str, offset: int = 0, truncate: bool = False, payload: bytes = b""
    ) -> tuple[dict[str, Any], bytes]:
        self._writable()
        real, _ = self.binding.resolve(path)
        if real.is_dir():
            raise BridgeRemoteError("EISDIR", "is a directory")
        offset = int(offset)
        if offset < 0:
            raise BridgeRemoteError("EINVAL", "offset must not be negative")
        if not real.parent.is_dir():
            raise BridgeRemoteError("ENOENT", "no such directory")
        with real.open("r+b" if real.exists() else "w+b") as stream:
            stream.seek(offset)
            stream.write(payload)
            if truncate:
                stream.truncate(offset + len(payload))
            stream.flush()
            size = os.fstat(stream.fileno()).st_size
        return {"written": len(payload), "size": int(size)}, b""

    def _op_mkdir(
        self, *, path: str, parents: bool = False, payload: bytes = b""
    ) -> tuple[dict[str, Any], bytes]:
        self._writable()
        real, relative = self.binding.resolve(path)
        if not relative:
            raise BridgeRemoteError("EEXIST", "the root exists")
        real.mkdir(parents=bool(parents), exist_ok=False)
        return {}, b""

    def _op_unlink(self, *, path: str, payload: bytes = b"") -> tuple[dict[str, Any], bytes]:
        self._writable()
        real, relative = self.binding.resolve(path)
        if not relative:
            raise BridgeRemoteError("EACCES", "the root cannot be removed")
        if real.is_dir() and not real.is_symlink():
            raise BridgeRemoteError("EISDIR", "is a directory")
        real.unlink()
        return {}, b""

    def _op_rmdir(self, *, path: str, payload: bytes = b"") -> tuple[dict[str, Any], bytes]:
        self._writable()
        real, relative = self.binding.resolve(path)
        if not relative:
            raise BridgeRemoteError("EACCES", "the root cannot be removed")
        if not real.is_dir():
            raise BridgeRemoteError("ENOTDIR", "not a directory")
        real.rmdir()
        return {}, b""

    def _op_rename(
        self, *, path: str, to: str, payload: bytes = b""
    ) -> tuple[dict[str, Any], bytes]:
        self._writable()
        source, source_relative = self.binding.resolve(path)
        target, target_relative = self.binding.resolve(to)
        if not source_relative or not target_relative:
            raise BridgeRemoteError("EACCES", "the root cannot be renamed")
        if not source.exists() and not source.is_symlink():
            raise BridgeRemoteError("ENOENT", "no such file or directory")
        os.replace(source, target)
        return {}, b""

    def _op_truncate(
        self, *, path: str, length: int = 0, payload: bytes = b""
    ) -> tuple[dict[str, Any], bytes]:
        self._writable()
        real, _ = self.binding.resolve(path)
        if real.is_dir():
            raise BridgeRemoteError("EISDIR", "is a directory")
        length = int(length)
        if length < 0:
            raise BridgeRemoteError("EINVAL", "length must not be negative")
        os.truncate(real, length)
        return {"size": length}, b""


# -- the client ----------------------------------------------------------------


class Transport(Protocol):
    """What the client needs from whatever carries its frames."""

    def send(self, frame: bytes) -> None: ...

    def recv(self) -> bytes: ...


@dataclass
class _Response:
    header: dict[str, Any]
    payload: bytes


class BridgeFileSystemClient:
    """
    Asks a `LocalRootServer` on the other end, through a transport.

    One request at a time, in order, under a lock: the channel's nonce
    counter demands it, and a FUSE layer that wants concurrency can open one
    client per worker. Every error the other end names is raised as a
    `BridgeRemoteError`, which is an `OSError` with the right `errno`.
    """

    def __init__(self, transport: Transport, *, channel: SecureChannel | None = None) -> None:
        self.transport = transport
        self.channel = channel
        self._next_id = 1
        self._lock = threading.Lock()
        self.block_size = BLOCK_SIZE

    def _call(self, operation: str, payload: bytes = b"", **arguments: Any) -> _Response:
        with self._lock:
            request_id = self._next_id
            self._next_id += 1
            frame = encode_frame({"id": request_id, "op": operation, "args": arguments}, payload)
            self.transport.send(self.channel.seal(frame) if self.channel else frame)
            raw = self.transport.recv()
            header, out = decode_frame(self.channel.open(raw) if self.channel else raw)
        if header.get("id") != request_id:
            raise BridgeProtocolError("response does not answer the request that was sent")
        error = header.get("error")
        if error:
            raise BridgeRemoteError(str(error.get("code") or "EIO"), str(error.get("message") or ""))
        return _Response(header.get("result") or {}, out)

    def ping(self) -> dict[str, Any]:
        result = self._call("ping").header
        self.block_size = int(result.get("block_size") or BLOCK_SIZE)
        return result

    def stat(self, path: str) -> dict[str, Any]:
        return self._call("stat", path=path).header

    def list(self, path: str = "") -> list[dict[str, Any]]:
        return list(self._call("list", path=path).header.get("entries") or [])

    def read(self, path: str, offset: int = 0, length: int | None = None) -> bytes:
        return self._call("read", path=path, offset=offset, length=length).payload

    def read_blocks(self, path: str, *, block_size: int | None = None) -> Iterator[bytes]:
        """The whole file, one block at a time, in the engine's block size."""
        size = block_size or self.block_size
        offset = 0
        while True:
            chunk = self.read(path, offset, size)
            if chunk:
                yield chunk
            if len(chunk) < size:
                return
            offset += len(chunk)

    def write(self, path: str, offset: int, data: bytes, *, truncate: bool = False) -> int:
        return int(self._call("write", data, path=path, offset=offset, truncate=truncate).header["written"])

    def mkdir(self, path: str, *, parents: bool = False) -> None:
        self._call("mkdir", path=path, parents=parents)

    def unlink(self, path: str) -> None:
        self._call("unlink", path=path)

    def rmdir(self, path: str) -> None:
        self._call("rmdir", path=path)

    def rename(self, path: str, to: str) -> None:
        self._call("rename", path=path, to=to)

    def truncate(self, path: str, length: int = 0) -> None:
        self._call("truncate", path=path, length=length)


class PipeTransport:
    """
    A transport whose other end is a function: the server, in the same process.

    What tests and the reference client use to speak to a `LocalRootServer`
    without a relay; the sandbox side substitutes a socket.
    """

    def __init__(self, answer: Callable[[bytes], bytes]) -> None:
        self._answer = answer
        self._pending: list[bytes] = []

    def send(self, frame: bytes) -> None:
        self._pending.append(self._answer(frame))

    def recv(self) -> bytes:
        return self._pending.pop(0)
