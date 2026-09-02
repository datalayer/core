# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""
The person's end of a local bridge.

`datalayer contents mount` runs this: it attaches the folder to the sandbox
through Contents (an attachment with `delivery: local-bridge`, made on the
Home Folder), opens the bridge session, and then serves the folder — dialing
out to the relay with the client token, answering filesystem requests from a
`LocalRootServer`, heartbeating every thirty seconds so the session stays
alive and the token stays fresh, and reconnecting with backoff when the relay
drops. It stops when the session is revoked or expires, or when told to.

No listening port is opened on the person's machine; the relay is dialed,
never the other way round. The folder's path is never sent: the session is
opened with a fingerprint of it.
"""

from __future__ import annotations

import asyncio
import json
import logging
from dataclasses import dataclass
from pathlib import Path
from typing import Any, AsyncIterator, Callable, Iterable, Literal
from uuid import uuid4

from datalayer_core.contents_bridge_protocol import (
    BLOCK_SIZE,
    BridgeProtocolError,
    LocalRootServer,
    SecureChannel,
    fingerprint_local_root,
)
from datalayer_core.contents_sync_engine import Exclusions
from datalayer_core.mixins.contents import http_status_of

logger = logging.getLogger(__name__)

Progress = Callable[[str], None]
TERMINAL_STATES = frozenset({"revoked", "expired"})
#: Close codes from the relay after which dialing again is pointless: the
#: token does not verify, the bridge is bound elsewhere, the session is over.
FINAL_CLOSE_CODES = frozenset({4401, 4403, 4410})
#: The largest frame the relay will accept: one block, its header and its tag.
MAX_FRAME_BYTES = BLOCK_SIZE + 64 * 1024
#: The heartbeat answers Contents gives a session that is over.
ENDED_STATUSES = frozenset({404, 410})

__all__ = ["BridgeOutcome", "BridgeStopped", "LocalBridge"]


def _plain(value: Any) -> Any:
    """A generated model's enum as the string it stands for."""
    return getattr(value, "value", value)


@dataclass
class BridgeOutcome:
    """Why the local end stopped, as the command reports it."""

    bridge_uid: str
    attachment_uid: str
    state: str
    reason: str
    connections: int = 0
    requests: int = 0

    def to_dict(self) -> dict[str, Any]:
        return {
            "bridge_uid": self.bridge_uid,
            "attachment_uid": self.attachment_uid,
            "state": self.state,
            "reason": self.reason,
            "connections": self.connections,
            "requests": self.requests,
        }


class BridgeStopped(Exception):
    """The session is over; there is nothing to reconnect to."""

    def __init__(self, state: str, reason: str) -> None:
        super().__init__(reason)
        self.state = state
        self.reason = reason


async def _default_connect(url: str) -> Any:
    from websockets.asyncio.client import connect

    return connect(url, max_size=MAX_FRAME_BYTES, compression=None)


