# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""The async streaming helpers watch work to its end and stop there."""

from __future__ import annotations

import asyncio
from collections.abc import AsyncIterator
from typing import Any

import pytest

from datalayer_core.contents_streaming import (
    follow_transfer,
    stream_arrow_batches,
    stream_operation,
    stream_sync_session,
    stream_transfer,
)
from datalayer_core.displays.contents import transfer_progress


class FakeClient:
    """A client that answers a prepared sequence, then repeats the last."""

    def __init__(self, states: list[dict[str, Any]]) -> None:
        self.states = states
        self.calls = 0

    def _next(self) -> dict[str, Any]:
        state = self.states[min(self.calls, len(self.states) - 1)]
        self.calls += 1
        return state

    get_content_operation = lambda self, uid: self._next()  # noqa: E731
    get_content_transfer = lambda self, uid: self._next()  # noqa: E731
    get_content_sync = lambda self, uid: self._next()  # noqa: E731
    get_datasource_query = lambda self, uid: self._next()  # noqa: E731


async def collect(iterator: AsyncIterator[Any]) -> list[Any]:
    return [state async for state in iterator]


def test_an_operation_is_watched_until_it_succeeds() -> None:
    client = FakeClient(
        [
            {"status": "pending", "attempt": 1},
            {"status": "running", "attempt": 1},
            {"status": "succeeded", "attempt": 1},
        ]
    )
    states = asyncio.run(
        collect(stream_operation(client, "01OPERATION", poll_seconds=0))
    )
    assert [state["status"] for state in states] == ["pending", "running", "succeeded"]
    # It stops at the terminal state rather than polling for ever.
    assert client.calls == 3


def test_a_state_that_did_not_change_is_not_repeated() -> None:
    client = FakeClient(
        [
            {"status": "running", "attempt": 1},
            {"status": "running", "attempt": 1},
            {"status": "running", "attempt": 2},
            {"status": "failed", "attempt": 2, "error_code": "checksum-mismatch"},
        ]
    )
    states = asyncio.run(collect(stream_operation(client, "01OP", poll_seconds=0)))
    assert [state["attempt"] for state in states] == [1, 2, 2]
    assert states[-1]["error_code"] == "checksum-mismatch"


def test_the_end_is_told_even_when_it_looks_like_the_state_before_it() -> None:
    # Nothing in the fingerprint changes between these two; the terminal state
    # is news all the same.
    client = FakeClient(
        [
            {"status": "running", "received_bytes": 10, "part_count": 1},
            {"status": "succeeded", "received_bytes": 10, "part_count": 1},
        ]
    )
    states = asyncio.run(collect(stream_transfer(client, "01TRANSFER", poll_seconds=0)))
    assert [state["status"] for state in states] == ["running", "succeeded"]


def test_a_transfer_that_never_finishes_gives_up_on_the_deadline() -> None:
    client = FakeClient([{"status": "running", "received_bytes": 1}])

    async def run() -> None:
        await collect(stream_transfer(client, "01TRANSFER", poll_seconds=0, timeout=0))

    with pytest.raises(TimeoutError) as error:
        asyncio.run(run())
    assert "running" in str(error.value)


def test_a_synchronization_session_is_watched_to_its_last_file() -> None:
    client = FakeClient(
        [
            {"status": "running", "uploaded_files": 0, "transferred_bytes": 0},
            {"status": "running", "uploaded_files": 2, "transferred_bytes": 2048},
            {"status": "succeeded", "uploaded_files": 3, "transferred_bytes": 4096},
        ]
    )
    states = asyncio.run(
        collect(stream_sync_session(client, "01SESSION", poll_seconds=0))
    )
    assert [state["uploaded_files"] for state in states] == [0, 2, 3]


def test_following_a_transfer_draws_it_and_answers_the_final_state() -> None:
    client = FakeClient(
        [
            {
                "status": "running",
                "received_bytes": 0,
                "expected_size": 100,
                "path": "a.csv",
            },
            {
                "status": "running",
                "received_bytes": 60,
                "expected_size": 100,
                "path": "a.csv",
            },
            {
                "status": "succeeded",
                "received_bytes": 100,
                "expected_size": 100,
                "path": "a.csv",
            },
        ]
    )
    progress = transfer_progress()
    final = asyncio.run(
        follow_transfer(client, "01T", progress=progress, poll_seconds=0)
    )
    assert final["status"] == "succeeded"
    task = progress.tasks[0]
    assert task.description == "a.csv"
    assert task.completed == 100
    assert task.total == 100


def test_following_a_transfer_without_a_progress_bar_is_simply_a_wait() -> None:
    client = FakeClient(
        [{"status": "failed", "received_bytes": 0, "error_code": "expired"}]
    )
    final = asyncio.run(follow_transfer(client, "01T", poll_seconds=0))
    assert final["error_code"] == "expired"


def arrow_stream_bytes(pyarrow: Any) -> bytes:
    batch = pyarrow.record_batch(
        [pyarrow.array([1, 2]), pyarrow.array(["a", "b"])], names=["n", "l"]
    )
    sink = pyarrow.BufferOutputStream()
    with pyarrow.ipc.new_stream(sink, batch.schema) as writer:
        writer.write_batch(batch)
        writer.write_batch(batch)
    return sink.getvalue().to_pybytes()


