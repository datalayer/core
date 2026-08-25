# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

from __future__ import annotations

import json
from pathlib import Path

from datalayer_core.mixins.contents import ContentsMixin
from datalayer_core.models.contents.generated import (
    ContentAttachmentManifest,
    ContentSource,
    SourceStatus,
)
from datalayer_core.utils.urls import DatalayerURLs

UID = "01ARZ3NDEKTSV4RRFFQ69G5FAV"
OWNER_UID = "01BX5ZZKBKACTAV9WEVGEMMVRZ"
CONTRACT_FIXTURES = (
    Path(__file__).parents[2]
    / "src/models/contents/__fixtures__/v1-contracts.json"
)


def source_response(name: str = "Dataset") -> dict:
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
    def __init__(self, value: dict, etag: str = '"v1.hash"') -> None:
        self._value = value
        self.headers = {"ETag": etag}

    def json(self) -> dict:
        return self._value


class Client(ContentsMixin):
    def __init__(self) -> None:
        self.urls = DatalayerURLs.from_environment(contents_url="https://contents.test")
        self.calls: list[tuple[str, dict]] = []
        self.responses: list[Response] = []

    def _fetch(self, url: str, **kwargs):
        self.calls.append((url, kwargs))
        return self.responses.pop(0)


def test_contents_client_preserves_etag_for_conditional_mutation() -> None:
    client = Client()
    client.responses = [Response(source_response()), Response(source_response("Changed"), '"v1.next"')]

    fetched = client.get_content_source(UID)
    changed = client.update_content_source(
        UID, {"name": "Changed"}, etag=fetched.etag
    )

    assert fetched.value.source.status is SourceStatus.ready
    assert changed.value.source.name == "Changed"
    assert changed.etag == '"v1.next"'
    assert client.calls[1][1]["headers"] == {"If-Match": '"v1.hash"'}
    assert client.calls[1][1]["json"] == {"name": "Changed"}


def test_contents_client_resolves_the_server_managed_user_folder() -> None:
    client = Client()
    client.responses = [Response(source_response("User Folder"), '"folder.hash"')]

    folder = client.get_user_folder()

    assert folder.value.source.name == "User Folder"
    assert folder.etag == '"folder.hash"'
    assert client.calls[0][0].endswith("/sources/user-folder")


def test_contents_client_creates_and_reads_attachment_manifest() -> None:
    attachment = {
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
    assert client.calls[0][1]["headers"] == {
        "Idempotency-Key": "attach-volume"
    }


def test_contents_client_browses_deletes_and_restores_user_folder_objects() -> None:
    object_value = {
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

    page = client.list_user_folder_objects(prefix="reports", limit=25)
    deleted = client.delete_user_folder_object(
        object_value["uid"], idempotency_key="delete-earth"
    )
    restored = client.restore_user_folder_object(
        object_value["uid"],
        object_value["current_version_uid"],
        idempotency_key="restore-earth",
    )

    assert page.items[0].path == "reports/earth.csv"
    assert page.next_cursor == "signed.cursor"
    assert deleted.deleted is True
    assert restored.deleted is False
    assert client.calls[1][1]["headers"] == {
        "Idempotency-Key": "delete-earth"
    }
    assert client.calls[2][1]["json"] == {
        "version_uid": "01VERSION00000000000000000"
    }


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
    operation = {
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
