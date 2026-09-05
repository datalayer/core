# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

from __future__ import annotations

from pathlib import Path
from types import SimpleNamespace
from typing import Any, Iterator, cast

import pytest

from datalayer_core.client import DatalayerClient
from datalayer_core.contents import Contents
from datalayer_core.models.contents.generated import ContentObject, ObjectList


def object_() -> ContentObject:
    return ContentObject.model_validate(
        {
            "uid": "01OBJECT000000000000000000",
            "source_uid": "01SOURCE000000000000000000",
            "path": "reports/earth.csv",
            "kind": "file",
            "size": 10,
            "media_type": "text/csv",
            "deleted": False,
            "created_by_uid": "01OWNER0000000000000000000",
            "created_at": "2026-08-24T12:00:00Z",
            "updated_at": "2026-08-24T12:00:00Z",
        }
    )


class Client:
    """A stand-in for the parts of `DatalayerClient` the facade actually calls."""

    def __init__(self) -> None:
        self.upload: tuple[str | Path, str, dict[str, Any]] | None = None

    def get_home_folder(self) -> object:
        return object()

    def list_home_folder_objects(self, **kwargs: Any) -> ObjectList:
        return ObjectList(items=[object_()], next_cursor=None)

    def stat_home_folder_object(self, path: str) -> ContentObject:
        return object_()

    def iter_home_folder_object(
        self, object_uid: str, **kwargs: Any
    ) -> Iterator[bytes]:
        yield b"earth"

    def upload_home_folder_file(
        self, local_path: str | Path, destination_path: str, **kwargs: Any
    ) -> object:
        self.upload = (local_path, destination_path, kwargs)
        return object()


def test_high_level_home_folder_browses_uploads_and_streams_downloads(
    tmp_path: Path,
) -> None:
    client = Client()
    folder = Contents(cast(DatalayerClient, client)).home_folder()
    local = tmp_path / "earth.csv"
    local.write_text("earth")

    listed = folder.list("reports")
    folder.upload(local, "/reports/earth.csv")
    chunks = list(folder.iter_download("/reports/earth.csv"))

    assert listed.items[0].path == "reports/earth.csv"
    assert client.upload is not None
    assert client.upload[1] == "reports/earth.csv"
    assert chunks == [b"earth"]


def mcp_call(uid: str, session_uid: str, tool: str, status: str, **overrides: Any) -> Any:
    """A call as the contract shapes it, with the fields a test cares about on top."""
    from datalayer_core.models.contents.mcp import McpCall

    record: dict[str, Any] = {
        "uid": uid,
        "session_uid": session_uid,
        "tool": tool,
        "arguments_redacted": {},
        "arguments_hash": "sha256:abc",
        "status": status,
        "created_at": "2026-08-26T10:00:00Z",
        "updated_at": "2026-08-26T10:00:00Z",
    }
    record.update(overrides)
    return McpCall.model_validate(record)


def query_record(**overrides: Any) -> Any:
    """A query as the contract shapes it, with the fields a test cares about on top."""
    from datalayer_core.models.contents.datasources import DatasourceQuery

    record: dict[str, Any] = {
        "uid": "01Q",
        "source_uid": DATASOURCE_UID,
        "actor_uid": "01HZZZZZZZZZZZZZZZZZZZZZZZ",
        "sql_hash": "h",
        "status": "pending",
        "row_limit": 1000,
        "max_bytes": 268435456,
        "max_seconds": 300,
        "policy_version": "3",
        "created_at": "2026-08-26T12:00:00Z",
    }
    record.update(overrides)
    return DatasourceQuery.model_validate(record)


def dataserver_status(state: str, **overrides: Any) -> Any:
    from datalayer_core.models.contents.datasources import DataServerStatus

    record: dict[str, Any] = {
        "state": state,
        "connectors": [],
        "lease_seconds": 90,
        "queue_depth": 0,
    }
    record.update(overrides)
    return DataServerStatus.model_validate(record)


