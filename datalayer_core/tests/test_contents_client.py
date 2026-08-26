# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from datalayer_core.models.contents.datasources import is_query_terminal
from datalayer_core.models.contents.mcp import (
    call_artifacts,
    call_transfer_uids,
    is_call_terminal,
)
from datalayer_core.mixins.contents import ContentsMixin
from datalayer_core.models.contents.generated import (
    ContentAttachmentManifest,
    ContentSource,
)
from datalayer_core.utils.urls import DatalayerURLs

UID = "01ARZ3NDEKTSV4RRFFQ69G5FAV"
OWNER_UID = "01BX5ZZKBKACTAV9WEVGEMMVRZ"
CONTRACT_FIXTURES = (
    Path(__file__).parents[2] / "src/models/contents/__fixtures__/v1-contracts.json"
)


def source_response(name: str = "Dataset") -> dict[str, Any]:
    return {
        "source": {
            "contract_version": "v1",
            "uid": UID,
            "kind": "dataset",
            "name": name,
            "principal_uid": OWNER_UID,
            "principal_kind": "user",
            "configuration": {
                "kind": "dataset",
                "tags": [],
                "publication_eligible": False,
            },
            "capabilities": ["browse"],
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


class Response:
    def __init__(self, value: dict[str, Any], etag: str = '"v1.hash"') -> None:
        self._value = value
        self.headers = {"ETag": etag}

    def json(self) -> dict[str, Any]:
        return self._value


class Client(ContentsMixin):
    def __init__(self) -> None:
        self.urls = DatalayerURLs.from_environment(
            contents_url="https://contents.test",
            runtimes_url="https://runtimes.test",
        )
        self.calls: list[tuple[str, dict[str, Any]]] = []
        self.responses: list[Response] = []

    def _fetch(self, url: str, **kwargs: Any) -> Response:
        self.calls.append((url, kwargs))
        return self.responses.pop(0)


def test_contents_client_preserves_etag_for_conditional_mutation() -> None:
    client = Client()
    client.responses = [
        Response(source_response()),
        Response(source_response("Changed"), '"v1.next"'),
    ]

    fetched = client.get_content_source(UID)
    changed = client.update_content_source(UID, {"name": "Changed"}, etag=fetched.etag)

    assert fetched.value.source.status == "ready"
    assert changed.value.source.name == "Changed"
    assert changed.etag == '"v1.next"'
    assert client.calls[1][1]["headers"] == {"If-Match": '"v1.hash"'}
    assert client.calls[1][1]["json"] == {"name": "Changed"}


def test_contents_client_resolves_the_server_managed_home_folder() -> None:
    client = Client()
    client.responses = [Response(source_response("Home Folder"), '"folder.hash"')]

    folder = client.get_home_folder()

    assert folder.value.source.name == "Home Folder"
    assert folder.etag == '"folder.hash"'
    assert client.calls[0][0].endswith("/sources/home-folder")


def test_contents_client_creates_and_reads_attachment_manifest() -> None:
    attachment: dict[str, Any] = {
        "uid": "01C3TA5NDEKTSV4RRFFQ69G5FA",
        "source_uid": UID,
        "sandbox_uid": "01B3TA5NDEKTSV4RRFFQ69G5FA",
        "sandbox_provider": "datalayer",
        "mode": "rw",
        "mount_path": "/home/jovyan/volumes/work",
        "delivery": "mount",
        "required": True,
        "provider_resource_id": None,
        "capabilities": [],
        "status": "requested",
        "token_audience": None,
        "expires_at": None,
        "limits": {},
        "revoked_at": None,
        "created_at": "2026-08-24T12:00:00Z",
        "ready_at": None,
        "last_seen_at": None,
        "error": None,
        "cleanup_policy": "revoke",
    }
    client = Client()
    client.responses = [
        Response(attachment),
        Response(
            {
                "contract_version": "v1",
                "sandbox_uid": attachment["sandbox_uid"],
                "sandbox_provider": "datalayer",
                "generated_at": "2026-08-24T12:00:01Z",
                "attachments": [attachment],
            }
        ),
    ]

    created = client.create_content_attachment(
        {
            "source_uid": UID,
            "sandbox_uid": attachment["sandbox_uid"],
            "sandbox_provider": "datalayer",
            "mode": "rw",
            "mount_path": "/home/jovyan/volumes/work",
        },
        idempotency_key="attach-volume",
    )
    manifest = client.get_content_attachment_manifest(attachment["sandbox_uid"])

    assert created.mount_path == "/home/jovyan/volumes/work"
    assert manifest.attachments[0].uid == created.uid
    assert client.calls[0][1]["headers"] == {"Idempotency-Key": "attach-volume"}


def test_contents_client_browses_deletes_and_restores_home_folder_objects() -> None:
    object_value: dict[str, Any] = {
        "uid": "01OBJECT000000000000000000",
        "source_uid": UID,
        "path": "reports/earth.csv",
        "kind": "file",
        "current_version_uid": "01VERSION00000000000000000",
        "size": 42,
        "media_type": "text/csv",
        "checksum_algorithm": "sha256",
        "checksum": "abc123",
        "deleted": False,
        "created_by_uid": OWNER_UID,
        "created_at": "2026-08-24T12:00:00Z",
        "updated_at": "2026-08-24T12:00:01Z",
    }
    client = Client()
    client.responses = [
        Response({"items": [object_value], "next_cursor": "signed.cursor"}),
        Response({**object_value, "deleted": True}),
        Response(object_value),
    ]

    page = client.list_home_folder_objects(prefix="reports", limit=25)
    deleted = client.delete_home_folder_object(
        object_value["uid"], idempotency_key="delete-earth"
    )
    restored = client.restore_home_folder_object(
        object_value["uid"],
        object_value["current_version_uid"],
        idempotency_key="restore-earth",
    )

    assert page.items[0].path == "reports/earth.csv"
    assert page.next_cursor == "signed.cursor"
    assert deleted.deleted is True
    assert restored.deleted is False
    assert client.calls[1][1]["headers"] == {"Idempotency-Key": "delete-earth"}
    assert client.calls[2][1]["json"] == {"version_uid": "01VERSION00000000000000000"}


def test_contents_client_list_uses_signed_cursor_without_interpreting_it() -> None:
    client = Client()
    client.responses = [
        Response({"items": [source_response()], "next_cursor": "signed.cursor"})
    ]

    page = client.list_content_sources(
        kind="dataset", cursor="previous.cursor", limit=25
    )

    assert page.next_cursor == "signed.cursor"
    assert "kind=dataset" in client.calls[0][0]
    assert "cursor=previous.cursor" in client.calls[0][0]


def test_generated_models_validate_every_shared_v1_contract_fixture() -> None:
    fixtures = json.loads(CONTRACT_FIXTURES.read_text())

    assert len(fixtures["sources"]) == 8
    for source in fixtures["sources"]:
        ContentSource.model_validate(source)
    ContentAttachmentManifest.model_validate(fixtures["attachment_manifest"])


def test_contents_client_reads_and_cancels_operations() -> None:
    operation: dict[str, Any] = {
        "uid": UID,
        "operation_kind": "transfer",
        "source_uid": None,
        "status": "running",
        "attempt": 1,
        "max_attempts": 3,
        "cancellation_requested": False,
        "result": None,
        "error_code": None,
        "error_message": None,
        "created_at": "2026-08-24T12:00:00Z",
        "updated_at": "2026-08-24T12:00:10Z",
        "completed_at": None,
    }
    client = Client()
    client.responses = [
        Response(operation),
        Response({**operation, "cancellation_requested": True}),
    ]

    fetched = client.get_content_operation(UID)
    cancelled = client.cancel_content_operation(UID)

    assert fetched.operation_kind == "transfer"
    assert cancelled.cancellation_requested is True
    assert client.calls[1][0].endswith(f"/operations/{UID}/cancel")
    assert client.calls[1][1]["method"] == "POST"


def test_contents_client_captures_a_file_into_a_dataset_through_the_same_transfer(tmp_path: Path) -> None:
    """A Dataset destination is the Home Folder upload with another address."""
    local = tmp_path / "co2.csv"
    local.write_bytes(b"year,co2\n2024,422.5\n")
    transfer = {
        "uid": "01TRANSFER0000000000000000", "direction": "upload", "source_uid": "01DATASET00000000000000000",
        "source_uri": None, "destination_uri": "dataset://01DATASET00000000000000000/results/co2.csv",
        "path": "results/co2.csv", "media_type": "text/csv", "expected_size": 20, "expected_checksum": "a" * 64,
        "overwrite_policy": "reject", "status": "pending", "received_bytes": 0, "part_count": 0, "parts": [],
        "object_uid": None, "version_uid": None, "error_code": None, "error_message": None,
        "created_at": "2026-08-26T00:00:00Z", "updated_at": "2026-08-26T00:00:00Z", "completed_at": None,
    }
    client = Client()
    client.responses = [Response(transfer), Response(transfer), Response({**transfer, "status": "succeeded"})]

    result = client.upload_dataset_file(
        local, "01DATASET00000000000000000", "/results/co2.csv", idempotency_key="capture", media_type="text/csv",
    )

    assert result.status == "succeeded"
    created = client.calls[0][1]["json"]
    assert created["destination_uri"] == "dataset://01DATASET00000000000000000/results/co2.csv"
    assert created["size"] == 20
    assert [url.rsplit("/", 1)[1] for url, _ in client.calls if "/parts/" in url] == ["0"]


def test_contents_client_reads_environments_from_the_runtimes_service() -> None:
    """The content an Environment brings is the Runtimes service's to say,
    not the catalog's: both calls go there, and a missing selection reads as
    none rather than as an error."""
    client = Client()
    client.responses = [
        Response(
            {
                "success": True,
                "environments": [
                    {"name": "python-cpu-env", "title": "Python CPU"},
                    {
                        "name": "ai-env",
                        "title": "AI GPU",
                        "contents": [
                            {
                                "uid": UID,
                                "name": "sklearn-tutorial-content",
                                "mount": "/home/jovyan/tutorials",
                                "permissions": "ro",
                            }
                        ],
                    },
                ],
            }
        ),
        Response(
            {
                "environment": "ai-env",
                "provider": "e2b",
                "supported": False,
                "contents": [
                    {
                        "uid": UID,
                        "name": "sklearn-tutorial-content",
                        "type": "git",
                        "mount": "/home/jovyan/tutorials",
                        "permissions": "ro",
                        "revision": "4f3c2a1",
                        "sha256": "9b3f" * 16,
                        "status": "unsupported",
                        "detail": "e2b templates cannot check out a repository",
                    }
                ],
            }
        ),
    ]

    environments = client.list_environments()
    diagnostics = client.get_environment_contents("ai-env", "e2b")

    assert client.calls[0][0] == "https://runtimes.test/api/runtimes/v1/environments"
    assert client.calls[0][1]["method"] == "GET"
    assert environments[0]["contents"] == []
    assert environments[1]["contents"][0]["uid"] == UID
    assert (
        client.calls[1][0]
        == "https://runtimes.test/api/runtimes/v1/environments/ai-env/contents?provider=e2b"
    )
    assert diagnostics["supported"] is False
    assert diagnostics["contents"][0]["status"] == "unsupported"
    assert diagnostics["contents"][0]["revision"] == "4f3c2a1"


MCP_SOURCE = "01MCPSOURCE000000000000000"
SESSION_UID = "01MCPSESSION00000000000000"
CALL_UID = "01MCPCALL00000000000000000"
APPROVAL_UID = "01MCPAPPROVAL0000000000000"


def mcp_session() -> dict[str, Any]:
    return {
        "uid": SESSION_UID,
        "source_uid": MCP_SOURCE,
        "actor_uid": OWNER_UID,
        "sandbox_uid": None,
        "allowed_tools": ["search_earth_datasets"],
        "allowed_resources": [],
        "allowed_domains": ["earthdata.nasa.gov"],
        "allowed_destinations": ["home-folder:///earthdata"],
        "approval_policy": "explicit",
        "destination_policy": "allowlist",
        "max_result_bytes": 1048576,
        "status": "active",
        "created_at": "2026-08-26T10:00:00Z",
        "expires_at": "2026-08-26T11:00:00Z",
    }


def mcp_call(status: str, **extra: Any) -> dict[str, Any]:
    return {
        "uid": CALL_UID,
        "session_uid": SESSION_UID,
        "tool": "download_earth_data_granules",
        "arguments_redacted": {"short_name": "MUR", "folder_name": "[redacted]"},
        "arguments_hash": "sha256:abc",
        "destination_uri": "home-folder:///earthdata",
        "status": status,
        "created_at": "2026-08-26T10:00:00Z",
        "updated_at": "2026-08-26T10:00:00Z",
        **extra,
    }


def test_contents_client_discovers_and_tests_an_mcp_source() -> None:
    client = Client()
    client.responses = [
        Response(
            {
                "tools": [
                    {
                        "name": "search_earth_datasets",
                        "description": "Search datasets",
                        "input_schema": {
                            "type": "object",
                            "properties": {"search_keywords": {"type": "string"}},
                            "required": ["search_keywords"],
                        },
                    }
                ],
                "resources": [{"uri": "earthdata://catalog", "name": "Catalog"}],
                "discovered_at": "2026-08-26T10:00:00Z",
            }
        ),
        Response({"ok": False, "transport": "streamable-http", "detail": "refused"}),
    ]

    discovered = client.discover_mcp_tools(MCP_SOURCE)
    health = client.test_mcp_source(MCP_SOURCE)

    assert discovered.tools[0].name == "search_earth_datasets"
    assert discovered.tools[0].input_schema["properties"] == {
        "search_keywords": {"type": "string"}
    }
    assert discovered.resources[0].uri == "earthdata://catalog"
    assert health.ok is False and health.detail == "refused"
    assert client.calls[0][0].endswith(f"/sources/{MCP_SOURCE}/mcp/tools")
    assert client.calls[0][1]["method"] == "GET"
    assert client.calls[1][0].endswith(f"/sources/{MCP_SOURCE}/mcp/health")
    assert client.calls[1][1]["method"] == "POST"


def test_contents_client_opens_a_narrowed_session_and_calls_a_tool_through_it() -> None:
    client = Client()
    client.responses = [
        Response(mcp_session()),
        Response(mcp_call("pending-approval", approval_uid=APPROVAL_UID)),
        Response(
            mcp_call(
                "succeeded",
                result={
                    "content": [{"type": "text", "text": "2 granules"}],
                    "artifacts": [
                        {
                            "name": "a.nc",
                            "size": 1024,
                            "media_type": "application/x-netcdf",
                            "transfer_uid": "01TRANSFER000000000000000",
                        },
                        {"name": "b.nc", "object_uid": "01OBJECT00000000000000000"},
                    ],
                },
            )
        ),
        Response({**mcp_session(), "status": "revoked"}),
    ]

    session = client.create_mcp_session(
        MCP_SOURCE,
        tools=["search_earth_datasets"],
        expires_in=3600,
        idempotency_key="session-1",
    )
    pending = client.call_mcp_tool(
        session.uid,
        "download_earth_data_granules",
        {"short_name": "MUR", "bounding_box": [-4, 51, 9, 61], "mode": "manifest"},
        destination_uri="home-folder:///earthdata",
    )
    finished = client.get_mcp_call(session.uid, pending.uid)
    revoked = client.revoke_mcp_session(session.uid)

    assert session.allowed_tools == ["search_earth_datasets"]
    assert client.calls[0][0].endswith("/mcp-sessions")
    assert client.calls[0][1]["headers"] == {"Idempotency-Key": "session-1"}
    assert client.calls[0][1]["json"] == {
        "source_uid": MCP_SOURCE,
        "tools": ["search_earth_datasets"],
        "expires_in": 3600,
    }
    assert pending.status == "pending-approval"
    assert pending.approval_uid == APPROVAL_UID
    assert not is_call_terminal(pending)
    # The tool's arguments go over as typed, under the envelope's own keys.
    assert client.calls[1][0].endswith(f"/mcp-sessions/{SESSION_UID}/calls")
    assert client.calls[1][1]["json"] == {
        "tool": "download_earth_data_granules",
        "arguments": {
            "short_name": "MUR",
            "bounding_box": [-4, 51, 9, 61],
            "mode": "manifest",
        },
        "destination_uri": "home-folder:///earthdata",
    }
    assert is_call_terminal(finished)
    # A bulk acquisition is a Transfer, never bytes in the record.
    assert call_transfer_uids(finished) == ["01TRANSFER000000000000000"]
    assert call_artifacts(finished)[1].object_uid == "01OBJECT00000000000000000"
    assert client.calls[2][0].endswith(f"/mcp-sessions/{SESSION_UID}/calls/{CALL_UID}")
    assert revoked.status == "revoked"
    assert client.calls[3][1]["method"] == "DELETE"


def test_contents_client_lists_and_decides_mcp_approvals() -> None:
    approval = {
        "uid": APPROVAL_UID,
        "source_uid": MCP_SOURCE,
        "session_uid": SESSION_UID,
        "call_uid": CALL_UID,
        "actor_uid": OWNER_UID,
        "tool": "download_earth_data_granules",
        "arguments_hash": "sha256:abc",
        "arguments_redacted": {"short_name": "MUR"},
        "destination_uri": "home-folder:///earthdata",
        "status": "pending",
        "created_at": "2026-08-26T10:00:00Z",
        "expires_at": "2026-08-26T11:00:00Z",
    }
    client = Client()
    client.responses = [
        Response({"items": [approval]}),
        Response({**approval, "status": "approved", "decided_by": OWNER_UID}),
        Response({**approval, "status": "rejected", "note": "too large"}),
        Response({"items": [mcp_call("succeeded")]}),
        Response({"items": [mcp_session()]}),
    ]

    pending = client.list_mcp_approvals(status="pending")
    approved = client.approve_mcp_approval(APPROVAL_UID)
    rejected = client.reject_mcp_approval(APPROVAL_UID, note="too large")
    calls = client.list_mcp_calls(SESSION_UID)
    sessions = client.list_mcp_sessions()

    assert pending.items[0].call_uid == CALL_UID
    assert client.calls[0][0].endswith("/mcp-approvals?status=pending")
    assert approved.status == "approved"
    assert client.calls[1][0].endswith(f"/mcp-approvals/{APPROVAL_UID}/approve")
    assert client.calls[1][1]["json"] == {}
    assert rejected.note == "too large"
    assert client.calls[2][0].endswith(f"/mcp-approvals/{APPROVAL_UID}/reject")
    assert client.calls[2][1]["json"] == {"note": "too large"}
    assert calls.items[0].tool == "download_earth_data_granules"
    assert client.calls[3][0].endswith(f"/mcp-sessions/{SESSION_UID}/calls")
    assert sessions.items[0].uid == SESSION_UID
    assert client.calls[4][0].endswith("/mcp-sessions")


# -- Datasources and Dataservers ----------------------------------------------
#
# The endpoints are faked at the transport: what matters is the URL, the
# method, the body and the headers each method sends, and the model each
# answer becomes.

QUERY_UID = "01QUERY000000000000000000Q"


class StreamResponse(Response):
    """A streaming answer: chunks, as `requests` hands them over."""

    def __init__(self, chunks: list[bytes]) -> None:
        super().__init__({})
        self.chunks = chunks

    def iter_content(self, chunk_size: int = 1) -> Any:
        yield from self.chunks


def query_payload(status: str = "pending") -> dict[str, Any]:
    return {
        "uid": QUERY_UID,
        "source_uid": UID,
        "actor_uid": OWNER_UID,
        "sandbox_uid": None,
        "sql_hash": "sha256:abc",
        "status": status,
        "row_limit": 1000,
        "max_bytes": 268435456,
        "max_seconds": 60,
        "rows": 3 if status == "succeeded" else None,
        "bytes": 512 if status == "succeeded" else None,
        "result": {"object_uid": "01OBJ", "version_uid": "01VER", "checksum": "c", "media_type": "application/vnd.apache.arrow.stream"}
        if status == "succeeded"
        else None,
        "operation_uid": "01OP",
        "data_server_uid": None,
        "policy_version": "3",
        "error": None,
        "created_at": "2026-08-26T12:00:00Z",
        "started_at": None,
        "finished_at": None,
    }


def test_contents_client_tests_and_describes_a_datasource() -> None:
    client = Client()
    client.responses = [
        Response({"ok": True, "connector_type": "bigquery", "detail": "answered in 120ms"}),
        Response(
            {
                "tables": [{"name": "observations", "columns": [{"name": "id", "type": "int64"}]}],
                "discovered_at": "2026-08-26T12:00:00Z",
            }
        ),
        Response({"operations": ["select", "describe"], "streaming": True, "flight": True,
                  "https_fallback": True, "row_limit": 10000, "max_bytes": 268435456, "max_seconds": 60}),
    ]

    verdict = client.test_datasource(UID)
    schema = client.discover_datasource_schema(UID)
    capabilities = client.get_datasource_capabilities(UID)

    assert verdict.ok and verdict.connector_type == "bigquery"
    assert schema.tables[0].columns[0].type == "int64"
    assert capabilities.flight and capabilities.row_limit == 10000
    assert client.calls[0][0].endswith(f"/sources/{UID}/datasource/test")
    assert client.calls[0][1]["method"] == "POST"
    assert client.calls[1][0].endswith(f"/sources/{UID}/datasource/schema")
    assert client.calls[2][0].endswith(f"/sources/{UID}/datasource/capabilities")


def test_contents_client_runs_polls_streams_saves_and_tickets_a_query() -> None:
    client = Client()
    client.responses = [
        Response(query_payload("pending")),
        Response(query_payload("running")),
        Response(query_payload("cancelled")),
        StreamResponse([b"ARROW", b"BYTES"]),
        Response(
            {
                "uid": "01REV", "source_uid": "01DATASET", "actor_uid": OWNER_UID,
                "origin_kind": "datasource-query", "file_count": 1, "total_size": 512,
                "manifest_checksum": "m", "status": "ready",
                "created_at": "2026-08-26T12:00:00Z", "files": [],
            }
        ),
        Response({"ticket": "opaque", "expires_at": "2026-08-26T12:05:00Z",
                  "flight_endpoint": "grpc+tls://flight.example", "https_fallback_url": "https://x/y"}),
        Response({"items": [query_payload("succeeded")], "next_cursor": None}),
    ]

    submitted = client.create_datasource_query(
        UID, "SELECT 1", row_limit=1000, max_seconds=60, idempotency_key="k1"
    )
    polled = client.get_datasource_query(QUERY_UID)
    cancelled = client.cancel_datasource_query(QUERY_UID)
    chunks = list(client.iter_datasource_query_results(QUERY_UID, byte_range="bytes=0-9"))
    revision = client.save_datasource_query(QUERY_UID, dataset_uid="01DATASET", path="/results/a.arrow")
    ticket = client.create_datasource_query_ticket(QUERY_UID, sandbox_uid="01SBX", expires_in=300)
    history = client.list_datasource_queries(UID, limit=5)

    assert submitted.status == "pending" and not is_query_terminal(submitted)
    assert polled.status == "running"
    assert cancelled.status == "cancelled" and is_query_terminal(cancelled)
    assert chunks == [b"ARROW", b"BYTES"]
    assert revision.uid == "01REV"
    assert ticket.flight_endpoint == "grpc+tls://flight.example"
    assert history.items[0].status == "succeeded" and history.items[0].result is not None

    create_url, create_kwargs = client.calls[0]
    assert create_url.endswith(f"/sources/{UID}/queries")
    assert create_kwargs["json"] == {"sql": "SELECT 1", "row_limit": 1000, "max_seconds": 60}
    assert create_kwargs["headers"] == {"Idempotency-Key": "k1"}
    assert client.calls[1][0].endswith(f"/queries/{QUERY_UID}")
    assert client.calls[2][0].endswith(f"/queries/{QUERY_UID}/cancel")
    results_url, results_kwargs = client.calls[3]
    assert results_url.endswith(f"/queries/{QUERY_UID}/results")
    assert results_kwargs["headers"] == {"Range": "bytes=0-9"} and results_kwargs["stream"] is True
    save_url, save_kwargs = client.calls[4]
    assert save_url.endswith(f"/queries/{QUERY_UID}/save")
    # The path inside the Dataset is relative; a leading slash is not a path.
    assert save_kwargs["json"] == {"dataset_uid": "01DATASET", "path": "results/a.arrow"}
    assert client.calls[5][1]["json"] == {"sandbox_uid": "01SBX", "expires_in": 300}
    assert client.calls[6][0].endswith(f"/sources/{UID}/queries?limit=5")


def test_contents_client_reads_and_moves_a_dataserver() -> None:
    status = {
        "state": "ready",
        "last_heartbeat_at": "2026-08-26T12:00:00Z",
        "lease_seconds": 90,
        "connectors": [{"connector_type": "sql", "operations": ["select"], "policy_version": "3"}],
        "queue_depth": 2,
        "identity_serial": "1a2b",
        "identity_expires_at": "2026-12-01T00:00:00Z",
    }
    client = Client()
    client.responses = [
        Response(status),
        Response({**status, "state": "draining"}),
        Response({**status, "state": "ready"}),
        Response({**status, "state": "revoked"}),
        Response({"certificate": "-----BEGIN CERTIFICATE-----", "serial": "1a2c",
                  "expires_at": "2027-01-01T00:00:00Z", "ca_certificate": "ca"}),
        Response({"certificate": "cert2", "serial": "1a2d",
                  "expires_at": "2027-06-01T00:00:00Z", "ca_certificate": "ca"}),
    ]

    read = client.get_dataserver_status(UID)
    drained = client.drain_dataserver(UID)
    resumed = client.resume_dataserver(UID)
    revoked = client.revoke_dataserver(UID)
    issued = client.issue_dataserver_identity(UID, "CSR-PEM")
    rotated = client.rotate_dataserver_identity(UID, "CSR-PEM-2")

    assert read.connectors[0].operations == ["select"] and read.queue_depth == 2
    assert (drained.state, resumed.state, revoked.state) == ("draining", "ready", "revoked")
    assert issued.serial == "1a2c" and rotated.serial == "1a2d"
    # Only a certificate comes back, never a key: the request carried a CSR.
    assert "key" not in issued.model_dump()
    urls = [call[0] for call in client.calls]
    assert urls[0].endswith(f"/dataservers/{UID}/status")
    assert urls[1].endswith(f"/dataservers/{UID}/drain")
    assert urls[2].endswith(f"/dataservers/{UID}/resume")
    assert urls[3].endswith(f"/dataservers/{UID}/revoke")
    assert urls[4].endswith(f"/dataservers/{UID}/identity")
    assert urls[5].endswith(f"/dataservers/{UID}/identity/rotate")
    assert client.calls[4][1]["json"] == {"csr": "CSR-PEM"}
    assert all(client.calls[index][1]["method"] == "POST" for index in range(1, 6))


def _operation(status: str = "failed", error_code: str | None = "RETRY_EXHAUSTED") -> dict[str, Any]:
    return {
        "uid": "01OPERATION00000000000000", "operation_kind": "volume-provision", "status": status,
        "attempt": 5, "max_attempts": 5, "cancellation_requested": False, "source_uid": UID,
        "error_code": error_code, "error_message": "operator away", "result": None,
        "created_at": "2026-08-26T00:00:00Z", "updated_at": "2026-08-26T00:00:00Z", "completed_at": None,
    }


def test_contents_client_reads_the_dead_letter_and_quarantines_and_requeues() -> None:
    client = Client()
    client.responses = [
        Response({"items": [_operation()]}),
        Response(_operation(error_code="QUARANTINED")),
        Response(_operation(status="pending", error_code=None)),
    ]

    dead = client.list_dead_letter_operations(rows=50)
    quarantined = client.quarantine_content_operation("01OPERATION00000000000000", reason="looking")
    requeued = client.requeue_content_operation("01OPERATION00000000000000")

    assert dead.items[0].error_code == "RETRY_EXHAUSTED"
    assert quarantined.error_code == "QUARANTINED"
    assert requeued.status == "pending"
    urls = [url for url, _ in client.calls]
    assert urls[0].endswith("/operations/dead-letter?rows=50")
    assert urls[1].endswith("/operations/01OPERATION00000000000000/quarantine")
    assert client.calls[1][1]["json"] == {"reason": "looking"}
    assert urls[2].endswith("/operations/01OPERATION00000000000000/requeue")
