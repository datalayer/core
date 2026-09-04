# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

from __future__ import annotations

from pathlib import Path
from types import SimpleNamespace
from typing import Any, Iterator

import json
import pytest
from typer.testing import CliRunner

import datalayer_core.cli.commands.contents as contents_commands
from datalayer_core.cli.__main__ import app
from datalayer_core.mixins.contents import ConditionalCatalogSource
from datalayer_core.models.contents.generated import (
    AttachmentList,
    CatalogSource,
    ContentAttachment,
    ContentObject,
    ObjectList,
    Sharing,
    SourceList,
    TransferView,
    VersionList,
    DeadLetterList,
    OperationView,
)

UID = "01ARZ3NDEKTSV4RRFFQ69G5FAV"
OWNER_UID = "01BX5ZZKBKACTAV9WEVGEMMVRZ"


def catalog_source() -> CatalogSource:
    return CatalogSource.model_validate(
        {
            "source": {
                "contract_version": "v1",
                "uid": UID,
                "kind": "dataset",
                "name": "Earth data",
                "principal_uid": OWNER_UID,
                "principal_kind": "user",
                "configuration": {"kind": "dataset"},
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
    )


class Client:
    last: "Client | None" = None

    def __init__(self) -> None:
        Client.last = self
        self.replaced: SimpleNamespace | None = None

    def list_content_sources(self, **kwargs: Any) -> SourceList:
        return SourceList(items=[catalog_source()], next_cursor="next")

    def get_content_source(self, reference: str) -> ConditionalCatalogSource:
        if reference not in {UID, "Earth data"}:
            raise RuntimeError("not found")
        return ConditionalCatalogSource(catalog_source(), '"v1.hash"')

    def get_content_source_sharing(self, source_uid: str) -> Sharing:
        return Sharing.model_validate(
            {
                "grants": [
                    {
                        "principal_kind": "team",
                        "principal_uid": OWNER_UID,
                        "access_level": "view",
                    }
                ]
            }
        )

    def replace_content_source_sharing(
        self, source_uid: str, sharing: dict[str, Any], *, etag: str
    ) -> ConditionalCatalogSource:
        self.replaced = SimpleNamespace(
            source_uid=source_uid, sharing=sharing, etag=etag
        )
        return ConditionalCatalogSource(catalog_source(), '"v1.next"')

    def list_home_folder_objects(self, **kwargs: Any) -> ObjectList:
        return ObjectList(items=[content_object()], next_cursor=None)

    def stat_home_folder_object(self, path: str) -> ContentObject:
        return content_object(path)

    def list_home_folder_object_versions(self, object_uid: str) -> VersionList:
        return VersionList(items=[], next_cursor=None)

    def restore_home_folder_object(
        self, object_uid: str, version: str, **kwargs: Any
    ) -> ContentObject:
        return content_object()

    def upload_home_folder_file(
        self, local_path: str | Path, destination_path: str, **kwargs: Any
    ) -> SimpleNamespace:
        self.uploaded = (local_path, destination_path, kwargs)
        return transfer_view("succeeded")

    def upload_dataset_file(
        self, local_path: str | Path, dataset_uid: str, destination_path: str, **kwargs: Any
    ) -> SimpleNamespace:
        self.captured = (local_path, dataset_uid, destination_path, kwargs)
        return transfer_view("succeeded")

    def iter_home_folder_object(self, object_uid: str) -> Iterator[bytes]:
        yield b"downloaded"

    def get_content_transfer(self, transfer_uid: str) -> SimpleNamespace:
        return transfer_view("running")

    def cancel_content_transfer(self, transfer_uid: str) -> SimpleNamespace:
        return transfer_view("cancelled")

    def create_content_attachment(
        self, request: dict[str, Any], *, idempotency_key: str
    ) -> ContentAttachment:
        self.attachment_request = (request, idempotency_key)
        return attachment_view()

    def create_content_source(
        self, request: dict[str, Any], *, idempotency_key: str
    ) -> ConditionalCatalogSource:
        self.source_request = (request, idempotency_key)
        return ConditionalCatalogSource(catalog_source(), '"v1.created"')

    def list_content_attachments(self, **kwargs: Any) -> AttachmentList:
        return AttachmentList(items=[attachment_view()])

    def list_environments(self) -> list[dict[str, Any]]:
        return [environment_view()]

    def get_environment_contents(
        self, name: str, provider: str = "datalayer"
    ) -> dict[str, Any]:
        self.verified = (name, provider)
        return environment_diagnostics(name, provider)

    def revoke_content_attachment(self, attachment_uid: str) -> ContentAttachment:
        return attachment_view(status="revoked")


CONTENT_UID = "01J9SKLEARNTUTORIAL000001"


def environment_view() -> dict[str, Any]:
    return {
        "name": "ai-env",
        "title": "AI GPU",
        "description": "PyTorch on a GPU.",
        "burning_rate": 12,
        "contents": [
            {
                "uid": CONTENT_UID,
                "name": "sklearn-tutorial-content",
                "mount": "/home/jovyan/tutorials",
                "permissions": "ro",
            }
        ],
    }


def environment_diagnostics(name: str, provider: str) -> dict[str, Any]:
    """Resolved on the platform; a shared filesystem nowhere else."""
    supported = provider == "datalayer"
    return {
        "environment": name,
        "provider": provider,
        "supported": supported,
        "contents": [
            {
                "uid": CONTENT_UID,
                "name": "sklearn-tutorial-content",
                "type": "git",
                "mount": "/home/jovyan/tutorials",
                "permissions": "ro",
                "revision": "4f3c2a1",
                "sha256": "9b3f" * 16,
                "status": "resolved",
                "detail": None,
            },
            {
                "uid": "01J9NFSMODELSOSS000000002",
                "name": "nfs-models-oss-content",
                "type": "nfs",
                "mount": "/home/jovyan/models",
                "permissions": "ro",
                "revision": None,
                "sha256": None,
                "status": "resolved" if supported else "unsupported",
                "detail": None
                if supported
                else f"{provider} cannot mount the platform filesystem",
            },
        ],
    }


def content_object(path: str = "reports/earth.csv") -> ContentObject:
    return ContentObject.model_validate(
        {
            "uid": "01OBJECT000000000000000000",
            "source_uid": UID,
            "path": path,
            "kind": "file",
            "current_version_uid": "01VERSION00000000000000000",
            "size": 10,
            "media_type": "text/csv",
            "checksum_algorithm": "sha256",
            "checksum": "a" * 64,
            "deleted": False,
            "created_by_uid": OWNER_UID,
            "created_at": "2026-08-24T12:00:00Z",
            "updated_at": "2026-08-24T12:00:00Z",
        }
    )


def transfer_view(status: str) -> TransferView:
    return TransferView.model_validate(
        {
            "uid": "01TRANSFER0000000000000000",
            "direction": "upload",
            "source_uid": UID,
            "destination_uri": "home-folder:///reports/earth.csv",
            "path": "reports/earth.csv",
            "media_type": "text/csv",
            "expected_size": 10,
            "expected_checksum": "a" * 64,
            "overwrite_policy": "reject",
            "status": status,
            "received_bytes": 10 if status == "succeeded" else 5,
            "part_count": 1,
            "created_at": "2026-08-24T12:00:00Z",
            "updated_at": "2026-08-24T12:00:00Z",
        }
    )


def attachment_view(status: str = "requested") -> ContentAttachment:
    return ContentAttachment.model_validate(
        {
            "uid": "01C3TA5NDEKTSV4RRFFQ69G5FA",
            "source_uid": UID,
            "sandbox_uid": "01B3TA5NDEKTSV4RRFFQ69G5FA",
            "sandbox_provider": "datalayer",
            "mode": "rw",
            "mount_path": "/home/jovyan/volumes/work",
            "delivery": "mount",
            "required": True,
            "capabilities": [],
            "status": status,
            "limits": {},
            "created_at": "2026-08-24T12:00:00Z",
            "cleanup_policy": "revoke",
        }
    )


def test_contents_list_and_describe_support_machine_output(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(contents_commands, "DatalayerClient", Client)
    runner = CliRunner()

    listed = runner.invoke(app, ["contents", "--output", "json", "list"])
    described = runner.invoke(
        app, ["contents", "--output", "yaml", "describe", "Earth data"]
    )

    assert listed.exit_code == 0
    assert '"next_cursor": "next"' in listed.stdout
    assert described.exit_code == 0
    assert "name: Earth data" in described.stdout


def test_contents_list_filters_by_kind_under_either_flag(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """The flag filters by **kind**, and says so.

    It was `--source` and it took a kind — the one place the product itself
    said one word and meant the other, and the one people read as evidence
    that a source and a kind were the same thing. `--kind` is the name now;
    `--source` still works, so nothing anybody typed before stops working.
    """
    seen: dict[str, Any] = {}

    class Recording(Client):
        def list_content_sources(self, **kwargs: Any) -> SourceList:
            seen.update(kwargs)
            return super().list_content_sources(**kwargs)

    monkeypatch.setattr(contents_commands, "DatalayerClient", Recording)
    runner = CliRunner()

    for flag, expected in (("--kind", "dataset"), ("--source", "volume")):
        seen.clear()
        listed = runner.invoke(
            app, ["contents", "--output", "json", "list", flag, expected]
        )
        assert listed.exit_code == 0, (flag, listed.output)
        assert seen["kind"] == expected, flag

    # Two names by design, not any name: the alias set stays deliberate.
    rejected = runner.invoke(app, ["contents", "list", "--type", "dataset"])
    assert rejected.exit_code != 0


def test_contents_sharing_grant_uses_uid_and_conditional_write(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(contents_commands, "DatalayerClient", Client)
    result = CliRunner().invoke(
        app,
        [
            "contents",
            "--output",
            "json",
            "sharing",
            "grant",
            UID,
            "01B3TA5NDEKTSV4RRFFQ69G5FA",
            "--principal-kind",
            "user",
            "--access",
            "execute",
        ],
    )

    assert result.exit_code == 0, result.stdout
    assert Client.last is not None
    replaced = Client.last.replaced
    assert replaced is not None
    assert replaced.etag == '"v1.hash"'
    assert replaced.sharing["grants"][-1]["access_level"] == "execute"


def test_contents_upload_download_and_transfer_commands(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    monkeypatch.setattr(contents_commands, "DatalayerClient", Client)
    source = tmp_path / "earth.csv"
    destination = tmp_path / "downloaded.csv"
    source.write_text("earth")
    runner = CliRunner()

    uploaded = runner.invoke(
        app,
        [
            "contents",
            "--output",
            "json",
            "upload",
            str(source),
            "home-folder:///reports/earth.csv",
        ],
    )
    downloaded = runner.invoke(
        app,
        [
            "contents",
            "download",
            "home-folder:///reports/earth.csv",
            str(destination),
        ],
    )
    status = runner.invoke(
        app,
        [
            "contents",
            "--output",
            "json",
            "transfer",
            "status",
            "01TRANSFER0000000000000000",
        ],
    )
    cancelled = runner.invoke(
        app,
        [
            "contents",
            "--output",
            "json",
            "transfer",
            "cancel",
            "01TRANSFER0000000000000000",
        ],
    )

    assert uploaded.exit_code == 0, uploaded.stdout
    assert '"status": "succeeded"' in uploaded.stdout
    assert downloaded.exit_code == 0, downloaded.stdout
    assert destination.read_bytes() == b"downloaded"
    assert status.exit_code == 0
    assert '"status": "running"' in status.stdout
    assert cancelled.exit_code == 0
    assert '"status": "cancelled"' in cancelled.stdout


def test_contents_sandbox_attachment_commands(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(contents_commands, "DatalayerClient", Client)
    runner = CliRunner()

    attached = runner.invoke(
        app,
        [
            "contents",
            "--output",
            "json",
            "sandbox",
            "attach",
            "01B3TA5NDEKTSV4RRFFQ69G5FA",
            UID,
            "--provider",
            "datalayer",
            "--path",
            "/home/jovyan/volumes/work",
            "--read-write",
        ],
    )
    detached = runner.invoke(
        app,
        [
            "contents",
            "--output",
            "json",
            "sandbox",
            "detach",
            "01B3TA5NDEKTSV4RRFFQ69G5FA",
            "01C3TA5NDEKTSV4RRFFQ69G5FA",
        ],
    )

    assert attached.exit_code == 0, attached.stdout
    assert '"status": "requested"' in attached.stdout
    assert detached.exit_code == 0, detached.stdout
    assert '"status": "revoked"' in detached.stdout


def test_contents_volume_attach_and_dataset_materialize(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(contents_commands, "DatalayerClient", Client)
    runner = CliRunner()

    volume = runner.invoke(
        app,
        [
            "contents",
            "volumes",
            "attach",
            UID,
            "01B3TA5NDEKTSV4RRFFQ69G5FA",
            "--path",
            "/home/jovyan/volumes/work",
        ],
    )
    assert volume.exit_code == 0, volume.stdout
    assert Client.last is not None
    volume_request = Client.last.attachment_request[0]
    assert volume_request["delivery"] == "mount"
    assert volume_request["mode"] == "rw"

    dataset = runner.invoke(
        app,
        [
            "contents",
            "datasets",
            "materialize",
            UID,
            "--revision",
            "01REVISION00000000000000000",
            "--sandbox",
            "01B3TA5NDEKTSV4RRFFQ69G5FA",
            "--path",
            "/home/jovyan/datasets/earth",
        ],
    )
    assert dataset.exit_code == 0, dataset.stdout
    assert Client.last is not None
    dataset_request = Client.last.attachment_request[0]
    assert dataset_request["delivery"] == "materialize"
    assert dataset_request["mode"] == "ro"
    assert dataset_request["revision_uid"] == "01REVISION00000000000000000"


def test_contents_cloud_storage_create_keeps_only_credential_reference(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(contents_commands, "DatalayerClient", Client)
    result = CliRunner().invoke(
        app,
        [
            "contents",
            "cloud-storage",
            "create",
            "Analytics",
            "--provider",
            "s3",
            "--bucket",
            "company-analytics",
            "--credential",
            OWNER_UID,
            "--prefix",
            "production/events",
            "--read-only",
        ],
    )

    assert result.exit_code == 0, result.stdout
    assert Client.last is not None
    request = Client.last.source_request[0]
    assert request["credential_uid"] == OWNER_UID
    assert request["configuration"]["bucket_or_container"] == "company-analytics"
    assert "secret" not in request["configuration"]


def test_contents_download_refuses_overwrite_with_nonzero_exit(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    monkeypatch.setattr(contents_commands, "DatalayerClient", Client)
    destination = tmp_path / "earth.csv"
    destination.write_text("keep")

    result = CliRunner().invoke(
        app,
        [
            "contents",
            "download",
            "home-folder:///reports/earth.csv",
            str(destination),
        ],
    )

    assert result.exit_code == 1
    assert destination.read_text() == "keep"


def test_contents_datasets_capture_uploads_into_the_dataset(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    captured: dict = {}

    class Recording(Client):
        def upload_dataset_file(self, local_path, dataset_uid, destination_path, **kwargs):
            captured.update(local_path=local_path, dataset_uid=dataset_uid, destination_path=destination_path, **kwargs)
            return transfer_view("succeeded")

    monkeypatch.setattr(contents_commands, "DatalayerClient", Recording)
    local = tmp_path / "co2.csv"
    local.write_text("year,co2")

    result = CliRunner().invoke(
        app, ["contents", "--output", "json", "datasets", "capture", str(local), UID, "/results/co2.csv", "--overwrite"],
    )

    assert result.exit_code == 0, result.output
    assert captured["dataset_uid"] == UID
    assert captured["destination_path"] == "results/co2.csv"
    assert captured["overwrite"] == "replace"
    assert captured["idempotency_key"].startswith("cli-capture-")


def test_contents_environment_list_names_environments_and_their_contents(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """The group is `environment`, singular, as the docs say; `list` reads
    the Runtimes service rather than the catalog, and shows what each
    Environment selects."""
    monkeypatch.setattr(contents_commands, "DatalayerClient", Client)
    runner = CliRunner(env={"COLUMNS": "200"})

    listed = runner.invoke(app, ["contents", "environment", "list"])
    as_json = runner.invoke(
        app, ["contents", "--output", "json", "environment", "list"]
    )
    plural = runner.invoke(app, ["contents", "environments", "list"])

    assert listed.exit_code == 0, listed.stdout
    assert "ai-env" in listed.stdout
    assert "sklearn-tutorial-content" in listed.stdout
    assert "/home/jovyan/tutorials" in listed.stdout
    assert as_json.exit_code == 0
    assert f'"uid": "{CONTENT_UID}"' in as_json.stdout
    assert plural.exit_code != 0


def test_contents_environment_verify_reports_each_content_and_fails_when_unsupported(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(contents_commands, "DatalayerClient", Client)
    # Wide enough that the table does not fold the names it is asked about.
    runner = CliRunner(env={"COLUMNS": "200"})

    resolved = runner.invoke(
        app, ["contents", "environment", "verify", "ai-env", "--provider", "datalayer"]
    )
    assert resolved.exit_code == 0, resolved.stdout
    assert Client.last is not None
    assert Client.last.verified == ("ai-env", "datalayer")
    assert "sklearn-tutorial-content" in resolved.stdout
    assert "resolved" in resolved.stdout
    assert "4f3c2a1" in resolved.stdout
    assert "supported on datalayer" in resolved.stdout

    unsupported = runner.invoke(
        app, ["contents", "environment", "verify", "ai-env", "--provider", "e2b"]
    )
    assert unsupported.exit_code == 1
    assert "unsupported" in unsupported.stdout
    assert "cannot mount the platform filesystem" in unsupported.stdout
    assert "not supported on e2b" in unsupported.stdout

    # The provider defaults to the platform, and machine output carries the
    # diagnostics whole while the exit code still says what they mean.
    as_json = runner.invoke(
        app, ["contents", "--output", "json", "environment", "verify", "ai-env"]
    )
    assert as_json.exit_code == 0, as_json.stdout
    assert Client.last.verified == ("ai-env", "datalayer")
    assert '"supported": true' in as_json.stdout
    failing_json = runner.invoke(
        app,
        ["contents", "--output", "json", "environment", "verify", "ai-env", "--provider", "modal"],
    )
    assert failing_json.exit_code == 1
    assert '"status": "unsupported"' in failing_json.stdout


# -- MCP ---------------------------------------------------------------------

MCP_UID = "01MCPSRC000000000000000000"
MCP_SESSION_UID = "01MCPSESSION00000000000000"
MCP_CALL_UID = "01MCPCALL00000000000000000"
MCP_APPROVAL_UID = "01MCPAPPROVAL0000000000000"


def mcp_catalog_source() -> CatalogSource:
    source = catalog_source().model_dump(mode="json")
    source["source"].update(
        {
            "uid": MCP_UID,
            "kind": "mcp",
            "name": "earthdata",
            "configuration": {
                "kind": "mcp",
                "transport": "streamable-http",
                "endpoint": "https://mcp.example.com/mcp",
                "approval_policy": "explicit",
                "destination_policy": "allowlist",
                "allowed_tools": ["search_earth_datasets", "download_earth_data_granules"],
                "allowed_domains": ["earthdata.nasa.gov"],
            },
        }
    )
    return CatalogSource.model_validate(source)


def mcp_call_record(status: str, **extra: Any) -> dict[str, Any]:
    return {
        "uid": MCP_CALL_UID,
        "session_uid": MCP_SESSION_UID,
        "tool": "download_earth_data_granules",
        "arguments_redacted": {"short_name": "MUR"},
        "arguments_hash": "sha256:abc",
        "status": status,
        "created_at": "2026-08-26T10:00:00Z",
        "updated_at": "2026-08-26T10:00:00Z",
        **extra,
    }


def mcp_approval_record(status: str, **extra: Any) -> dict[str, Any]:
    return {
        "uid": MCP_APPROVAL_UID,
        "source_uid": MCP_UID,
        "session_uid": MCP_SESSION_UID,
        "call_uid": MCP_CALL_UID,
        "actor_uid": OWNER_UID,
        "tool": "download_earth_data_granules",
        "arguments_hash": "sha256:abc",
        "arguments_redacted": {"short_name": "MUR"},
        "destination_uri": "home-folder:///earthdata",
        "status": status,
        "created_at": "2026-08-26T10:00:00Z",
        "expires_at": "2026-08-26T11:00:00Z",
        **extra,
    }


class McpClient(Client):
    """The fake, taught the MCP surface: a session, a call, and its approvals."""

    def __init__(self) -> None:
        super().__init__()
        self.sessions: list[dict[str, Any]] = []
        self.calls: list[dict[str, Any]] = []
        self.decisions: list[tuple[str, str, str | None]] = []
        self.polls = 0
        self.call_statuses: list[str] = ["succeeded"]

    def get_content_source(self, reference: str) -> ConditionalCatalogSource:
        if reference in {MCP_UID, "earthdata"}:
            return ConditionalCatalogSource(mcp_catalog_source(), '"v1.mcp"')
        return super().get_content_source(reference)

    def list_content_sources(self, **kwargs: Any) -> SourceList:
        return SourceList(items=[catalog_source(), mcp_catalog_source()], next_cursor=None)

    def discover_mcp_tools(self, source_uid: str) -> Any:
        from datalayer_core.models.contents.mcp import McpToolManifest

        assert source_uid == MCP_UID
        return McpToolManifest.model_validate(
            {
                "tools": [
                    {
                        "name": "search_earth_datasets",
                        "description": "Search datasets",
                        "input_schema": {
                            "type": "object",
                            "properties": {
                                "search_keywords": {"type": "string"},
                                "count": {"type": "integer"},
                            },
                            "required": ["search_keywords"],
                        },
                    }
                ],
                "resources": [{"uri": "earthdata://catalog", "name": "Catalog"}],
                "discovered_at": "2026-08-26T10:00:00Z",
            }
        )

    def test_mcp_source(self, source_uid: str) -> Any:
        from datalayer_core.models.contents.mcp import McpHealth

        return McpHealth(ok=True, transport="streamable-http", detail="tools/list answered")

    def create_mcp_session(self, source_uid: str, **kwargs: Any) -> Any:
        from datalayer_core.models.contents.mcp import McpSession

        self.sessions.append({"source_uid": source_uid, **kwargs})
        return McpSession.model_validate(
            {
                "uid": MCP_SESSION_UID,
                "source_uid": source_uid,
                "actor_uid": OWNER_UID,
                "allowed_tools": ["search_earth_datasets", "download_earth_data_granules"],
                "allowed_resources": [],
                "allowed_domains": [],
                "allowed_destinations": [],
                "approval_policy": "explicit",
                "destination_policy": "allowlist",
                "max_result_bytes": 67108864,
                "status": "active",
                "created_at": "2026-08-26T10:00:00Z",
                "expires_at": "2026-08-26T11:00:00Z",
            }
        )

    def call_mcp_tool(
        self, session_uid: str, tool: str, arguments: Any, *, destination_uri: Any = None
    ) -> Any:
        from datalayer_core.models.contents.mcp import McpCall

        self.calls.append(
            {
                "session_uid": session_uid,
                "tool": tool,
                "arguments": dict(arguments),
                "destination_uri": destination_uri,
            }
        )
        return McpCall.model_validate(
            mcp_call_record("pending-approval", tool=tool, approval_uid=MCP_APPROVAL_UID)
        )

    def get_mcp_call(self, session_uid: str, call_uid: str) -> Any:
        from datalayer_core.models.contents.mcp import McpCall

        self.polls += 1
        status = self.call_statuses[min(self.polls, len(self.call_statuses)) - 1]
        result = None
        if status == "succeeded":
            result = {
                "content": [{"type": "text", "text": "2 granules"}],
                "artifacts": [
                    {"name": "a.nc", "size": 10, "transfer_uid": "01TRANSFERA00000000000000"},
                    {"name": "b.nc", "size": 10, "transfer_uid": "01TRANSFERB00000000000000"},
                ],
            }
        return McpCall.model_validate(mcp_call_record(status, result=result))

    def list_mcp_approvals(self, **kwargs: Any) -> Any:
        from datalayer_core.models.contents.mcp import McpApprovalList

        self.approval_filters = kwargs
        return McpApprovalList.model_validate(
            {"items": [mcp_approval_record(kwargs.get("status") or "pending")]}
        )

    def approve_mcp_approval(self, approval_uid: str, *, note: str | None = None) -> Any:
        from datalayer_core.models.contents.mcp import McpApproval

        self.decisions.append(("approve", approval_uid, note))
        return McpApproval.model_validate(
            mcp_approval_record("approved", uid=approval_uid, note=note)
        )

    def reject_mcp_approval(self, approval_uid: str, *, note: str | None = None) -> Any:
        from datalayer_core.models.contents.mcp import McpApproval

        self.decisions.append(("reject", approval_uid, note))
        return McpApproval.model_validate(
            mcp_approval_record("rejected", uid=approval_uid, note=note)
        )


def test_contents_mcp_tools_and_test_answer_for_the_named_source(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(contents_commands, "DatalayerClient", McpClient)
    runner = CliRunner()

    tools = runner.invoke(app, ["contents", "mcp", "tools", "earthdata"])
    as_json = runner.invoke(app, ["contents", "-o", "json", "mcp", "tools", MCP_UID])
    health = runner.invoke(app, ["contents", "mcp", "test", "earthdata"])
    not_mcp = runner.invoke(app, ["contents", "mcp", "tools", "Earth data"])

    assert tools.exit_code == 0, tools.output
    assert "search_earth_datasets" in tools.output
    # The required argument is bare, the optional one carries the question mark.
    assert "search_keywords, count?" in tools.output
    assert "earthdata://catalog" in tools.output
    assert as_json.exit_code == 0
    assert '"discovered_at": "2026-08-26T10:00:00Z"' in as_json.output
    assert health.exit_code == 0
    assert "reachable" in health.output and "tools/list answered" in health.output
    assert not_mcp.exit_code == 1
    assert "not an MCP server" in not_mcp.output


def test_contents_mcp_call_reports_the_pending_approval_and_exits_without_waiting(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    monkeypatch.setattr(contents_commands, "DatalayerClient", McpClient)
    arguments = tmp_path / "search.json"
    arguments.write_text('{"short_name": "MUR", "count": 10}')
    runner = CliRunner()

    result = runner.invoke(
        app,
        [
            "contents",
            "mcp",
            "call",
            "earthdata",
            "download_earth_data_granules",
            "--arguments-file",
            str(arguments),
            "--arg",
            "mode=manifest",
            "--arg",
            "bounding_box=[-4,51,9,61]",
            "--destination",
            "home-folder:///earthdata",
        ],
    )

    assert result.exit_code == 0, result.output
    client = McpClient.last
    assert isinstance(client, McpClient)
    # One session on the source, one call through it, arguments merged and typed.
    assert client.sessions[0]["source_uid"] == MCP_UID
    assert client.calls == [
        {
            "session_uid": MCP_SESSION_UID,
            "tool": "download_earth_data_granules",
            "arguments": {
                "short_name": "MUR",
                "count": 10,
                "mode": "manifest",
                "bounding_box": [-4, 51, 9, 61],
            },
            "destination_uri": "home-folder:///earthdata",
        }
    ]
    assert "pending-approval" in result.output
    assert MCP_APPROVAL_UID in result.output
    assert f"mcp approvals approve {MCP_APPROVAL_UID}" in result.output
    assert client.polls == 0


def test_contents_mcp_call_waits_and_prints_the_transfers_of_a_bulk_acquisition(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(contents_commands, "DatalayerClient", McpClient)
    monkeypatch.setattr("time.sleep", lambda seconds: None)
    runner = CliRunner()

    result = runner.invoke(
        app,
        [
            "contents",
            "mcp",
            "call",
            "earthdata",
            "download_earth_data_granules",
            "--arg",
            "short_name=MUR",
            "--wait",
        ],
    )
    as_json = runner.invoke(
        app,
        [
            "contents",
            "-o",
            "json",
            "mcp",
            "call",
            "earthdata",
            "download_earth_data_granules",
            "--arg",
            "short_name=MUR",
            "--wait",
        ],
    )

    assert result.exit_code == 0, result.output
    assert "succeeded" in result.output
    assert "01TRANSFERA00000000000000" in result.output
    assert "01TRANSFERB00000000000000" in result.output
    assert "transfer status" in result.output
    assert as_json.exit_code == 0
    assert '"transfer_uid": "01TRANSFERA00000000000000"' in as_json.output


def test_contents_mcp_call_fails_when_the_call_is_denied(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    class Denying(McpClient):
        def __init__(self) -> None:
            super().__init__()
            self.call_statuses = ["denied"]

    monkeypatch.setattr(contents_commands, "DatalayerClient", Denying)
    monkeypatch.setattr("time.sleep", lambda seconds: None)
    bad_pair = CliRunner().invoke(
        app, ["contents", "mcp", "call", "earthdata", "tool", "--arg", "novalue"]
    )
    denied = CliRunner().invoke(
        app,
        ["contents", "mcp", "call", "earthdata", "download_earth_data_granules", "--wait"],
    )

    assert bad_pair.exit_code == 1
    assert "key=value" in bad_pair.output
    assert denied.exit_code == 1
    assert "denied" in denied.output


def test_contents_mcp_approvals_list_approve_and_reject(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(contents_commands, "DatalayerClient", McpClient)
    runner = CliRunner()

    listed = runner.invoke(app, ["contents", "mcp", "approvals", "list", "--source", "earthdata"])
    # Each command builds its own client; read the one that listed before
    # the next command replaces it.
    lister = McpClient.last
    approved = runner.invoke(
        app, ["contents", "-o", "json", "mcp", "approvals", "approve", MCP_APPROVAL_UID]
    )
    rejected = runner.invoke(
        app,
        ["contents", "mcp", "approvals", "reject", MCP_APPROVAL_UID, "--note", "too large"],
    )

    assert listed.exit_code == 0, listed.output
    assert MCP_APPROVAL_UID in listed.output
    assert "home-folder:///earthdata" in listed.output
    assert f"approve|reject {MCP_APPROVAL_UID}" in listed.output
    assert isinstance(lister, McpClient)
    # The service filters on status alone; the source narrows the answer client-side.
    assert lister.approval_filters == {"status": "pending"}
    assert approved.exit_code == 0
    assert '"status": "approved"' in approved.output
    assert rejected.exit_code == 0
    rejecter = McpClient.last
    assert isinstance(rejecter, McpClient)
    assert rejecter.decisions[-1] == ("reject", MCP_APPROVAL_UID, "too large")


# -- Datasources and Dataservers ----------------------------------------------

DATASOURCE_UID = "01DATASRC00000000000000000"
DATASERVER_UID = "01DATASRV00000000000000000"
DATASET_UID = UID
QUERY_UID = "01QUERY000000000000000000Q"


def kind_source(kind: str, uid: str, name: str) -> CatalogSource:
    configuration = {
        "datasource": {"kind": "datasource", "connector_type": "bigquery"},
        "data-server": {
            "kind": "data-server",
            "registration_identity": "edge-1",
            "mtls_issuer": "datalayer-internal",
            "policy_version": "3",
        },
    }[kind]
    return CatalogSource.model_validate(
        {
            "source": {
                "contract_version": "v1",
                "uid": uid,
                "kind": kind,
                "name": name,
                "principal_uid": OWNER_UID,
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
    )


def arrow_stream_bytes() -> bytes:
    import pyarrow

    batch = pyarrow.record_batch({"id": [1, 2, 3], "city": ["Paris", "Oslo", "Lima"]})
    sink = pyarrow.BufferOutputStream()
    with pyarrow.ipc.new_stream(sink, batch.schema) as writer:
        writer.write(batch)
    return sink.getvalue().to_pybytes()


def query_record(**overrides: Any) -> Any:
    """A query as the contract shapes it, with the fields a test cares about on top."""
    from datalayer_core.models.contents.datasources import DatasourceQuery

    record: dict[str, Any] = {
        "uid": QUERY_UID,
        "source_uid": DATASOURCE_UID,
        "actor_uid": OWNER_UID,
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


def dataserver_status(state: str) -> Any:
    from datalayer_core.models.contents.datasources import DataServerStatus

    return DataServerStatus(state=state, connectors=[], lease_seconds=90, queue_depth=0)


class DataClient(Client):
    """The catalog with a Datasource, a Dataserver and a Dataset in it."""

    # Every command makes a client of its own, so what several commands did
    # is remembered on the class.
    transitions: list[str] = []
    requests: list[dict[str, Any]] = []

    def __init__(self) -> None:
        super().__init__()
        self.polls = 0

    def create_content_source(
        self, request: dict[str, Any], *, idempotency_key: str
    ) -> ConditionalCatalogSource:
        DataClient.requests.append(request)
        return super().create_content_source(request, idempotency_key=idempotency_key)

    def get_content_source(self, reference: str) -> ConditionalCatalogSource:
        if reference in {DATASOURCE_UID, "earth-observation"}:
            return ConditionalCatalogSource(
                kind_source("datasource", DATASOURCE_UID, "earth-observation"), '"v1"'
            )
        if reference in {DATASERVER_UID, "private-data"}:
            return ConditionalCatalogSource(
                kind_source("data-server", DATASERVER_UID, "private-data"), '"v1"'
            )
        return super().get_content_source(reference)

    def test_datasource(self, source_uid: str) -> Any:
        from datalayer_core.models.contents.datasources import DatasourceTest

        return DatasourceTest(ok=True, connector_type="bigquery", detail="answered")

    def discover_datasource_schema(self, source_uid: str) -> Any:
        from datalayer_core.models.contents.datasources import DatasourceSchema

        return DatasourceSchema.model_validate(
            {
                "tables": [{"name": "observations", "columns": [{"name": "id", "type": "int64"}]}],
                "discovered_at": "2026-08-26T12:00:00Z",
            }
        )

    def create_datasource_query(self, source_uid: str, sql: str, **kwargs: Any) -> Any:
        self.query_request = (source_uid, sql, kwargs)
        return query_record(uid=QUERY_UID, source_uid=source_uid, status="pending")

    def get_datasource_query(self, query_uid: str) -> Any:
        self.polls += 1
        return query_record(uid=query_uid, status="succeeded", rows=3)

    def cancel_datasource_query(self, query_uid: str) -> Any:
        return query_record(uid=query_uid, status="cancelled")

    def iter_datasource_query_results(self, query_uid: str, **kwargs: Any) -> Iterator[bytes]:
        payload = arrow_stream_bytes()
        for start in range(0, len(payload), 11):
            yield payload[start : start + 11]

    def save_datasource_query(self, query_uid: str, *, dataset_uid: str, path: str) -> Any:
        self.saved = (query_uid, dataset_uid, path)
        return SimpleNamespace(model_dump=lambda mode="json": {"uid": "01REV", "source_uid": dataset_uid, "path": path})

    def get_dataserver_status(self, source_uid: str) -> Any:
        from datalayer_core.models.contents.datasources import DataServerStatus

        return DataServerStatus.model_validate(
            {
                "state": "ready",
                "last_heartbeat_at": "2026-08-26T12:00:00Z",
                "lease_seconds": 90,
                "connectors": [
                    {"connector_type": "sql", "operations": ["select", "describe"], "policy_version": "3"}
                ],
                "queue_depth": 0,
                "identity_serial": "1a2b",
            }
        )

    def _move(self, action: str, state: str) -> Any:
        DataClient.transitions.append(action)
        return dataserver_status(state)

    def drain_dataserver(self, source_uid: str) -> Any:
        return self._move("drain", "draining")

    def resume_dataserver(self, source_uid: str) -> Any:
        return self._move("resume", "ready")

    def revoke_dataserver(self, source_uid: str) -> Any:
        return self._move("revoke", "revoked")


def test_datasources_create_needs_a_credential_or_a_dataserver(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(contents_commands, "DatalayerClient", DataClient)
    runner = CliRunner()

    refused = runner.invoke(
        app, ["contents", "datasources", "create", "eo", "--connector-type", "sql"]
    )
    routed = runner.invoke(
        app,
        [
            "contents", "--output", "json", "datasources", "create", "eo",
            "--connector-type", "sql", "--endpoint", "db.internal:5432",
            "--database", "research", "--dataserver", "private-data",
            "--allow", "select,describe", "--row-limit", "500",
        ],
    )
    direct = runner.invoke(
        app,
        [
            "contents", "datasources", "create", "eo", "--connector-type", "bigquery",
            "--project", "eo-prod", "--credential", "01CREDENTIAL0000000000000A",
        ],
    )
    unknown = runner.invoke(
        app,
        ["contents", "datasources", "create", "eo", "--connector-type", "sql",
         "--credential", "c", "--allow", "select,drop"],
    )

    assert refused.exit_code == 1
    assert "needs --credential" in refused.output
    assert routed.exit_code == 0, routed.output
    assert direct.exit_code == 0, direct.output
    assert unknown.exit_code == 1
    assert "not drop" in unknown.output
    routed_request, direct_request = DataClient.requests[-2:]
    assert routed_request["kind"] == "datasource"
    assert routed_request["credential_uid"] is None
    assert routed_request["configuration"]["network_route"] == "dataserver"
    assert routed_request["configuration"]["data_server_uid"] == DATASERVER_UID
    assert routed_request["configuration"]["allowed_operations"] == ["select", "describe"]
    assert routed_request["configuration"]["default_row_limit"] == 500
    assert direct_request["configuration"]["network_route"] == "direct"
    assert direct_request["configuration"]["database_or_project"] == "eo-prod"
    assert direct_request["credential_uid"] == "01CREDENTIAL0000000000000A"


def test_datasources_test_and_schema(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(contents_commands, "DatalayerClient", DataClient)
    runner = CliRunner()

    tested = runner.invoke(app, ["contents", "datasources", "test", "earth-observation"])
    schema = runner.invoke(app, ["contents", "datasources", "schema", "earth-observation"])
    wrong_kind = runner.invoke(app, ["contents", "datasources", "test", "private-data"])

    assert tested.exit_code == 0, tested.output
    assert "reachable" in tested.output and "bigquery" in tested.output
    assert schema.exit_code == 0, schema.output
    assert "observations" in schema.output and "int64" in schema.output
    assert wrong_kind.exit_code == 1
    assert "not a Datasource" in wrong_kind.output


def test_datasources_query_submits_waits_prints_writes_and_cancels(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    pyarrow = pytest.importorskip("pyarrow")
    monkeypatch.setattr(contents_commands, "DatalayerClient", DataClient)
    monkeypatch.setattr("time.sleep", lambda seconds: None)
    runner = CliRunner()

    submitted = runner.invoke(
        app,
        ["contents", "--output", "json", "datasources", "query", "earth-observation",
         "SELECT * FROM observations", "--row-limit", "10"],
    )
    assert submitted.exit_code == 0, submitted.output
    assert f'"uid": "{QUERY_UID}"' in submitted.output
    assert DataClient.last.query_request[1] == "SELECT * FROM observations"  # type: ignore[union-attr]
    assert DataClient.last.query_request[2]["row_limit"] == 10  # type: ignore[union-attr]
    # Submitted, not waited for: nothing was polled.
    assert DataClient.last.polls == 0  # type: ignore[union-attr]

    statement = tmp_path / "query.sql"
    statement.write_text("SELECT id, city FROM observations")
    shown = runner.invoke(
        app,
        ["contents", "datasources", "query", "earth-observation",
         "--sql-file", str(statement), "--wait", "--rows", "2"],
    )
    assert shown.exit_code == 0, shown.output
    assert "Paris" in shown.output and "Oslo" in shown.output
    assert "Lima" not in shown.output

    arrow_file = tmp_path / "out" / "observations.arrow"
    written = runner.invoke(
        app,
        ["contents", "--output", "json", "datasources", "query", "earth-observation",
         "SELECT 1", "--format", "arrow", "--output", str(arrow_file)],
    )
    assert written.exit_code == 0, written.output
    with pyarrow.ipc.open_stream(str(arrow_file)) as reader:
        table = reader.read_all()
    assert table.num_rows == 3 and table.column_names == ["id", "city"]
    assert '"written_rows": 3' in written.output

    parquet_file = tmp_path / "observations.parquet"
    written = runner.invoke(
        app,
        ["contents", "datasources", "query", "earth-observation", "SELECT 1",
         "--format", "parquet", "--output", str(parquet_file)],
    )
    assert written.exit_code == 0, written.output
    assert pyarrow.parquet.read_table(str(parquet_file)).num_rows == 3

    missing = runner.invoke(
        app, ["contents", "datasources", "query", "earth-observation", "SELECT 1", "--format", "arrow"]
    )
    assert missing.exit_code == 1 and "--output" in missing.output

    cancelled = runner.invoke(app, ["contents", "--output", "json", "datasources", "cancel", QUERY_UID])
    assert cancelled.exit_code == 0, cancelled.output
    assert '"status": "cancelled"' in cancelled.output


def test_datasources_save_resolves_the_dataset(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(contents_commands, "DatalayerClient", DataClient)
    runner = CliRunner()

    saved = runner.invoke(
        app,
        ["contents", "--output", "json", "datasources", "save", QUERY_UID, "Earth data",
         "/results/observations.arrow"],
    )

    assert saved.exit_code == 0, saved.output
    assert DataClient.last.saved == (QUERY_UID, DATASET_UID, "/results/observations.arrow")  # type: ignore[union-attr]
    assert '"uid": "01REV"' in saved.output


def test_dataservers_status_connectors_and_transitions(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(contents_commands, "DatalayerClient", DataClient)
    DataClient.transitions.clear()
    runner = CliRunner()

    status = runner.invoke(app, ["contents", "dataservers", "status", "private-data"])
    connectors = runner.invoke(app, ["contents", "dataservers", "connectors", "private-data"])
    as_json = runner.invoke(app, ["contents", "--output", "json", "dataservers", "status", "private-data"])
    drained = runner.invoke(app, ["contents", "dataservers", "drain", "private-data"])
    resumed = runner.invoke(app, ["contents", "dataservers", "resume", "private-data"])
    declined = runner.invoke(app, ["contents", "dataservers", "revoke", "private-data"], input="n\n")
    revoked = runner.invoke(app, ["contents", "dataservers", "revoke", "private-data", "--yes"])
    wrong_kind = runner.invoke(app, ["contents", "dataservers", "status", "earth-observation"])

    assert status.exit_code == 0, status.output
    assert "ready" in status.output and "1a2b" in status.output
    assert connectors.exit_code == 0, connectors.output
    assert "sql" in connectors.output and "select, describe" in connectors.output
    assert as_json.exit_code == 0 and '"lease_seconds": 90' in as_json.output
    assert drained.exit_code == 0 and "draining" in drained.output
    assert resumed.exit_code == 0 and "ready" in resumed.output
    assert declined.exit_code == 1
    assert revoked.exit_code == 0 and "revoked" in revoked.output
    assert DataClient.transitions == ["drain", "resume", "revoke"]
    assert wrong_kind.exit_code == 1 and "not a Dataserver" in wrong_kind.output


def test_contents_operations_commands_reach_the_dead_letter(monkeypatch: pytest.MonkeyPatch) -> None:
    calls: list[tuple] = []

    class Operations(Client):
        def list_dead_letter_operations(self, *, rows=100):
            calls.append(("dead-letter", rows))
            return DeadLetterList(items=[])

        def quarantine_content_operation(self, uid, *, reason):
            calls.append(("quarantine", uid, reason))
            return OperationView.model_validate(_operation_view())

        def requeue_content_operation(self, uid):
            calls.append(("requeue", uid))
            return OperationView.model_validate(_operation_view(status="pending", error_code=None))

    monkeypatch.setattr(contents_commands, "DatalayerClient", Operations)
    runner = CliRunner()
    listed = runner.invoke(app, ["contents", "--output", "json", "operations", "dead-letter", "--rows", "20"])
    held = runner.invoke(app, ["contents", "--output", "json", "operations", "quarantine", "01OPERATION00000000000000", "--reason", "looking"])
    again = runner.invoke(app, ["contents", "--output", "json", "operations", "requeue", "01OPERATION00000000000000"])

    assert listed.exit_code == 0, listed.output
    assert held.exit_code == 0, held.output
    assert again.exit_code == 0, again.output
    assert calls == [("dead-letter", 20), ("quarantine", "01OPERATION00000000000000", "looking"), ("requeue", "01OPERATION00000000000000")]
    assert json.loads(again.output)["status"] == "pending"


def _operation_view(status: str = "failed", error_code: str | None = "RETRY_EXHAUSTED") -> dict:
    return {
        "uid": "01OPERATION00000000000000", "operation_kind": "volume-provision", "status": status,
        "attempt": 5, "max_attempts": 5, "cancellation_requested": False, "source_uid": UID,
        "error_code": error_code, "error_message": "operator away", "result": None,
        "created_at": "2026-08-26T00:00:00Z", "updated_at": "2026-08-26T00:00:00Z", "completed_at": None,
    }

