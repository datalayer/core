# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

# Copyright (c) 2023-2026 Datalayer, Inc.
# Datalayer License

"""`contents.publish()`: a frame becomes a table other people can query."""

from __future__ import annotations

from types import SimpleNamespace
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
    """Records the calls, so the test can assert their order.

    It also carries `urls` and `token`, which the real client has and the
    live-publishing path reads: without them the code under test raised an
    `AttributeError` that its own `except` swallowed, and the test watched a
    feature fail for a reason that exists nowhere but in this fake.
    """

    def __init__(self) -> None:
        self.calls: list[tuple[str, str, dict[str, Any]]] = []
        self.urls = SimpleNamespace(contents_url="https://contents.example")

    def _get_api_key(self) -> str:
        """What the real client calls to authenticate.

        Named exactly as the real one names it. The fake used to carry a
        `token` attribute instead — which the real `DatalayerClient` does not
        have — so the code under test read something that existed only here,
        and every real publication silently reported `live: False` while this
        file stayed green. A fake with an attribute the real object lacks
        cannot fail, and cannot be trusted.
        """
        return "the-owner-token"

    def _contents_url(self, path: str) -> str:
        return f"https://contents.example/api/contents/v1{path}"

    def _fetch(self, url: str, *, method: str, **options: Any) -> FakeResponse:
        path = url.split("/v1", 1)[1]
        self.calls.append((method, path, options))
        if path.endswith("/complete"):
            # Echo the live answerer back inside the Datasource, the way the
            # service does. `publish()` reports `live` from what Contents
            # *recorded*, not from what the sandbox attempted, so a double
            # that answered a fixed empty configuration would report every
            # live publication as a snapshot — and did.
            named = (options.get("json") or {}).get("live_server_uid")
            datasource = {"live_server_uid": named} if named else {}
            return FakeResponse({"relation": "sales", "parts": 1, "datasource": datasource})
        if path == "/published-tables":
            # The reservation, which is the only thing that knows the owner
            # uid — and the live connector's name has to be owner-scoped.
            return FakeResponse(
                {"relation": "sales", "owner_uid": "01OWNER", "directory": "/d", "first_part": "part-00000.parquet"}
            )
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
        Contents,
        "_serve_live",
        lambda self, name, table: served.append((name, table)) or "01LIVESERVER",
    )

    result = Contents(client).publish(frame(), name="sales", live=True)

    # The snapshot is what queries fall back to once the sandbox stops, so it
    # is written either way — a live table must not vanish from under the
    # people using it.
    assert [(m, p) for m, p, _ in client.calls][0] == ("POST", "/published-tables")
    assert any(m == "PUT" for m, _p, _o in client.calls)
    assert result["live"] is True
    # Owner-scoped, because that is the name Contents routes to. Registering
    # the bare relation would put a connector in the sandbox under a name no
    # job ever asks for — live, correct, and never reached.
    assert served[0][0] == "01OWNER.sales"


def test_a_callable_follows_the_name(client: FakeClient, monkeypatch) -> None:
    current = frame()
    monkeypatch.setattr(Contents, "_serve_live", lambda self, name, table: "01LIVESERVER")

    Contents(client).publish(lambda: current, name="sales", live=True)

    # The snapshot came from calling it once; the live half keeps the callable,
    # so a rebound name is followed rather than frozen.
    (_method, _path, options) = client.calls[1]
    _name, payload = options["files"]["file"]
    assert pq.read_table(pa.BufferReader(payload)).num_rows == 3


def test_a_sandbox_that_cannot_serve_live_publishes_and_says_so(client: FakeClient) -> None:
    """The snapshot succeeds; `live` reports what actually happened.

    This is the only test that runs the real `_serve_live` — the others
    monkeypatch it — and it used to assert `result["live"] in (True, False)`,
    which every possible answer satisfies. Behind that assertion,
    `_serve_live` returned `True` as soon as the package *imported*, while the
    server that would make the table reachable starts only where a runner has
    been configured, and nothing configures one. So `publish(live=True)`
    reported `live: True` for a table nothing was serving and nothing could
    route to.

    Whichever half is true of the process running this test — the package
    missing, or present with no runner — the answer is the same and it is
    `False`. There is no arrangement in which an unserved table may report
    itself served.
    """
    result = Contents(client).publish(frame(), name="sales", live=True)

    assert result["live"] is False
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


