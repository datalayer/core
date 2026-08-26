# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""
Async streaming helpers for Contents operations, transfers and Arrow.

Three things a caller waits on are long enough to want watching rather than
polling by hand: a durable operation, a transfer, a synchronization session.
Each helper here yields the state every time it changes and stops when the
work is over, so a caller writes a loop instead of a scheduler.

The client itself is synchronous — one request, one answer — so each call is
made on a worker thread and the waiting is done with `asyncio.sleep`. An async
caller keeps its event loop; a synchronous caller keeps its client.

`stream_arrow_batches` is the other direction: bytes arriving as an Arrow IPC
stream, decoded into record batches as they land, without holding the whole
result in memory. `iter_arrow_batches` is the same for a synchronous caller —
a notebook cell, a script — whose bytes come from a plain iterator. Both
import `pyarrow` only when called, so the package does not depend on it.
"""

from __future__ import annotations

import asyncio
import io
import queue
import threading
from collections.abc import AsyncIterator, Iterable, Iterator
from typing import Any, Protocol

__all__ = [
    "OPERATION_TERMINAL_STATUSES",
    "QUERY_TERMINAL_STATUSES",
    "SYNC_TERMINAL_STATUSES",
    "TRANSFER_TERMINAL_STATUSES",
    "follow_transfer",
    "iter_arrow_batches",
    "stream_arrow_batches",
    "stream_operation",
    "stream_query",
    "stream_sync_session",
    "stream_transfer",
]

# The states after which nothing more happens on its own. A caller that stops
# on these stops for good; anything else is still moving.
OPERATION_TERMINAL_STATUSES = frozenset({"succeeded", "failed", "cancelled"})
TRANSFER_TERMINAL_STATUSES = frozenset(
    {"succeeded", "completed", "failed", "cancelled", "expired"}
)
SYNC_TERMINAL_STATUSES = frozenset(
    {"succeeded", "completed", "partial", "failed", "cancelled", "client-lost"}
)
QUERY_TERMINAL_STATUSES = frozenset({"succeeded", "failed", "cancelled"})

_DEFAULT_POLL_SECONDS = 1.0


class _ContentsClient(Protocol):
    """What these helpers need of a client, and nothing more."""

    def get_content_operation(self, operation_uid: str) -> Any: ...
    def get_content_transfer(self, transfer_uid: str) -> Any: ...
    def get_content_sync(self, session_uid: str) -> Any: ...
    def get_datasource_query(self, query_uid: str) -> Any: ...


def _status(state: Any) -> str:
    value = (
        state.get("status")
        if isinstance(state, dict)
        else getattr(state, "status", None)
    )
    return str(value or "")


def _fingerprint(state: Any, fields: tuple[str, ...]) -> tuple[Any, ...]:
    """What counts as a change worth telling the caller about."""
    if isinstance(state, dict):
        return tuple(state.get(field) for field in fields)
    return tuple(getattr(state, field, None) for field in fields)


async def _stream(
    fetch: Any,
    *,
    terminal: frozenset[str],
    fields: tuple[str, ...],
    poll_seconds: float,
    timeout: float | None,
) -> AsyncIterator[Any]:
    """
    Poll one thing until it stops moving, yielding it whenever it changes.

    The first state is always yielded — a caller wants to know where it is
    starting from — and so is the terminal one, even when it looks the same as
    the state before it: the end is news.
    """
    loop = asyncio.get_running_loop()
    deadline = None if timeout is None else loop.time() + timeout
    previous: tuple[Any, ...] | None = None
    while True:
        state = await asyncio.to_thread(fetch)
        current = _fingerprint(state, fields)
        status = _status(state)
        if previous is None or current != previous or status in terminal:
            yield state
        previous = current
        if status in terminal:
            return
        if deadline is not None and loop.time() >= deadline:
            raise TimeoutError(
                f"Gave up waiting after {timeout:g}s; the last status was {status!r}."
            )
        await asyncio.sleep(poll_seconds)


async def stream_operation(
    client: _ContentsClient,
    operation_uid: str,
    *,
    poll_seconds: float = _DEFAULT_POLL_SECONDS,
    timeout: float | None = None,
) -> AsyncIterator[Any]:
    """Yield a durable operation every time it changes, until it is over."""
    async for state in _stream(
        lambda: client.get_content_operation(operation_uid),
        terminal=OPERATION_TERMINAL_STATUSES,
        fields=("status", "attempt", "error_code"),
        poll_seconds=poll_seconds,
        timeout=timeout,
    ):
        yield state


async def stream_transfer(
    client: _ContentsClient,
    transfer_uid: str,
    *,
    poll_seconds: float = _DEFAULT_POLL_SECONDS,
    timeout: float | None = None,
) -> AsyncIterator[Any]:
    """Yield a transfer every time it advances, until it is over."""
    async for state in _stream(
        lambda: client.get_content_transfer(transfer_uid),
        terminal=TRANSFER_TERMINAL_STATUSES,
        fields=("status", "received_bytes", "part_count"),
        poll_seconds=poll_seconds,
        timeout=timeout,
    ):
        yield state


async def stream_sync_session(
    client: _ContentsClient,
    session_uid: str,
    *,
    poll_seconds: float = _DEFAULT_POLL_SECONDS,
    timeout: float | None = None,
) -> AsyncIterator[Any]:
    """Yield a synchronization session every time it advances."""
    async for state in _stream(
        lambda: client.get_content_sync(session_uid),
        terminal=SYNC_TERMINAL_STATUSES,
        fields=(
            "status",
            "uploaded_files",
            "downloaded_files",
            "deleted_files",
            "transferred_bytes",
            "conflict_count",
        ),
        poll_seconds=poll_seconds,
        timeout=timeout,
    ):
        yield state


async def stream_query(
    client: _ContentsClient,
    query_uid: str,
    *,
    poll_seconds: float = _DEFAULT_POLL_SECONDS,
    timeout: float | None = None,
) -> AsyncIterator[Any]:
    """Yield a Datasource query every time it advances, until it is over."""
    async for state in _stream(
        lambda: client.get_datasource_query(query_uid),
        terminal=QUERY_TERMINAL_STATUSES,
        fields=("status", "rows", "bytes", "error"),
        poll_seconds=poll_seconds,
        timeout=timeout,
    ):
        yield state


async def follow_transfer(
    client: _ContentsClient,
    transfer_uid: str,
    *,
    progress: Any | None = None,
    description: str | None = None,
    poll_seconds: float = _DEFAULT_POLL_SECONDS,
    timeout: float | None = None,
) -> Any:
    """
    Watch a transfer to its end, drawing it on a Rich progress bar.

    Returns the final state, so the caller can tell success from failure
    without asking again. Without a `progress` it is simply a wait.
    """
    task_id = None
    final: Any = None
    async for state in stream_transfer(
        client, transfer_uid, poll_seconds=poll_seconds, timeout=timeout
    ):
        final = state
        if progress is None:
            continue
        total = (
            state.get("expected_size")
            if isinstance(state, dict)
            else getattr(state, "expected_size", None)
        )
        received = (
            state.get("received_bytes")
            if isinstance(state, dict)
            else getattr(state, "received_bytes", 0)
        )
        path = (
            state.get("path")
            if isinstance(state, dict)
            else getattr(state, "path", transfer_uid)
        )
        if task_id is None:
            task_id = progress.add_task(description or str(path), total=total)
        progress.update(task_id, completed=received or 0, total=total)
    return final


class _IteratorReader(io.RawIOBase):
    """A file over an iterator of chunks, for a decoder that wants `read`."""

    def __init__(self, chunks: Iterable[bytes]) -> None:
        self._chunks = iter(chunks)
        self._buffer = b""
        self._done = False

    def readable(self) -> bool:
        return True

    def readinto(self, target: Any) -> int:
        while not self._buffer and not self._done:
            try:
                self._buffer = next(self._chunks)
            except StopIteration:
                self._done = True
        if not self._buffer:
            return 0
        size = min(len(target), len(self._buffer))
        target[:size] = self._buffer[:size]
        self._buffer = self._buffer[size:]
        return size


def iter_arrow_batches(chunks: Iterable[bytes]) -> Iterator[Any]:
    """
    Decode an Arrow IPC byte stream into record batches, synchronously.

    `chunks` is what a streaming HTTP response gives — `iter_content`, say.
    Batches are yielded as the decoder finishes them and the bytes behind
    them are dropped, so a result larger than memory is still readable one
    batch at a time. A caller who stops early stops the reads with it.
    """
    try:
        import pyarrow.ipc as arrow_ipc
    except ImportError as error:  # pragma: no cover - depends on the caller's env
        raise RuntimeError(
            "Reading Arrow batches needs pyarrow: pip install pyarrow."
        ) from error

    # Buffered, because the reader asks for a whole frame at a time and the
    # iterator hands over whatever chunk arrived.
    source = io.BufferedReader(_IteratorReader(chunks))
    with arrow_ipc.open_stream(source) as reader:
        for batch in reader:
            yield batch


class _QueueReader(io.RawIOBase):
    """
    A blocking file over a queue of chunks, for a reader in a thread.

    It waits in slices rather than for ever: a caller who walks away from the
    stream sets `stop`, and the next slice ends the file instead of leaving a
    thread parked on a queue nobody will fill.
    """

    def __init__(
        self, chunks: queue.Queue[bytes | None], stop: threading.Event
    ) -> None:
        self._chunks = chunks
        self._stop = stop
        self._buffer = b""
        self._done = False

    def readable(self) -> bool:
        return True

    def readinto(self, target: Any) -> int:
        while not self._buffer and not self._done:
            if self._stop.is_set():
                self._done = True
                break
            try:
                chunk = self._chunks.get(timeout=0.1)
            except queue.Empty:
                continue
            if chunk is None:
                self._done = True
                break
            self._buffer = chunk
        if not self._buffer:
            return 0
        size = min(len(target), len(self._buffer))
        target[:size] = self._buffer[:size]
        self._buffer = self._buffer[size:]
        return size


async def stream_arrow_batches(
    chunks: AsyncIterator[bytes],
    *,
    buffer_size: int = 4,
) -> AsyncIterator[Any]:
    """
    Decode an Arrow IPC byte stream into record batches as they arrive.

    `chunks` is what an async HTTP response gives — `response.aiter_bytes()`,
    say. Batches are yielded as the decoder finishes them, so a result larger
    than memory is still readable one batch at a time.
    """
    try:
        import pyarrow.ipc as arrow_ipc
    except ImportError as error:  # pragma: no cover - depends on the caller's env
        raise RuntimeError(
            "Reading Arrow batches needs pyarrow: pip install pyarrow."
        ) from error

    byte_queue: queue.Queue[bytes | None] = queue.Queue(maxsize=buffer_size)
    batch_queue: queue.Queue[Any] = queue.Queue(maxsize=buffer_size)
    stop = threading.Event()
    done = object()

    def put(target: queue.Queue[Any], item: Any) -> bool:
        """Hand something over, giving up if the caller has walked away."""
        while not stop.is_set():
            try:
                target.put(item, timeout=0.1)
                return True
            except queue.Full:
                continue
        return False

    def decode() -> None:
        try:
            # Buffered, because the reader asks for a whole frame at a
            # time and a queue hands over whatever chunk arrived; the
            # buffer is what turns those chunks back into full reads.
            source = io.BufferedReader(_QueueReader(byte_queue, stop))
            with arrow_ipc.open_stream(source) as reader:
                for batch in reader:
                    if not put(batch_queue, batch):
                        return
        except Exception as error:  # surfaced to the caller below
            put(batch_queue, error)
        finally:
            put(batch_queue, done)

    async def feed() -> None:
        try:
            async for chunk in chunks:
                if stop.is_set():
                    return
                if chunk:
                    await asyncio.to_thread(put, byte_queue, chunk)
        finally:
            await asyncio.to_thread(put, byte_queue, None)

    feeder = asyncio.create_task(feed())
    decoder = asyncio.create_task(asyncio.to_thread(decode))
    try:
        while True:
            item = await asyncio.to_thread(batch_queue.get)
            if item is done:
                break
            if isinstance(item, Exception):
                raise item
            yield item
    finally:
        # A caller who stops early must leave nothing running: the flag ends
        # the decoder's file and frees both queues, and the tasks are waited
        # for so no thread outlives this call.
        stop.set()
        feeder.cancel()
        await asyncio.gather(feeder, decoder, return_exceptions=True)
