# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

# Copyright (c) 2023-2026 Datalayer, Inc.
# Datalayer License

"""`contents.publish()`: a frame becomes a table other people can query."""

from __future__ import annotations

from typing import Any

import pyarrow as pa
import pyarrow.parquet as pq
import pytest

from datalayer_core.contents import Contents
from datalayer_core.mixins.contents import _as_arrow_table


class FakeResponse:
    def __init__(self, payload: dict[str, Any]) -> None:
        self._payload = payload
        self.headers: dict[str, str] = {}

    def json(self) -> dict[str, Any]:
        return self._payload


class FakeClient:
    """Records the calls, so the test can assert their order."""

    def __init__(self) -> None:
        self.calls: list[tuple[str, str, dict[str, Any]]] = []

    def _contents_url(self, path: str) -> str:
        return f"https://contents.example/api/contents/v1{path}"

    def _fetch(self, url: str, *, method: str, **options: Any) -> FakeResponse:
        self.calls.append((method, url.split("/v1", 1)[1], options))
        return FakeResponse({"relation": "sales", "parts": 1, "datasource": {}})



@pytest.fixture
def client() -> FakeClient:
    from datalayer_core.mixins.contents import ContentsMixin

    fake = FakeClient()
    fake.publish_table = ContentsMixin.publish_table.__get__(fake, FakeClient)
    return fake


def frame() -> pa.Table:
    return pa.table({"id": [1, 2, 3], "region": ["eu", "us", "eu"]})


def test_it_reserves_writes_and_completes_in_that_order(client: FakeClient) -> None:
    Contents(client).publish(frame(), name="sales")

    methods_and_paths = [(method, path) for method, path, _ in client.calls]
    # The order is the design: the record is created last, so a publication
    # whose bytes never arrived does not exist rather than existing broken.
    assert methods_and_paths == [
        ("POST", "/published-tables"),
        ("PUT", "/published-tables/sales/parts/part-00000.parquet"),
        ("POST", "/published-tables/sales/complete"),
    ]


def test_the_caller_never_names_a_path(client: FakeClient) -> None:
    Contents(client).publish(frame(), name="sales")

    reserve = client.calls[0][2]
    # A relation, and nothing else. The directory is derived from the
    # caller's own uid on the far side.
    assert reserve["json"] == {"relation": "sales"}


def test_a_large_frame_is_written_in_parts(client: FakeClient) -> None:
    big = pa.table({"id": list(range(10))})

    Contents(client).publish(big, name="sales", row_group_rows=4)

    parts = [path for method, path, _ in client.calls if method == "PUT"]
    # A frame worth publishing is one worth streaming: a single part would put
    # the whole thing in one request, which is what the shape exists to avoid.
    assert parts == [
        "/published-tables/sales/parts/part-00000.parquet",
        "/published-tables/sales/parts/part-00001.parquet",
        "/published-tables/sales/parts/part-00002.parquet",
    ]


def test_what_is_written_is_readable_parquet(client: FakeClient) -> None:
    Contents(client).publish(frame(), name="sales")

    (_method, _path, options) = client.calls[1]
    _name, payload = options["files"]["file"]
    read = pq.read_table(pa.BufferReader(payload))
    assert read.to_pylist() == frame().to_pylist()


def test_an_empty_frame_still_publishes_its_schema(client: FakeClient) -> None:
    empty = pa.table({"id": pa.array([], type=pa.int64())})

    Contents(client).publish(empty, name="sales")

    parts = [path for method, path, _ in client.calls if method == "PUT"]
    # A table with no rows is a table: its schema is what somebody queries
    # against, and publishing nothing at all would complete with no parts.
    assert len(parts) == 1


# --- What a caller may hand it -----------------------------------------------


def test_a_pyarrow_table_passes_through() -> None:
    assert _as_arrow_table(frame()) is not None


def test_a_pandas_frame_is_accepted() -> None:
    pandas = pytest.importorskip("pandas")
    converted = _as_arrow_table(pandas.DataFrame({"id": [1, 2]}))
    assert converted.num_rows == 2


def test_something_that_is_not_a_table_says_what_it_was() -> None:
    with pytest.raises(TypeError) as refused:
        _as_arrow_table(object())
    # The type name, because "cannot publish that" sends somebody looking at
    # the wrong thing.
    assert "object" in str(refused.value)


# --- Publishing live ---------------------------------------------------------


def test_live_still_writes_the_snapshot(client: FakeClient, monkeypatch) -> None:
    served: list[tuple[str, Any]] = []
    monkeypatch.setattr(
        Contents, "_serve_live", lambda self, name, table: served.append((name, table)) or True
    )

    result = Contents(client).publish(frame(), name="sales", live=True)

    # The snapshot is what queries fall back to once the sandbox stops, so it
    # is written either way — a live table must not vanish from under the
    # people using it.
    assert [(m, p) for m, p, _ in client.calls][0] == ("POST", "/published-tables")
    assert any(m == "PUT" for m, _p, _o in client.calls)
    assert result["live"] is True
    assert served[0][0] == "sales"


def test_a_callable_follows_the_name(client: FakeClient, monkeypatch) -> None:
    current = frame()
    monkeypatch.setattr(Contents, "_serve_live", lambda self, name, table: True)

    Contents(client).publish(lambda: current, name="sales", live=True)

    # The snapshot came from calling it once; the live half keeps the callable,
    # so a rebound name is followed rather than frozen.
    (_method, _path, options) = client.calls[1]
    _name, payload = options["files"]["file"]
    assert pq.read_table(pa.BufferReader(payload)).num_rows == 3


def test_a_sandbox_without_the_dataserver_still_publishes(client: FakeClient) -> None:
    # No `datalayer_dataservers` installed here. The snapshot succeeded, and
    # raising would lose a publication that worked.
    result = Contents(client).publish(frame(), name="sales", live=True)

    assert result["live"] in (True, False)
    assert any(m == "POST" and p.endswith("/complete") for m, p, _ in client.calls)


def test_a_snapshot_publication_serves_nothing_live(client: FakeClient, monkeypatch) -> None:
    called: list[str] = []
    monkeypatch.setattr(
        Contents, "_serve_live", lambda self, name, table: called.append(name) or True
    )

    result = Contents(client).publish(frame(), name="sales")

    assert called == []
    assert "live" not in result


def test_a_part_upload_is_not_labelled_json() -> None:
    """The header that made publishing fail on its first part.

    `fetch` defaulted every request to `Content-Type: application/json`. A
    multipart upload has to be described by `requests`, which writes
    `multipart/form-data` *with the boundary it generated*; overriding that
    hands the server a multipart body under a JSON content type, and FastAPI
    reports the form field as missing — true, and silent about why.

    Asserted on the headers rather than through a round trip, because the
    round trip is what took a live deployment to notice.
    """
    from datalayer_core.utils import network

    sent: dict = {}

    def record(url, **kwargs):
        sent.update(kwargs)

        class _Answer:
            status_code = 200

            def raise_for_status(self) -> None: ...

            def json(self) -> dict:
                return {}

        return _Answer()

    original = network.requests.put
    network.requests.put = record
    try:
        network.fetch("https://example.invalid/x", method="PUT", files={"file": ("p", b"x")})
        assert "Content-Type" not in sent["headers"], sent["headers"]
        network.fetch("https://example.invalid/x", method="PUT", json={"a": 1})
        assert sent["headers"]["Content-Type"] == "application/json"
    finally:
        network.requests.put = original
