# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

# Copyright (c) 2023-2026 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""Typed transport methods for the Datalayer Contents catalog."""

from __future__ import annotations

from dataclasses import dataclass
import hashlib
from pathlib import Path
from typing import Any, Callable, Iterator, Mapping
from urllib.parse import urlencode

from pydantic import BaseModel

from datalayer_core.models.contents.generated import (
    AttachmentCreate,
    AttachmentList,
    CatalogSource,
    ContentAttachment,
    ContentAttachmentManifest,
    DatasetPublication,
    DatasetPublicationCreate,
    DatasetPublicationList,
    DatasetRevision,
    DatasetRevisionCreate,
    DatasetRevisionList,
    ContentObject,
    ContentSourceCreate,
    ContentSourceUpdate,
    EffectivePermissions,
    OperationView,
    ObjectList,
    RestoreRequest,
    Sharing,
    SourceList,
    TransferCreate,
    TransferList,
    TransferView,
    SyncConflictList,
    SyncCreate,
    SyncReconcile,
    SyncReport,
    SyncSessionList,
    SyncSessionView,
    HomeFolderQuota,
    VersionList,
)


@dataclass(frozen=True)
class ConditionalCatalogSource:
    """A source representation and the opaque ETag required for mutation."""

    value: CatalogSource
    etag: str


def _payload(value: BaseModel | Mapping[str, Any]) -> dict[str, Any]:
    if isinstance(value, BaseModel):
        return value.model_dump(mode="json", exclude_unset=True)
    return dict(value)