class McpClient:
    """The parts of `DatalayerClient` the MCP facade calls, and nothing else."""

    def __init__(self) -> None:
        self.sessions = 0
        self.polls = 0
        self.calls: list[tuple[str, dict[str, Any], str | None]] = []

    def get_content_source(self, reference: str) -> object:
        from datalayer_core.mixins.contents import ConditionalCatalogSource
        from datalayer_core.models.contents.generated import CatalogSource

        if reference != "01MCPSRC000000000000000000":
            raise RuntimeError("not found")
        return ConditionalCatalogSource(
            CatalogSource.model_validate(
                {
                    "source": {
                        "contract_version": "v1",
                        "uid": reference,
                        "kind": "mcp",
                        "name": "earthdata",
                        "principal_uid": "01HZZZZZZZZZZZZZZZZZZZZZZZ",
                        "principal_kind": "user",
                        "configuration": {
                            "kind": "mcp",
                            "transport": "stdio",
                            "approval_policy": "explicit",
                            "destination_policy": "allowlist",
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

    def list_content_sources(self, **kwargs: Any) -> object:
        from datalayer_core.models.contents.generated import SourceList

        return SourceList(items=[self.get_content_source("01MCPSRC000000000000000000").value], next_cursor=None)  # type: ignore[attr-defined]

    def create_mcp_session(self, source_uid: str, **kwargs: Any) -> object:
        from datalayer_core.models.contents.mcp import McpSession

        self.sessions += 1
        return McpSession(
            uid="01SESSION",
            source_uid=source_uid,
            actor_uid="01HZZZZZZZZZZZZZZZZZZZZZZZ",
            allowed_tools=[],
            allowed_resources=[],
            allowed_domains=[],
            allowed_destinations=[],
            approval_policy="explicit",
            destination_policy="allowlist",
            max_result_bytes=67108864,
            status="active",
            created_at="2026-08-26T10:00:00Z",
            expires_at="2026-08-26T11:00:00Z",
        )

    def call_mcp_tool(
        self, session_uid: str, tool: str, arguments: Any, *, destination_uri: Any = None
    ) -> object:
        self.calls.append((tool, dict(arguments), destination_uri))
        return mcp_call("01CALL", session_uid, tool, "pending-approval", approval_uid="01APPROVAL")

    def get_mcp_call(self, session_uid: str, call_uid: str) -> object:
        self.polls += 1
        status = "running" if self.polls == 1 else "succeeded"
        return mcp_call(call_uid, session_uid, "t", status)


def test_mcp_facade_resolves_by_name_reuses_one_session_and_waits_for_a_call(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    import io

    monkeypatch.setattr("time.sleep", lambda seconds: None)
    client = McpClient()
    output = io.StringIO()
    source = Contents(cast(DatalayerClient, client)).mcp("earthdata")
    source._output = output

    pending = source.call("search_earth_datasets", search_keywords="sst", count=5)
    finished = source.call(
        "download_earth_data_granules",
        destination="home-folder:///earthdata",
        wait=True,
        short_name="MUR",
    )

    assert source.source_uid == "01MCPSRC000000000000000000"
    assert client.sessions == 1
    assert client.calls == [
        ("search_earth_datasets", {"search_keywords": "sst", "count": 5}, None),
        ("download_earth_data_granules", {"short_name": "MUR"}, "home-folder:///earthdata"),
    ]
    assert pending.status == "pending-approval"
    assert "approval 01APPROVAL" in output.getvalue()
    assert finished.status == "succeeded"
    assert client.polls == 2


def test_mcp_facade_refuses_a_source_that_is_not_an_mcp_server() -> None:
    client = Client()
    client.get_content_source = lambda reference: SimpleNamespace(  # type: ignore[attr-defined]
        value=SimpleNamespace(source=SimpleNamespace(kind="dataset", uid="x"))
    )

    with pytest.raises(LookupError, match="dataset source"):
        Contents(cast(DatalayerClient, client)).mcp("x")


# -- Datasources and Dataservers ----------------------------------------------


def catalog(kind: str, uid: str, name: str) -> Any:
    from datalayer_core.mixins.contents import ConditionalCatalogSource
    from datalayer_core.models.contents.generated import CatalogSource

    configuration = {
        "datasource": {"kind": "datasource", "connector_type": "bigquery"},
        "data-server": {
            "kind": "data-server",
            "registration_identity": "edge-1",
            "mtls_issuer": "datalayer-internal",
            "policy_version": "3",
        },
    }[kind]
    return ConditionalCatalogSource(
        CatalogSource.model_validate(
            {
                "source": {
                    "contract_version": "v1",
                    "uid": uid,
                    "kind": kind,
                    "name": name,
                    "principal_uid": "01HZZZZZZZZZZZZZZZZZZZZZZZ",
                    "principal_kind": "user",
                    "configuration": configuration,
                    "status": "ready",
                    "created_at": "2026-08-24T12:00:00Z",
                    "updated_at": "2026-08-24T12:00:00Z",
                },
                "permissions": {
                    "view": True, "update": True, "execute": True,
                    "effective_access_level": "execute", "is_owner": True,
                },
            }
        ),
        '"v1"',
    )


DATASOURCE_UID = "01DATASRC00000000000000000"
DATASERVER_UID = "01DATASRV00000000000000000"


class DataClient:
    """The parts of `DatalayerClient` the Datasource and Dataserver facades call."""

    def __init__(self) -> None:
        self.polls = 0
        self.submitted: list[tuple[str, str, dict[str, Any]]] = []
        self.saved: tuple[str, str, str] | None = None
        self.transitions: list[str] = []

    def get_content_source(self, reference: str) -> Any:
        if reference == DATASOURCE_UID:
            return catalog("datasource", reference, "earth-observation")
        if reference == DATASERVER_UID:
            return catalog("data-server", reference, "private-data")
        raise RuntimeError("not found")

    def list_content_sources(self, *, kind: str, **kwargs: Any) -> Any:
        from datalayer_core.models.contents.generated import SourceList

        uid = DATASOURCE_UID if kind == "datasource" else DATASERVER_UID
        return SourceList(items=[self.get_content_source(uid).value], next_cursor=None)

    def create_datasource_query(self, source_uid: str, sql: str, **kwargs: Any) -> Any:
        self.submitted.append((source_uid, sql, kwargs))
        return query_record(uid="01Q", source_uid=source_uid, status="pending")

    def get_datasource_query(self, query_uid: str) -> Any:
        self.polls += 1
        status = "running" if self.polls < 2 else "succeeded"
        return query_record(uid=query_uid, status=status, rows=2)

    def cancel_datasource_query(self, query_uid: str) -> Any:
        return query_record(uid=query_uid, status="cancelled")

    def iter_datasource_query_results(self, query_uid: str, **kwargs: Any) -> Iterator[bytes]:
        import pyarrow

        batch = pyarrow.record_batch({"id": [1, 2], "name": ["a", "b"]})
        sink = pyarrow.BufferOutputStream()
        with pyarrow.ipc.new_stream(sink, batch.schema) as writer:
            writer.write(batch)
        payload = sink.getvalue().to_pybytes()
        # Chunks cut anywhere, as a network would cut them.
        for start in range(0, len(payload), 7):
            yield payload[start : start + 7]

    def save_datasource_query(self, query_uid: str, *, dataset_uid: str, path: str) -> Any:
        self.saved = (query_uid, dataset_uid, path)
        return SimpleNamespace(uid="01REV", source_uid=dataset_uid)

    def get_dataserver_status(self, source_uid: str) -> Any:
        return dataserver_status(
            "ready",
            connectors=[{"connector_type": "sql", "operations": ["select"], "policy_version": "3"}],
        )

    def drain_dataserver(self, source_uid: str) -> Any:
        self.transitions.append("drain")
        return dataserver_status("draining")

    def resume_dataserver(self, source_uid: str) -> Any:
        self.transitions.append("resume")
        return dataserver_status("ready")

    def revoke_dataserver(self, source_uid: str) -> Any:
        self.transitions.append("revoke")
        return dataserver_status("revoked")


def test_datasource_facade_queries_waits_reads_batches_and_saves(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    pytest.importorskip("pyarrow")
    monkeypatch.setattr("time.sleep", lambda seconds: None)
    client = DataClient()
    source = Contents(cast(DatalayerClient, client)).datasource("earth-observation")

    query = source.query("SELECT * FROM observations", row_limit=1000)
    assert query.status == "pending"
    batches = list(query.to_arrow())
    frame = query.to_pandas()
    revision = query.save_as_dataset("01DATASET", "/results/observations.arrow")

    assert source.source_uid == DATASOURCE_UID
    assert client.submitted[0][1] == "SELECT * FROM observations"
    assert client.submitted[0][2]["row_limit"] == 1000
    # `to_arrow` waited for the query on its own; the poll count says so.
    assert query.status == "succeeded" and client.polls == 2
    assert [batch.num_rows for batch in batches] == [2]
    assert list(frame["name"]) == ["a", "b"]
    assert revision.uid == "01REV"
    assert client.saved == ("01Q", "01DATASET", "/results/observations.arrow")


def test_datasource_facade_refuses_to_read_a_query_that_did_not_succeed(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from datalayer_core.contents import QueryFailed

    monkeypatch.setattr("time.sleep", lambda seconds: None)
    client = DataClient()
    source = Contents(cast(DatalayerClient, client)).datasource(DATASOURCE_UID)
    query = source.query("SELECT 1").cancel()

    assert query.status == "cancelled"
    with pytest.raises(QueryFailed, match="cancelled"):
        list(query.to_arrow())


def test_dataserver_facade_reads_status_connectors_and_moves_state() -> None:
    client = DataClient()
    gateway = Contents(cast(DatalayerClient, client)).dataserver("private-data")

    assert gateway.source_uid == DATASERVER_UID
    assert gateway.status().state == "ready"
    assert [connector.connector_type for connector in gateway.connectors()] == ["sql"]
    assert gateway.drain().state == "draining"
    assert gateway.resume().state == "ready"
    assert gateway.revoke().state == "revoked"
    assert client.transitions == ["drain", "resume", "revoke"]


def test_facade_refuses_a_source_of_another_kind() -> None:
    client = DataClient()
    contents = Contents(cast(DatalayerClient, client))

    with pytest.raises(LookupError, match="data-server source, not a Datasource"):
        contents.datasource(DATASERVER_UID)
    with pytest.raises(LookupError, match="datasource source, not a Dataserver"):
        contents.dataserver(DATASOURCE_UID)