def test_a_query_says_which_answerer_served_it() -> None:
    """A published live table has two answerers, and the result says which.

    Read through the `Query` rather than off the record, because that is what
    the manual tells people to read — and the manual said so before this
    existed, which would have been a documented attribute that raises.
    """
    from types import SimpleNamespace

    from datalayer_core.contents import Query

    live = Query(None, SimpleNamespace(answered="live", answered_reason="the sandbox holding this table was up"))
    assert live.answered == "live"
    assert "up" in live.answered_reason

    # A snapshot-only table was never a choice, and says nothing rather than
    # reporting a decision nobody made.
    plain = Query(None, SimpleNamespace())
    assert plain.answered is None
    assert plain.answered_reason is None


def test_publishing_live_installs_the_runner_factory(monkeypatch, client: FakeClient) -> None:
    """The seam that was missing, checked from the side that fills it.

    `live_server` starts its Data Server through a `runner_factory`, and
    nothing constructed one — so a live table was filed in a process-local
    registry that nothing could reach, and `publish(live=True)` said `True`.
    Every test of `live_server` supplies its own factory, so its absence was
    invisible from that side too: a collaborator always injected in tests and
    never provided in production.
    """
    from datalayer_dataservers.live_server import LiveTableServer

    server = LiveTableServer()
    monkeypatch.setattr("datalayer_dataservers.live_server.live_server", server)
    # The Data Server's own credential, which Datalayer gives a sandbox. A
    # sandbox without it cannot register and cannot serve live — checked by
    # the test below rather than treated as the normal case here.
    monkeypatch.setenv("DATALAYER_CONTENTS_DATASERVER_API_KEY", "the-service-key")

    assert server.runner_factory is None
    Contents(client).publish(frame(), name="sales", live=True)

    assert server.runner_factory is not None, (
        "publishing live left the server with no way to start, which is the "
        "state every live table was published into"
    )


def test_a_factory_that_cannot_be_built_does_not_lose_the_publication(
    monkeypatch, client: FakeClient
) -> None:
    """The snapshot is the thing that must survive.

    A sandbox that cannot reach Contents to register, or has no credentials to
    do it with, still published a table — and raising here would throw that
    away to make a point about the half that did not work.
    """
    from datalayer_dataservers.live_server import LiveTableServer

    server = LiveTableServer()
    monkeypatch.setattr("datalayer_dataservers.live_server.live_server", server)
    monkeypatch.setattr(
        "datalayer_dataservers.sandbox.runner_factory_for",
        lambda *a, **k: (_ for _ in ()).throw(RuntimeError("no credentials here")),
    )

    result = Contents(client).publish(frame(), name="sales", live=True)

    assert result["live"] is False
    assert any(m == "POST" and p.endswith("/complete") for m, p, _ in client.calls)


def test_the_fake_client_only_offers_what_the_real_one_offers() -> None:
    """The fake must not carry names the real client lacks.

    This is the failure that reached a cluster: the fake had a `token`
    attribute, `DatalayerClient` has `_get_api_key()`, and the code under test
    read `token`. Here it worked. There it raised `AttributeError`, was
    swallowed by the guard that keeps a publication alive, and reported
    `live: False` for every live publication anybody made — a silent, total
    failure of the feature, behind a green test file.

    So: every name the live-publishing path reads off the client must exist on
    the real class too. Checked against the class rather than an instance, so
    it needs no credentials and no network.
    """
    from datalayer_core.client import DatalayerClient

    for name in ("urls", "_get_api_key"):
        assert hasattr(FakeClient, name) or hasattr(FakeClient(), name), (
            f"the fake does not offer {name!r}"
        )
        assert hasattr(DatalayerClient, name), (
            f"the fake offers {name!r} and the real client does not — which is "
            "how a passing test hid a feature that never worked"
        )


def test_a_sandbox_without_the_service_credential_publishes_a_snapshot(
    monkeypatch, client: FakeClient
) -> None:
    """`register` speaks for the platform about which Data Servers exist.

    A person's token does not carry that scope, so a sandbox Datalayer did not
    provision cannot serve live. It publishes the snapshot and says `live:
    False` — the truthful answer — rather than registering something that would
    answer `401` on every heartbeat for as long as it ran.
    """
    from datalayer_dataservers.live_server import LiveTableServer

    server = LiveTableServer()
    monkeypatch.setattr("datalayer_dataservers.live_server.live_server", server)
    monkeypatch.delenv("DATALAYER_CONTENTS_DATASERVER_API_KEY", raising=False)

    result = Contents(client).publish(frame(), name="sales", live=True)

    assert result["live"] is False
    assert server.runner_factory is None
    assert any(m == "POST" and p.endswith("/complete") for m, p, _ in client.calls)