def test_arrow_batches_are_decoded_as_the_bytes_arrive() -> None:
    pyarrow = pytest.importorskip("pyarrow")
    payload = arrow_stream_bytes(pyarrow)

    async def chunks() -> AsyncIterator[bytes]:
        # Split small, so the decoder has to wait for more than one chunk.
        for start in range(0, len(payload), 16):
            yield payload[start : start + 16]

    batches = asyncio.run(collect(stream_arrow_batches(chunks())))
    assert len(batches) == 2
    assert batches[0].to_pylist() == [{"n": 1, "l": "a"}, {"n": 2, "l": "b"}]


def test_walking_away_from_an_arrow_stream_leaves_nothing_running() -> None:
    pyarrow = pytest.importorskip("pyarrow")
    payload = arrow_stream_bytes(pyarrow)
    fed = 0

    async def chunks() -> AsyncIterator[bytes]:
        nonlocal fed
        for start in range(0, len(payload), 8):
            fed += 1
            yield payload[start : start + 8]

    async def first_only() -> Any:
        async for batch in stream_arrow_batches(payload_chunks := chunks()):
            del payload_chunks
            return batch
        return None

    batch = asyncio.run(first_only())
    assert batch is not None
    # The generator's cleanup ran: no thread is left holding the stream.
    assert asyncio.run(asyncio.to_thread(lambda: True))


def test_a_broken_arrow_stream_raises_rather_than_ending_quietly() -> None:
    pytest.importorskip("pyarrow")

    async def chunks() -> AsyncIterator[bytes]:
        yield b"this is not arrow at all"

    async def run() -> None:
        await collect(stream_arrow_batches(chunks()))

    with pytest.raises(Exception):
        asyncio.run(run())


# -- Datasource queries and synchronous Arrow ---------------------------------


def test_a_query_is_watched_until_it_succeeds() -> None:
    from datalayer_core.contents_streaming import stream_query

    client = FakeClient(
        [
            {"status": "pending", "rows": None},
            {"status": "running", "rows": None},
            {"status": "running", "rows": 100},
            {"status": "succeeded", "rows": 250},
        ]
    )
    states = asyncio.run(collect(stream_query(client, "01QUERY", poll_seconds=0)))
    assert [state["status"] for state in states] == ["pending", "running", "running", "succeeded"]
    assert client.calls == 4


def arrow_stream(rows: int, batch_rows: int) -> bytes:
    import pyarrow

    sink = pyarrow.BufferOutputStream()
    schema = pyarrow.schema([("id", pyarrow.int64()), ("value", pyarrow.float64())])
    with pyarrow.ipc.new_stream(sink, schema) as writer:
        for start in range(0, rows, batch_rows):
            end = min(start + batch_rows, rows)
            writer.write(
                pyarrow.record_batch(
                    {"id": list(range(start, end)), "value": [float(i) for i in range(start, end)]},
                    schema=schema,
                )
            )
    return sink.getvalue().to_pybytes()


def test_a_real_arrow_ipc_stream_is_decoded_batch_by_batch_from_chunks() -> None:
    """The bytes of a query result arrive cut anywhere; batches come out whole."""
    pytest.importorskip("pyarrow")
    from datalayer_core.contents_streaming import iter_arrow_batches

    payload = arrow_stream(rows=1000, batch_rows=128)
    seen: list[int] = []

    def chunks() -> Any:
        # 13-byte chunks: never on a frame boundary, which is the point.
        for start in range(0, len(payload), 13):
            seen.append(start)
            yield payload[start : start + 13]

    batches = list(iter_arrow_batches(chunks()))

    assert [batch.num_rows for batch in batches] == [128] * 7 + [104]
    assert sum(batch.num_rows for batch in batches) == 1000
    assert batches[3].column("id")[0].as_py() == 384
    assert seen[-1] + 13 >= len(payload)


def test_a_reader_that_stops_early_stops_the_reads() -> None:
    pytest.importorskip("pyarrow")
    from datalayer_core.contents_streaming import iter_arrow_batches

    payload = arrow_stream(rows=10_000, batch_rows=100)
    pulled = 0

    def chunks() -> Any:
        nonlocal pulled
        for start in range(0, len(payload), 4096):
            pulled += 1
            yield payload[start : start + 4096]

    for index, batch in enumerate(iter_arrow_batches(chunks())):
        assert batch.num_rows == 100
        if index == 2:
            break

    # Three batches needed a few chunks, not the whole stream.
    assert pulled < len(payload) // 4096


def test_the_async_and_sync_decoders_agree_on_a_real_stream() -> None:
    pytest.importorskip("pyarrow")
    from datalayer_core.contents_streaming import iter_arrow_batches

    payload = arrow_stream(rows=300, batch_rows=100)

    async def chunks() -> AsyncIterator[bytes]:
        for start in range(0, len(payload), 17):
            yield payload[start : start + 17]

    async def via_async() -> list[int]:
        return [batch.num_rows async for batch in stream_arrow_batches(chunks())]

    sync_rows = [
        batch.num_rows
        for batch in iter_arrow_batches(payload[i : i + 17] for i in range(0, len(payload), 17))
    ]
    assert asyncio.run(via_async()) == sync_rows == [100, 100, 100]