class ContentsMixin:
    """Authenticated, generated-model-backed Contents REST transport."""

    def _contents_url(self, path: str = "") -> str:
        return f"{self.urls.contents_url}/api/contents/v1{path}"  # type: ignore[attr-defined]

    def list_content_sources(
        self,
        *,
        kind: str | None = None,
        space_uid: str | None = None,
        cursor: str | None = None,
        limit: int = 50,
    ) -> SourceList:
        parameters = {"limit": limit}
        if kind is not None:
            parameters["kind"] = kind
        if space_uid is not None:
            parameters["space_uid"] = space_uid
        if cursor is not None:
            parameters["cursor"] = cursor
        response = self._fetch(  # type: ignore[attr-defined]
            f"{self._contents_url('/sources')}?{urlencode(parameters)}",
            method="GET",
        )
        return SourceList.model_validate(response.json())

    def create_content_attachment(
        self,
        request: AttachmentCreate | Mapping[str, Any],
        *,
        idempotency_key: str,
    ) -> ContentAttachment:
        response = self._fetch(  # type: ignore[attr-defined]
            self._contents_url("/attachments"),
            method="POST",
            headers={"Idempotency-Key": idempotency_key},
            json=_payload(request),
        )
        return ContentAttachment.model_validate(response.json())

    def create_dataset_revision(self, source_uid: str,
        request: DatasetRevisionCreate | Mapping[str, Any], *,
        idempotency_key: str) -> DatasetRevision:
        response = self._fetch(self._contents_url(f"/sources/{source_uid}/revisions"),
            method="POST", headers={"Idempotency-Key": idempotency_key},
            json=_payload(request))  # type: ignore[attr-defined]
        return DatasetRevision.model_validate(response.json())

    def list_dataset_revisions(self, source_uid: str) -> DatasetRevisionList:
        response = self._fetch(self._contents_url(f"/sources/{source_uid}/revisions"),
            method="GET")  # type: ignore[attr-defined]
        return DatasetRevisionList.model_validate(response.json())

    def get_dataset_revision(self, source_uid: str, revision_uid: str) -> DatasetRevision:
        response = self._fetch(self._contents_url(
            f"/sources/{source_uid}/revisions/{revision_uid}"), method="GET")  # type: ignore[attr-defined]
        return DatasetRevision.model_validate(response.json())

    def create_dataset_publication(self, source_uid: str,
        request: DatasetPublicationCreate | Mapping[str, Any], *,
        idempotency_key: str) -> DatasetPublication:
        response = self._fetch(self._contents_url(f"/sources/{source_uid}/publications"),
            method="POST", headers={"Idempotency-Key": idempotency_key},
            json=_payload(request))  # type: ignore[attr-defined]
        return DatasetPublication.model_validate(response.json())

    def list_dataset_publications(self, source_uid: str) -> DatasetPublicationList:
        response = self._fetch(self._contents_url(f"/sources/{source_uid}/publications"),
            method="GET")  # type: ignore[attr-defined]
        return DatasetPublicationList.model_validate(response.json())

    def unpublish_dataset(self, source_uid: str, publication_uid: str) -> DatasetPublication:
        response = self._fetch(self._contents_url(
            f"/sources/{source_uid}/publications/{publication_uid}"), method="DELETE")  # type: ignore[attr-defined]
        return DatasetPublication.model_validate(response.json())

    def list_content_attachments(
        self,
        *,
        sandbox_uid: str | None = None,
        source_uid: str | None = None,
        active: bool = False,
    ) -> AttachmentList:
        parameters: dict[str, str] = {"active": str(active).lower()}
        if sandbox_uid is not None:
            parameters["sandbox_uid"] = sandbox_uid
        if source_uid is not None:
            parameters["source_uid"] = source_uid
        response = self._fetch(  # type: ignore[attr-defined]
            f"{self._contents_url('/attachments')}?{urlencode(parameters)}",
            method="GET",
        )
        return AttachmentList.model_validate(response.json())

    def get_content_attachment_manifest(
        self, sandbox_uid: str
    ) -> ContentAttachmentManifest:
        response = self._fetch(  # type: ignore[attr-defined]
            self._contents_url(f"/attachments/manifest/{sandbox_uid}"),
            method="GET",
        )
        return ContentAttachmentManifest.model_validate(response.json())

    def revoke_content_attachment(self, attachment_uid: str) -> ContentAttachment:
        response = self._fetch(  # type: ignore[attr-defined]
            self._contents_url(f"/attachments/{attachment_uid}"), method="DELETE"
        )
        return ContentAttachment.model_validate(response.json())

    def create_content_source(
        self,
        source: ContentSourceCreate | Mapping[str, Any],
        *,
        idempotency_key: str,
    ) -> ConditionalCatalogSource:
        response = self._fetch(  # type: ignore[attr-defined]
            self._contents_url("/sources"),
            method="POST",
            headers={"Idempotency-Key": idempotency_key},
            json=_payload(source),
        )
        return ConditionalCatalogSource(
            CatalogSource.model_validate(response.json()), response.headers["ETag"]
        )

    def get_content_source(self, source_uid: str) -> ConditionalCatalogSource:
        response = self._fetch(  # type: ignore[attr-defined]
            self._contents_url(f"/sources/{source_uid}"), method="GET"
        )
        return ConditionalCatalogSource(
            CatalogSource.model_validate(response.json()), response.headers["ETag"]
        )

    def get_home_folder(self) -> ConditionalCatalogSource:
        response = self._fetch(  # type: ignore[attr-defined]
            self._contents_url("/sources/home-folder"), method="GET"
        )
        return ConditionalCatalogSource(
            CatalogSource.model_validate(response.json()), response.headers["ETag"]
        )

    def list_user_folder_objects(
        self,
        *,
        prefix: str | None = None,
        cursor: str | None = None,
        limit: int = 100,
        order: str = "path",
    ) -> ObjectList:
        parameters: dict[str, str | int] = {"limit": limit, "order": order}
        if prefix is not None:
            parameters["prefix"] = prefix
        if cursor is not None:
            parameters["cursor"] = cursor
        response = self._fetch(  # type: ignore[attr-defined]
            f"{self._contents_url('/sources/home-folder/objects')}?{urlencode(parameters)}",
            method="GET",
        )
        return ObjectList.model_validate(response.json())

    def get_home_folder_quota(self) -> HomeFolderQuota:
        response = self._fetch(  # type: ignore[attr-defined]
            self._contents_url("/sources/home-folder/quota"), method="GET"
        )
        return HomeFolderQuota.model_validate(response.json())

    def stat_user_folder_object(self, path: str) -> ContentObject:
        response = self._fetch(  # type: ignore[attr-defined]
            f"{self._contents_url('/sources/home-folder/objects/stat')}?{urlencode({'path': path})}",
            method="GET",
        )
        return ContentObject.model_validate(response.json())

    def list_user_folder_object_versions(
        self,
        object_uid: str,
        *,
        cursor: str | None = None,
        limit: int = 100,
    ) -> VersionList:
        parameters: dict[str, str | int] = {"limit": limit}
        if cursor is not None:
            parameters["cursor"] = cursor
        response = self._fetch(  # type: ignore[attr-defined]
            f"{self._contents_url(f'/sources/home-folder/objects/{object_uid}/versions')}?{urlencode(parameters)}",
            method="GET",
        )
        return VersionList.model_validate(response.json())

    def delete_user_folder_object(
        self, object_uid: str, *, idempotency_key: str
    ) -> ContentObject:
        response = self._fetch(  # type: ignore[attr-defined]
            self._contents_url(f"/sources/home-folder/objects/{object_uid}"),
            method="DELETE",
            headers={"Idempotency-Key": idempotency_key},
        )
        return ContentObject.model_validate(response.json())

    def restore_user_folder_object(
        self,
        object_uid: str,
        version_uid: str,
        *,
        idempotency_key: str,
    ) -> ContentObject:
        response = self._fetch(  # type: ignore[attr-defined]
            self._contents_url(
                f"/sources/home-folder/objects/{object_uid}/restore"
            ),
            method="POST",
            headers={"Idempotency-Key": idempotency_key},
            json=RestoreRequest(version_uid=version_uid).model_dump(mode="json"),
        )
        return ContentObject.model_validate(response.json())

    def create_content_transfer(
        self,
        request: TransferCreate | Mapping[str, Any],
        *,
        idempotency_key: str,
    ) -> TransferView:
        response = self._fetch(  # type: ignore[attr-defined]
            self._contents_url("/transfers"),
            method="POST",
            headers={"Idempotency-Key": idempotency_key},
            json=_payload(request),
        )
        return TransferView.model_validate(response.json())

    def get_content_transfer(self, transfer_uid: str) -> TransferView:
        response = self._fetch(  # type: ignore[attr-defined]
            self._contents_url(f"/transfers/{transfer_uid}"), method="GET"
        )
        return TransferView.model_validate(response.json())

    def list_content_transfers(
        self,
        *,
        active: bool = False,
        cursor: str | None = None,
        limit: int = 50,
    ) -> TransferList:
        parameters: dict[str, str | int] = {
            "active": str(active).lower(),
            "limit": limit,
        }
        if cursor is not None:
            parameters["cursor"] = cursor
        response = self._fetch(  # type: ignore[attr-defined]
            f"{self._contents_url('/transfers')}?{urlencode(parameters)}",
            method="GET",
        )
        return TransferList.model_validate(response.json())

    def upload_content_transfer_part(
        self,
        transfer_uid: str,
        part_number: int,
        content: bytes,
    ) -> TransferView:
        checksum = hashlib.sha256(content).hexdigest()
        response = self._fetch(  # type: ignore[attr-defined]
            self._contents_url(f"/transfers/{transfer_uid}/parts/{part_number}"),
            method="PUT",
            headers={
                "Content-Type": "application/octet-stream",
                "Content-SHA256": checksum,
            },
            data=content,
        )
        return TransferView.model_validate(response.json())

    def complete_content_transfer(self, transfer_uid: str) -> TransferView:
        response = self._fetch(  # type: ignore[attr-defined]
            self._contents_url(f"/transfers/{transfer_uid}/complete"), method="POST"
        )
        return TransferView.model_validate(response.json())

    def cancel_content_transfer(self, transfer_uid: str) -> TransferView:
        response = self._fetch(  # type: ignore[attr-defined]
            self._contents_url(f"/transfers/{transfer_uid}"), method="DELETE"
        )
        return TransferView.model_validate(response.json())

    def upload_user_folder_file(
        self,
        local_path: str | Path,
        destination_path: str,
        *,
        idempotency_key: str,
        media_type: str = "application/octet-stream",
        overwrite: str = "reject",
        chunk_size: int = 8 * 1024 * 1024,
        progress: Callable[[int, int, str], None] | None = None,
    ) -> TransferView:
        """Create or resume a file upload without buffering the file in memory."""

        path = Path(local_path)
        size = path.stat().st_size
        digest = hashlib.sha256()
        with path.open("rb") as stream:
            while chunk := stream.read(chunk_size):
                digest.update(chunk)
        transfer = self.create_content_transfer(
            {
                "destination_uri": (
                    f"home-folder:///{destination_path.lstrip('/')}"
                ),
                "size": size,
                "checksum": digest.hexdigest(),
                "media_type": media_type,
                "overwrite": overwrite,
            },
            idempotency_key=idempotency_key,
        )
        verified = {part.number for part in transfer.parts or []}
        uploaded = sum(part.size for part in transfer.parts or [])
        with path.open("rb") as stream:
            number = 0
            while chunk := stream.read(chunk_size):
                if number not in verified:
                    self.upload_content_transfer_part(
                        transfer.uid, number, chunk
                    )
                    uploaded += len(chunk)
                    if progress is not None:
                        progress(uploaded, size, transfer.uid)
                number += 1
        return self.complete_content_transfer(transfer.uid)

    def iter_user_folder_object(
        self,
        object_uid: str,
        *,
        version_uid: str | None = None,
        byte_range: str | None = None,
        chunk_size: int = 1024 * 1024,
    ) -> Iterator[bytes]:
        parameters = {}
        if version_uid is not None:
            parameters["version_uid"] = version_uid
        query = f"?{urlencode(parameters)}" if parameters else ""
        headers = {"Range": byte_range} if byte_range else {}
        response = self._fetch(  # type: ignore[attr-defined]
            self._contents_url(
                f"/sources/home-folder/objects/{object_uid}/download{query}"
            ),
            method="GET",
            headers=headers,
            stream=True,
        )
        yield from response.iter_content(chunk_size=chunk_size)

    def update_content_source(
        self,
        source_uid: str,
        update: ContentSourceUpdate | Mapping[str, Any],
        *,
        etag: str,
    ) -> ConditionalCatalogSource:
        response = self._fetch(  # type: ignore[attr-defined]
            self._contents_url(f"/sources/{source_uid}"),
            method="PATCH",
            headers={"If-Match": etag},
            json=_payload(update),
        )
        return ConditionalCatalogSource(
            CatalogSource.model_validate(response.json()), response.headers["ETag"]
        )

    def archive_content_source(
        self, source_uid: str, *, etag: str
    ) -> ConditionalCatalogSource:
        response = self._fetch(  # type: ignore[attr-defined]
            self._contents_url(f"/sources/{source_uid}"),
            method="DELETE",
            headers={"If-Match": etag},
        )
        return ConditionalCatalogSource(
            CatalogSource.model_validate(response.json()), response.headers["ETag"]
        )

    def get_content_source_permissions(self, source_uid: str) -> EffectivePermissions:
        response = self._fetch(  # type: ignore[attr-defined]
            self._contents_url(f"/sources/{source_uid}/permissions"), method="GET"
        )
        return EffectivePermissions.model_validate(response.json())

    def get_content_source_sharing(self, source_uid: str) -> Sharing:
        response = self._fetch(  # type: ignore[attr-defined]
            self._contents_url(f"/sources/{source_uid}/sharing"), method="GET"
        )
        return Sharing.model_validate(response.json())

    def replace_content_source_sharing(
        self,
        source_uid: str,
        sharing: Sharing | Mapping[str, Any],
        *,
        etag: str,
    ) -> ConditionalCatalogSource:
        response = self._fetch(  # type: ignore[attr-defined]
            self._contents_url(f"/sources/{source_uid}/sharing"),
            method="PUT",
            headers={"If-Match": etag},
            json=_payload(sharing),
        )
        return ConditionalCatalogSource(
            CatalogSource.model_validate(response.json()), response.headers["ETag"]
        )

    # -- synchronization -------------------------------------------------

    def create_content_sync(
        self,
        request: SyncCreate | Mapping[str, Any],
        *,
        idempotency_key: str,
    ) -> SyncSessionView:
        """Open a session; the answer carries the first plan."""
        response = self._fetch(  # type: ignore[attr-defined]
            self._contents_url("/sync"),
            method="POST",
            headers={"Idempotency-Key": idempotency_key},
            json=_payload(request),
        )
        return SyncSessionView.model_validate(response.json())

    def get_content_sync(self, session_uid: str) -> SyncSessionView:
        response = self._fetch(  # type: ignore[attr-defined]
            self._contents_url(f"/sync/{session_uid}"), method="GET"
        )
        return SyncSessionView.model_validate(response.json())

    def list_content_syncs(
        self, *, active: bool = False, cursor: str | None = None, limit: int = 50
    ) -> SyncSessionList:
        parameters: dict[str, str | int] = {"active": str(active).lower(), "limit": limit}
        if cursor is not None:
            parameters["cursor"] = cursor
        response = self._fetch(  # type: ignore[attr-defined]
            f"{self._contents_url('/sync')}?{urlencode(parameters)}", method="GET"
        )
        return SyncSessionList.model_validate(response.json())

    def reconcile_content_sync(
        self, session_uid: str, request: SyncReconcile | Mapping[str, Any]
    ) -> SyncSessionView:
        """A fresh local manifest; a fresh plan. How a watch pass and a reconnect both work."""
        response = self._fetch(  # type: ignore[attr-defined]
            self._contents_url(f"/sync/{session_uid}/reconcile"),
            method="POST",
            json=_payload(request),
        )
        return SyncSessionView.model_validate(response.json())

    def heartbeat_content_sync(self, session_uid: str) -> SyncSessionView:
        response = self._fetch(  # type: ignore[attr-defined]
            self._contents_url(f"/sync/{session_uid}/heartbeat"), method="POST"
        )
        return SyncSessionView.model_validate(response.json())

    def report_content_sync(
        self, session_uid: str, request: SyncReport | Mapping[str, Any]
    ) -> SyncSessionView:
        response = self._fetch(  # type: ignore[attr-defined]
            self._contents_url(f"/sync/{session_uid}/report"),
            method="POST",
            json=_payload(request),
        )
        return SyncSessionView.model_validate(response.json())

    def cancel_content_sync(self, session_uid: str) -> SyncSessionView:
        response = self._fetch(  # type: ignore[attr-defined]
            self._contents_url(f"/sync/{session_uid}"), method="DELETE"
        )
        return SyncSessionView.model_validate(response.json())

    def list_content_sync_conflicts(
        self, session_uid: str, *, open_only: bool = False
    ) -> SyncConflictList:
        response = self._fetch(  # type: ignore[attr-defined]
            f"{self._contents_url(f'/sync/{session_uid}/conflicts')}?open_only={str(open_only).lower()}",
            method="GET",
        )
        return SyncConflictList.model_validate(response.json())

    def resolve_content_sync_conflict(
        self, session_uid: str, conflict_uid: str, *, use: str
    ) -> SyncSessionView:
        response = self._fetch(  # type: ignore[attr-defined]
            self._contents_url(f"/sync/{session_uid}/conflicts/{conflict_uid}/resolve"),
            method="POST",
            json={"use": use},
        )
        return SyncSessionView.model_validate(response.json())

    def get_content_operation(self, operation_uid: str) -> OperationView:
        response = self._fetch(  # type: ignore[attr-defined]
            self._contents_url(f"/operations/{operation_uid}"), method="GET"
        )
        return OperationView.model_validate(response.json())

    def cancel_content_operation(self, operation_uid: str) -> OperationView:
        response = self._fetch(  # type: ignore[attr-defined]
            self._contents_url(f"/operations/{operation_uid}/cancel"), method="POST"
        )
        return OperationView.model_validate(response.json())
