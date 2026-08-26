# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

from __future__ import annotations

from types import SimpleNamespace

from typer.testing import CliRunner

import datalayer_core.cli.commands.contents as contents_commands
from datalayer_core.cli.__main__ import app
from datalayer_core.mixins.contents import ConditionalCatalogSource
from datalayer_core.models.contents.generated import (
    CatalogSource,
    AttachmentList,
    ContentAttachment,
    ContentObject,
    ObjectList,
    Sharing,
    SourceList,
    TransferView,
    VersionList,
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
        self.replaced = None

    def list_content_sources(self, **kwargs):
        return SourceList(items=[catalog_source()], next_cursor="next")

    def get_content_source(self, reference):
        if reference not in {UID, "Earth data"}:
            raise RuntimeError("not found")
        return ConditionalCatalogSource(catalog_source(), '"v1.hash"')

    def get_content_source_sharing(self, source_uid):
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

    def replace_content_source_sharing(self, source_uid, sharing, *, etag):
        self.replaced = SimpleNamespace(source_uid=source_uid, sharing=sharing, etag=etag)
        return ConditionalCatalogSource(catalog_source(), '"v1.next"')

    def list_user_folder_objects(self, **kwargs):
        return ObjectList(items=[content_object()], next_cursor=None)

    def stat_user_folder_object(self, path):
        return content_object(path)

    def list_user_folder_object_versions(self, object_uid):
        return VersionList(items=[], next_cursor=None)

    def restore_user_folder_object(self, object_uid, version, **kwargs):
        return content_object()

    def upload_user_folder_file(self, local_path, destination_path, **kwargs):
        self.uploaded = (local_path, destination_path, kwargs)
        return transfer_view("succeeded")

    def iter_user_folder_object(self, object_uid):
        yield b"downloaded"

    def get_content_transfer(self, transfer_uid):
        return transfer_view("running")

    def cancel_content_transfer(self, transfer_uid):
        return transfer_view("cancelled")

    def create_content_attachment(self, request, *, idempotency_key):
        self.attachment_request = (request, idempotency_key)
        return attachment_view()

    def create_content_source(self, request, *, idempotency_key):
        self.source_request = (request, idempotency_key)
        return ConditionalCatalogSource(catalog_source(), '"v1.created"')

    def list_content_attachments(self, **kwargs):
        return AttachmentList(items=[attachment_view()])

    def revoke_content_attachment(self, attachment_uid):
        return attachment_view(status="revoked")


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


def test_contents_list_and_describe_support_machine_output(monkeypatch) -> None:
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


def test_contents_sharing_grant_uses_uid_and_conditional_write(monkeypatch) -> None:
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
    assert Client.last.replaced.etag == '"v1.hash"'
    assert Client.last.replaced.sharing["grants"][-1]["access_level"] == "execute"


def test_contents_upload_download_and_transfer_commands(monkeypatch, tmp_path) -> None:
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


def test_contents_sandbox_attachment_commands(monkeypatch) -> None:
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


def test_contents_volume_attach_and_dataset_materialize(monkeypatch) -> None:
    monkeypatch.setattr(contents_commands, "DatalayerClient", Client)
    runner = CliRunner()

    volume = runner.invoke(
        app,
        [
            "contents", "volumes", "attach", UID,
            "01B3TA5NDEKTSV4RRFFQ69G5FA",
            "--path", "/home/jovyan/volumes/work",
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
            "contents", "datasets", "materialize", UID,
            "--revision", "01REVISION00000000000000000",
            "--sandbox", "01B3TA5NDEKTSV4RRFFQ69G5FA",
            "--path", "/home/jovyan/datasets/earth",
        ],
    )
    assert dataset.exit_code == 0, dataset.stdout
    assert Client.last is not None
    dataset_request = Client.last.attachment_request[0]
    assert dataset_request["delivery"] == "materialize"
    assert dataset_request["mode"] == "ro"
    assert dataset_request["revision_uid"] == "01REVISION00000000000000000"


def test_contents_cloud_storage_create_keeps_only_credential_reference(monkeypatch) -> None:
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


def test_contents_download_refuses_overwrite_with_nonzero_exit(monkeypatch, tmp_path) -> None:
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