class LocalBridge:
    """
    Attach, open, serve. Driven by the CLI; testable with a fake relay.

    `connect(url)` is awaited and returns an async context manager yielding
    a connection with `send`, `recv` and async iteration — a `websockets`
    client by default, anything with that shape in tests.
    """

    def __init__(
        self,
        client: Any,
        *,
        local_root: Path,
        sandbox_uid: str,
        mount_path: str,
        mode: str = "ro",
        exclusions: Iterable[str] = (),
        sandbox_provider: str = "datalayer",
        progress: Progress | None = None,
        connect: Callable[[str], Any] | None = None,
        heartbeat_seconds: float = 30.0,
        initial_backoff_seconds: float = 1.0,
        maximum_backoff_seconds: float = 30.0,
    ) -> None:
        if mode not in ("ro", "rw"):
            raise ValueError("mode must be ro or rw")
        self.client = client
        self.root = Path(local_root)
        self.sandbox_uid = sandbox_uid
        self.mount_path = mount_path
        # Narrowed explicitly. The parameter stays `str` so a CLI can hand
        # over a raw flag value and get the `ValueError` above rather than a
        # type error; what is *stored* is one of two strings, and saying so
        # is what lets `LocalRootServer` be given it without a cast.
        self.mode: Literal["ro", "rw"] = "rw" if mode == "rw" else "ro"
        self.exclusions = Exclusions(exclusions)
        self.sandbox_provider = sandbox_provider
        self.progress = progress or (lambda message: None)
        self.connect = connect or _default_connect
        self.heartbeat_seconds = heartbeat_seconds
        self.initial_backoff_seconds = initial_backoff_seconds
        self.maximum_backoff_seconds = maximum_backoff_seconds
        self._stop = asyncio.Event()
        #: Set by the heartbeat when Contents says the session is over: the
        #: state and the reason the outcome reports instead of "stopped".
        self._ended: tuple[str, str] | None = None
        #: The freshest client token, renewed by every heartbeat.
        self._token: str | None = None
        self.attachment: Any = None
        self.opened: Any = None
        self.outcome: BridgeOutcome | None = None

    # -- control plane -------------------------------------------------------

    def attach(self) -> Any:
        """The attachment for this sandbox and path, found or made."""
        active = self.client.list_content_attachments(sandbox_uid=self.sandbox_uid, active=True)
        for item in active.items:
            if (
                _plain(item.delivery) == "local-bridge"
                and item.mount_path == self.mount_path
                and _plain(item.mode) == self.mode
            ):
                self.progress(f"Using the existing attachment {item.uid}")
                self.attachment = item
                return item
        home = self.client.get_home_folder()
        self.progress("Attaching the folder to the sandbox")
        self.attachment = self.client.create_content_attachment(
            {
                "source_uid": str(home.value.source.uid),
                "sandbox_uid": self.sandbox_uid,
                "sandbox_provider": self.sandbox_provider,
                "mode": self.mode,
                "mount_path": self.mount_path,
                "delivery": "local-bridge",
                "required": True,
                "cleanup_policy": "revoke",
            },
            idempotency_key=f"cli-mount-{uuid4()}",
        )
        return self.attachment

    def open(self) -> Any:
        """The bridge session: idempotent for the same folder."""
        if self.attachment is None:
            self.attach()
        self.progress("Opening the bridge session")
        self.opened = self.client.open_content_bridge(
            self.attachment.uid,
            {
                "local_root_fingerprint": fingerprint_local_root(self.root),
                "exclusions": list(self.exclusions.patterns),
            },
        )
        return self.opened

    def request_stop(self) -> None:
        self._stop.set()

    # -- data plane ----------------------------------------------------------

    async def run(self) -> BridgeOutcome:
        """Serve until the session ends or `request_stop` is called."""
        if self.opened is None:
            self.open()
        bridge_uid = str(self.opened.bridge.uid)
        server = LocalRootServer(self.root, mode=self.mode, exclusions=self.exclusions)
        outcome = BridgeOutcome(
            bridge_uid=bridge_uid,
            attachment_uid=str(self.attachment.uid),
            state=str(_plain(self.opened.bridge.state)),
            reason="",
        )
        self.outcome = outcome
        token = self.opened.client_token
        session_key = self.opened.session_key
        backoff = self.initial_backoff_seconds
        heartbeat = asyncio.create_task(self._heartbeat(bridge_uid))
        try:
            while not self._stop.is_set():
                try:
                    token = self._token or token
                    await self._serve_once(server, bridge_uid, token, session_key, outcome)
                    backoff = self.initial_backoff_seconds
                except BridgeStopped as stopped:
                    outcome.state, outcome.reason = stopped.state, stopped.reason
                    return outcome
                except Exception as error:  # noqa: BLE001 - the relay went away; try again
                    if self._stop.is_set():
                        break
                    received = getattr(error, "rcvd", None)
                    if getattr(received, "code", None) in FINAL_CLOSE_CODES:
                        outcome.state = "ended"
                        outcome.reason = getattr(received, "reason", "") or str(error)
                        return outcome
                    self.progress(f"Relay connection lost ({error}); reconnecting in {backoff:.0f}s")
                    try:
                        await asyncio.wait_for(self._stop.wait(), timeout=backoff)
                    except asyncio.TimeoutError:
                        pass
                    backoff = min(backoff * 2, self.maximum_backoff_seconds)
            if self._ended is not None:
                outcome.state, outcome.reason = self._ended
            else:
                outcome.state, outcome.reason = "stopped", "stopped by the person"
            return outcome
        finally:
            heartbeat.cancel()

    async def _serve_once(
        self,
        server: LocalRootServer,
        bridge_uid: str,
        token: str,
        session_key: str,
        outcome: BridgeOutcome,
    ) -> None:
        connection = await self.connect(self.opened.relay_url)
        async with connection as websocket:
            await websocket.send(json.dumps({"role": "client", "token": token}))
            accepted = json.loads(await websocket.recv())
            if accepted.get("event") != "accepted":
                raise BridgeStopped("refused", f"the relay did not accept the client: {accepted}")
            outcome.connections += 1
            outcome.state = "waiting"
            self.progress("Connected to the relay; waiting for the sandbox")
            channel: SecureChannel | None = None
            async for message in self._messages(websocket):
                if self._stop.is_set():
                    return
                if isinstance(message, str):
                    event = json.loads(message).get("event")
                    if event == "paired":
                        channel = SecureChannel(role="client", bridge_uid=bridge_uid, session_key=session_key)
                        await websocket.send(channel.hello())
                        outcome.state = "connected"
                        self.progress("Sandbox connected")
                    elif event == "peer-left":
                        channel = None
                        outcome.state = "waiting"
                        self.progress("Sandbox disconnected; waiting for it to come back")
                    continue
                if channel is None:
                    continue  # bytes before a pairing are nobody's
                if not channel.established:
                    channel.establish(bytes(message))
                    continue
                try:
                    response = server.handle(channel.open(bytes(message)))
                except BridgeProtocolError as error:
                    self.progress(f"Dropped a frame the channel could not open: {error}")
                    continue
                outcome.requests += 1
                await websocket.send(channel.seal(response))

    @staticmethod
    async def _messages(websocket: Any) -> AsyncIterator[Any]:
        async for message in websocket:
            yield message

    def _end(self, state: str, reason: str) -> None:
        self._ended = (state, reason)
        if self.outcome is not None:
            self.outcome.state, self.outcome.reason = state, reason
        self._stop.set()

    async def _heartbeat(self, bridge_uid: str) -> None:
        """Keep the session alive and the token fresh; stop when it is over."""
        while not self._stop.is_set():
            try:
                await asyncio.wait_for(self._stop.wait(), timeout=self.heartbeat_seconds)
                return
            except asyncio.TimeoutError:
                pass
            try:
                beat = await asyncio.to_thread(self.client.heartbeat_content_bridge, bridge_uid)
            except Exception as error:  # noqa: BLE001
                if http_status_of(error) in ENDED_STATUSES:
                    self._end("ended", f"the bridge session is over: {error}")
                    return
                self.progress(f"Heartbeat failed ({error}); will try again")
                continue
            self._token = beat.client_token
            state = str(_plain(beat.bridge.state))
            if state in TERMINAL_STATES:
                self._end(state, f"the bridge session is {state}")
                return

    def run_forever(self) -> BridgeOutcome:
        """`run`, on a loop of its own, until the session ends or Ctrl-C."""
        return asyncio.run(self._run_with_signals())

    async def _run_with_signals(self) -> BridgeOutcome:
        import signal

        loop = asyncio.get_running_loop()
        for signum in (signal.SIGINT, signal.SIGTERM):
            try:
                loop.add_signal_handler(signum, self.request_stop)
            except (NotImplementedError, RuntimeError):  # pragma: no cover - Windows
                pass
        return await self.run()
