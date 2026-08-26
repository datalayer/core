# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""
The person's end of a bridge, driven against a fake service and a fake relay.

The relay here is a script: it accepts the client, says the sandbox is
paired, does the key exchange the sandbox side would, asks the folder things
through the encrypted channel, and leaves. What these exercise is the
client's part: the attachment and session it makes without ever sending the
folder's path, the answers it gives, the heartbeat that renews its token and
stops it when the session is over, and the reconnect it attempts — or does
not — when the relay drops it.
"""

from __future__ import annotations

import asyncio
import json
from pathlib import Path
from types import SimpleNamespace
from typing import Any, AsyncIterator, Callable

import pytest
from typer.testing import CliRunner

import datalayer_core.cli.commands.contents as contents_commands
import datalayer_core.contents_bridge as contents_bridge
from datalayer_core.cli.__main__ import app
from datalayer_core.contents_bridge import LocalBridge
from datalayer_core.contents_bridge_protocol import (
    SecureChannel,
    decode_frame,
    encode_frame,
    fingerprint_local_root,
)
from datalayer_core.mixins.contents import ConditionalCatalogSource, http_status_of
from datalayer_core.models.contents.generated import (
    AttachmentList,
    BridgeHeartbeat,
    BridgeList,
    BridgeOpened,
    BridgeSession,
    CatalogSource,
    ContentAttachment,
)

OWNER = "01BX5ZZKBKACTAV9WEVGEMMVRZ"
HOME = "01ARZ3NDEKTSV4RRFFQ69G5FAV"
SANDBOX = "01B3TA5NDEKTSV4RRFFQ69G5FA"
ATTACHMENT = "01C3TA5NDEKTSV4RRFFQ69G5FA"
BRIDGE = "01BRIDGE00000000000000000"
KEY = "ab" * 32
RELAY = f"wss://relay.test/bridges/{BRIDGE}"
MOUNT_PATH = "/home/jovyan/local"


def folder(tmp_path: Path) -> Path:
    root = tmp_path / "work"
    (root / "docs").mkdir(parents=True)
    (root / "docs" / "notes.txt").write_text("hello, bridge")
    (root / "scratch.tmp").write_text("temporary")
    return root


def session(state: str = "pending", **overrides: Any) -> BridgeSession:
    value = {
        "uid": BRIDGE,
        "attachment_uid": ATTACHMENT,
        "sandbox_uid": SANDBOX,
        "owner_uid": OWNER,
        "mount_path": MOUNT_PATH,
        "mode": "ro",
        "local_root_fingerprint": "a" * 64,
        "exclusions": ["*.tmp"],
        "state": state,
        "client_seen_at": "2026-08-26T12:00:00Z",
        "mount_seen_at": None,
        "created_at": "2026-08-26T12:00:00Z",
        "updated_at": "2026-08-26T12:00:00Z",
        "expires_at": "2026-08-27T00:00:00Z",
        "revoked_at": None,
    }
    value.update(overrides)
    return BridgeSession.model_validate(value)


def attachment(mode: str = "ro", mount_path: str = MOUNT_PATH, delivery: str = "local-bridge") -> ContentAttachment:
    return ContentAttachment.model_validate(
        {
            "uid": ATTACHMENT,
            "source_uid": HOME,
            "sandbox_uid": SANDBOX,
            "sandbox_provider": "datalayer",
            "mode": mode,
            "mount_path": mount_path,
            "delivery": delivery,
            "required": True,
            "capabilities": [],
            "status": "requested",
            "limits": {},
            "created_at": "2026-08-26T12:00:00Z",
            "cleanup_policy": "revoke",
        }
    )


class BridgeClient:
    """Contents, as the client sees it: an attachment, a session, heartbeats."""

    last: "BridgeClient | None" = None

    def __init__(self, *, existing: list[ContentAttachment] | None = None, revoke_after: int = 2) -> None:
        BridgeClient.last = self
        self.existing = list(existing or [])
        self.revoke_after = revoke_after
        self.heartbeats = 0
        self.requests: list[dict[str, Any]] = []
        self.attachment_request: dict[str, Any] | None = None
        self.bridge_request: dict[str, Any] | None = None
        self.revoked: list[str] = []

    def list_content_attachments(self, **filters: Any) -> AttachmentList:
        return AttachmentList(items=list(self.existing))

    def get_home_folder(self) -> ConditionalCatalogSource:
        return ConditionalCatalogSource(
            CatalogSource.model_validate(
                {
                    "source": {
                        "contract_version": "v1",
                        "uid": HOME,
                        "kind": "files",
                        "name": "Home Folder",
                        "principal_uid": OWNER,
                        "principal_kind": "user",
                        "configuration": {
                            "kind": "files",
                            "owning_user_uid": OWNER,
                            "storage_backend_id": "users",
                            "quota_policy": "standard",
                            "versioning_policy": "retained",
                        },
                        "status": "ready",
                        "created_at": "2026-08-24T12:00:00Z",
                        "updated_at": "2026-08-24T12:00:00Z",
                    },
                    "permissions": {
                        "view": True,
                        "update": True,
                        "execute": True,
                        "effective_access_level": "execute",
                        "is_owner": True,
                    },
                }
            ),
            '"v1"',
        )

    def create_content_attachment(self, request: dict[str, Any], *, idempotency_key: str) -> ContentAttachment:
        self.attachment_request = request
        self.requests.append(request)
        return attachment(mode=request["mode"], mount_path=request["mount_path"])

    def open_content_bridge(self, attachment_uid: str, request: dict[str, Any]) -> BridgeOpened:
        assert attachment_uid == ATTACHMENT
        self.bridge_request = request
        self.requests.append(request)
        return BridgeOpened(bridge=session("pending"), client_token="token-1", relay_url=RELAY, session_key=KEY)

    def heartbeat_content_bridge(self, bridge_uid: str) -> BridgeHeartbeat:
        assert bridge_uid == BRIDGE
        self.heartbeats += 1
        state = "revoked" if self.heartbeats >= self.revoke_after else "connected"
        return BridgeHeartbeat(bridge=session(state), client_token=f"token-{self.heartbeats + 1}")

    def list_content_bridges(self, *, active: bool = False) -> BridgeList:
        return BridgeList(items=[session("connected", mount_seen_at="2026-08-26T12:00:30Z")])

    def revoke_content_bridge(self, bridge_uid: str) -> BridgeSession:
        self.revoked.append(bridge_uid)
        return session("revoked", revoked_at="2026-08-26T13:00:00Z")


class FakeConnection:
    """One dial of the relay, playing a script against the client."""

    def __init__(self, script: Callable[["FakeConnection"], AsyncIterator[Any]], url: str) -> None:
        self.script = script
        self.url = url
        self.sent: list[Any] = []
        self.answers: list[tuple[dict[str, Any], bytes]] = []

    async def __aenter__(self) -> "FakeConnection":
        return self

    async def __aexit__(self, *exc: Any) -> bool:
        return False

    async def send(self, message: Any) -> None:
        self.sent.append(message)

    async def recv(self) -> str:
        hello = json.loads(self.sent[0])
        assert hello["role"] == "client"
        self.token = hello["token"]
        return json.dumps({"event": "accepted", "role": "client", "bridge_uid": BRIDGE})

    def __aiter__(self) -> AsyncIterator[Any]:
        return self.script(self)


class FakeRelay:
    """The relay across reconnects: one script per dial, in order."""

    def __init__(self, *scripts: Callable[[FakeConnection], AsyncIterator[Any]]) -> None:
        self.scripts = list(scripts)
        self.connections: list[FakeConnection] = []

    async def connect(self, url: str) -> FakeConnection:
        script = self.scripts.pop(0) if len(self.scripts) > 1 else self.scripts[0]
        connection = FakeConnection(script, url)
        self.connections.append(connection)
        return connection


async def sandbox_asks(connection: FakeConnection) -> AsyncIterator[Any]:
    """The sandbox side: pair, exchange keys, ask, leave, then linger."""
    yield json.dumps({"event": "paired", "bridge_uid": BRIDGE})
    client_hello = connection.sent[-1]
    assert isinstance(client_hello, bytes) and len(client_hello) == 32
    mount = SecureChannel(role="mount", bridge_uid=BRIDGE, session_key=KEY)
    mount.establish(client_hello)
    yield mount.hello()
    requests = [
        ("stat", b"", {"path": "docs/notes.txt"}),
        ("read", b"", {"path": "docs/notes.txt", "offset": 0, "length": 5}),
        ("list", b"", {"path": ""}),
        ("write", b"x", {"path": "new.txt", "offset": 0}),
        ("stat", b"", {"path": "../outside"}),
    ]
    for number, (operation, payload, arguments) in enumerate(requests, start=1):
        yield mount.seal(encode_frame({"id": number, "op": operation, "args": arguments}, payload))
        connection.answers.append(decode_frame(mount.open(connection.sent[-1])))
    yield json.dumps({"event": "peer-left", "role": "mount"})
    # The relay keeps the connection up; the client leaves when told to.
    while True:
        await asyncio.sleep(0.01)
        yield json.dumps({"event": "keepalive"})


async def relay_drops(connection: FakeConnection) -> AsyncIterator[Any]:
    yield json.dumps({"event": "paired", "bridge_uid": BRIDGE})
    raise ConnectionError("the relay went away")


async def relay_refuses_for_good(connection: FakeConnection) -> AsyncIterator[Any]:
    error = ConnectionError("closed")
    error.rcvd = SimpleNamespace(code=4401, reason="token has expired")  # type: ignore[attr-defined]
    raise error
    yield  # pragma: no cover - makes this an async generator


def bridge_for(client: BridgeClient, root: Path, relay: FakeRelay, **overrides: Any) -> LocalBridge:
    arguments: dict[str, Any] = dict(
        local_root=root,
        sandbox_uid=SANDBOX,
        mount_path=MOUNT_PATH,
        mode="ro",
        exclusions=["*.tmp"],
        connect=relay.connect,
        heartbeat_seconds=0.05,
        initial_backoff_seconds=0.01,
        maximum_backoff_seconds=0.02,
    )
    arguments.update(overrides)
    return LocalBridge(client, **arguments)


def test_the_folder_is_attached_and_the_session_opened_without_its_path(tmp_path: Path) -> None:
    root = folder(tmp_path)
    client = BridgeClient()
    bridge = bridge_for(client, root, FakeRelay(sandbox_asks))

    opened = bridge.open()

    assert opened.bridge.uid == BRIDGE
    assert client.attachment_request == {
        "source_uid": HOME,
        "sandbox_uid": SANDBOX,
        "sandbox_provider": "datalayer",
        "mode": "ro",
        "mount_path": MOUNT_PATH,
        "delivery": "local-bridge",
        "required": True,
        "cleanup_policy": "revoke",
    }
    assert client.bridge_request == {
        "local_root_fingerprint": fingerprint_local_root(root),
        "exclusions": ["*.tmp"],
    }
    assert str(root) not in json.dumps(client.requests)
    assert "work" not in json.dumps(client.requests)


def test_an_existing_attachment_for_the_path_and_mode_is_reused(tmp_path: Path) -> None:
    root = folder(tmp_path)
    client = BridgeClient(existing=[attachment(mode="rw"), attachment(mode="ro")])
    bridge = bridge_for(client, root, FakeRelay(sandbox_asks))

    bridge.open()

    assert client.attachment_request is None
    assert bridge.attachment.mode == "ro"

    # A mount elsewhere, or a plain mount, is not this bridge's attachment.
    other = BridgeClient(existing=[attachment(mount_path="/home/jovyan/other"), attachment(delivery="mount")])
    bridge_for(other, root, FakeRelay(sandbox_asks)).open()
    assert other.attachment_request is not None


def test_the_folder_answers_the_sandbox_through_the_channel_until_revoked(tmp_path: Path) -> None:
    root = folder(tmp_path)
    client = BridgeClient(revoke_after=2)
    relay = FakeRelay(sandbox_asks)
    bridge = bridge_for(client, root, relay)

    outcome = asyncio.run(bridge.run())

    assert outcome.state == "revoked"
    assert outcome.reason == "the bridge session is revoked"
    assert outcome.connections == 1
    assert outcome.requests == 5
    assert outcome.bridge_uid == BRIDGE
    assert outcome.attachment_uid == ATTACHMENT
    assert client.heartbeats == 2
    [connection] = relay.connections
    assert connection.url == RELAY
    assert connection.token == "token-1"
    stat, read, listing, write, escape = connection.answers
    assert stat[0]["result"]["size"] == len("hello, bridge")
    assert stat[0]["result"]["kind"] == "file"
    assert read[1] == b"hello"
    assert [entry["name"] for entry in listing[0]["result"]["entries"]] == ["docs"]
    assert write[0]["error"]["code"] == "EROFS"
    assert escape[0]["error"]["code"] == "EACCES"
    assert not (root / "new.txt").exists()
    # Nothing the sandbox asked crossed the relay in the clear.
    for frame in connection.sent[2:]:
        if isinstance(frame, bytes):
            assert b"hello" not in frame and b"notes.txt" not in frame


def test_a_dropped_relay_is_dialled_again_with_the_renewed_token(tmp_path: Path) -> None:
    root = folder(tmp_path)
    client = BridgeClient(revoke_after=3)
    relay = FakeRelay(relay_drops, sandbox_asks)
    bridge = bridge_for(client, root, relay, heartbeat_seconds=0.03)
    progress: list[str] = []
    bridge.progress = progress.append

    outcome = asyncio.run(bridge.run())

    assert outcome.state == "revoked"
    assert outcome.connections == 2
    assert outcome.requests == 5
    assert len(relay.connections) == 2
    assert any("reconnecting" in message for message in progress)
    # The second dial presents whatever the heartbeat had renewed by then.
    assert relay.connections[1].token in {"token-1", "token-2", "token-3"}


def test_a_final_refusal_from_the_relay_is_not_retried(tmp_path: Path) -> None:
    root = folder(tmp_path)
    client = BridgeClient(revoke_after=100)
    relay = FakeRelay(relay_refuses_for_good)
    bridge = bridge_for(client, root, relay)

    outcome = asyncio.run(bridge.run())

    assert outcome.state == "ended"
    assert outcome.reason == "token has expired"
    assert len(relay.connections) == 1


def test_a_session_contents_no_longer_knows_stops_the_client(tmp_path: Path) -> None:
    root = folder(tmp_path)

    class Gone(BridgeClient):
        def heartbeat_content_bridge(self, bridge_uid: str) -> BridgeHeartbeat:
            raise RuntimeError(
                "Failed to request the URL https://contents.test/bridges (status=410, body={\"code\": \"BRIDGE_ENDED\"})"
            )

    client = Gone()
    bridge = bridge_for(client, root, FakeRelay(sandbox_asks))

    outcome = asyncio.run(bridge.run())

    assert outcome.state == "ended"
    assert "410" in outcome.reason


def test_the_status_of_a_transport_error_is_read_from_either_place() -> None:
    assert http_status_of(RuntimeError("Failed to request the URL x (status=404, body=nothing)")) == 404
    assert http_status_of(RuntimeError("no status here")) is None
    cause = Exception("410 Gone")
    cause.response = SimpleNamespace(status_code=410)  # type: ignore[attr-defined]
    caused = RuntimeError("wrapped, without the status in the message")
    caused.__cause__ = cause
    assert http_status_of(caused) == 410


def test_stopping_the_client_ends_the_run_as_stopped(tmp_path: Path) -> None:
    root = folder(tmp_path)
    client = BridgeClient(revoke_after=100)
    bridge = bridge_for(client, root, FakeRelay(sandbox_asks))

    async def run_then_stop() -> Any:
        task = asyncio.create_task(bridge.run())
        await asyncio.sleep(0.1)
        bridge.request_stop()
        return await task

    outcome = asyncio.run(run_then_stop())

    assert outcome.state == "stopped"
    assert outcome.requests == 5


def test_mount_mounts_and_unmount_commands(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    root = folder(tmp_path)
    monkeypatch.setattr(contents_commands, "DatalayerClient", BridgeClient)
    relay = FakeRelay(sandbox_asks)
    monkeypatch.setattr(contents_bridge, "_default_connect", relay.connect)
    # Wide enough that the table is not elided into ellipses.
    runner = CliRunner(env={"COLUMNS": "200"})

    mounted = runner.invoke(
        app,
        [
            "contents",
            "--output",
            "json",
            "mount",
            str(root),
            "--sandbox",
            SANDBOX,
            "--path",
            MOUNT_PATH,
            "--ro",
            "--exclude",
            "*.tmp",
            "--heartbeat-seconds",
            "0.05",
        ],
    )
    assert mounted.exit_code == 0, mounted.stdout
    outcome = json.loads(mounted.stdout)
    assert outcome["state"] == "revoked"
    assert outcome["requests"] == 5
    assert outcome["bridge_uid"] == BRIDGE
    client = BridgeClient.last
    assert client is not None
    assert client.attachment_request["mode"] == "ro"
    assert client.bridge_request["exclusions"] == ["*.tmp"]
    assert str(root) not in mounted.stdout

    listed = runner.invoke(app, ["contents", "--output", "json", "mounts"])
    assert listed.exit_code == 0, listed.stdout
    assert json.loads(listed.stdout)[0]["state"] == "connected"
    table = runner.invoke(app, ["contents", "mounts"])
    assert table.exit_code == 0, table.stdout
    assert "connected" in table.stdout and MOUNT_PATH in table.stdout

    unmounted = runner.invoke(app, ["contents", "--output", "json", "unmount", BRIDGE])
    assert unmounted.exit_code == 0, unmounted.stdout
    assert json.loads(unmounted.stdout)["state"] == "revoked"
    assert BridgeClient.last.revoked == [BRIDGE]

    missing = runner.invoke(app, ["contents", "mount", str(tmp_path / "nowhere"), "--sandbox", SANDBOX, "--path", MOUNT_PATH])
    assert missing.exit_code != 0
