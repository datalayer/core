# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""Typed transport methods for the Datalayer Contents catalog."""

from __future__ import annotations

import hashlib
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Callable, Iterator, Mapping
from urllib.parse import urlencode

from pydantic import BaseModel

from datalayer_core.models.contents.generated import (
    AttachmentCreate,
    AttachmentList,
    BridgeCreate,
    BridgeHeartbeat,
    BridgeList,
    BridgeOpened,
    BridgeSession,
    CatalogSource,
    ContentAttachment,
    ContentAttachmentManifest,
    ContentObject,
    ContentSourceCreate,
    ContentSourceUpdate,
    DatasetPublication,
    DatasetPublicationCreate,
    DatasetPublicationList,
    DatasetRevision,
    DatasetRevisionCreate,
    DatasetRevisionList,
    EffectivePermissions,
    HomeFolderQuota,
    ObjectList,
    DeadLetterList,
    OperationView,
    RestoreRequest,
    Sharing,
    SourceList,
    SyncConflictList,
    SyncCreate,
    SyncReconcile,
    SyncReport,
    SyncSessionList,
    SyncSessionView,
    TransferCreate,
    TransferList,
    TransferView,
    VersionList,
)
from datalayer_core.models.contents.datasources import (
    CapabilityTicket,
    DataServerConnectivity,
    DataServerStatus,
    DatasourceCapabilities,
    DatasourceQuery,
    DatasourceQueryList,
    DatasourceSchema,
    DatasourceTest,
    IssuedIdentity,
)
from datalayer_core.models.contents.mcp import (
    McpApproval,
    McpApprovalList,
    McpCall,
    McpCallList,
    McpHealth,
    McpSession,
    McpSessionList,
    McpToolManifest,
)


_STATUS_IN_MESSAGE = re.compile(r"\bstatus=(\d{3})\b")


def http_status_of(error: BaseException) -> int | None:
    """
    The HTTP status an error of the transport carries, if it carries one.

    `_fetch` wraps a failed request in a `RuntimeError` whose message names
    the status and whose cause is the `requests` error with the response; a
    caller that wants to treat `404` as an answer — nothing there yet — rather
    than a failure reads it from here, from either place.
    """
    cause = error.__cause__
    response = getattr(cause, "response", None)
    if response is not None and getattr(response, "status_code", None):
        return int(response.status_code)
    match = _STATUS_IN_MESSAGE.search(str(error))
    return int(match.group(1)) if match else None


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

    def _runtimes_url(self, path: str = "") -> str:
        return f"{self.urls.runtimes_url}/api/runtimes/v1{path}"  # type: ignore[attr-defined]

    # Environments -----------------------------------------------------------
    #
    # The content an Environment brings is not a catalog source: it is chosen
    # by the Environment, which the Runtimes service owns. So these two read
    # the Runtimes service, through the same authenticated transport.

    def list_environments(self) -> list[dict[str, Any]]:
        """
        List the platform Environments, each with the contents it selects.

        Returns
        -------
        list[dict[str, Any]]
            The Environments as the Runtimes service answers them. Each
            carries ``contents`` as ``[{uid, name, mount, permissions}]``,
            empty when the Environment selects none.
        """
        response = self._fetch(  # type: ignore[attr-defined]
            self._runtimes_url("/environments"), method="GET"
        )
        payload = response.json()
        environments = payload.get("environments", []) if isinstance(payload, dict) else []
        return [
            {**environment, "contents": environment.get("contents") or []}
            for environment in environments
        ]

    def get_environment_contents(
        self, name: str, provider: str = "datalayer"
    ) -> dict[str, Any]:
        """
        Resolve the contents an Environment selects for one sandbox provider.

        Parameters
        ----------
        name : str
            The Environment name.
        provider : str
            The sandbox provider: ``datalayer``, ``daytona``, ``e2b`` or
            ``modal``.

        Returns
        -------
        dict[str, Any]
            ``{environment, provider, supported, contents}`` where each
            content carries ``uid``, ``name``, ``type``, ``mount``,
            ``permissions``, ``revision``, ``sha256``, ``status`` (one of
            ``resolved``, ``unsupported``, ``unresolved``) and ``detail``.
        """
        response = self._fetch(  # type: ignore[attr-defined]
            f"{self._runtimes_url(f'/environments/{name}/contents')}?"
            f"{urlencode({'provider': provider})}",
            method="GET",
        )
        payload = response.json()
        return {
            "environment": payload.get("environment", name),
            "provider": payload.get("provider", provider),
            "supported": bool(payload.get("supported", False)),
            "contents": payload.get("contents") or [],
        }

    def list_content_sources(
        self,
        *,
        kind: str | None = None,
        space_uid: str | None = None,
        cursor: str | None = None,
        limit: int = 50,
    ) -> SourceList:
        parameters: dict[str, Any] = {"limit": limit}
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

    def create_dataset_revision(
        self,
        source_uid: str,
        request: DatasetRevisionCreate | Mapping[str, Any],
        *,
        idempotency_key: str,
    ) -> DatasetRevision:
        response = self._fetch(  # type: ignore[attr-defined]
            self._contents_url(f"/sources/{source_uid}/revisions"),
            method="POST",
            headers={"Idempotency-Key": idempotency_key},
            json=_payload(request),
        )
        return DatasetRevision.model_validate(response.json())

    def list_dataset_revisions(self, source_uid: str) -> DatasetRevisionList:
        response = self._fetch(  # type: ignore[attr-defined]
            self._contents_url(f"/sources/{source_uid}/revisions"), method="GET"
        )
        return DatasetRevisionList.model_validate(response.json())

    def get_dataset_revision(
        self, source_uid: str, revision_uid: str
    ) -> DatasetRevision:
        response = self._fetch(  # type: ignore[attr-defined]
            self._contents_url(f"/sources/{source_uid}/revisions/{revision_uid}"),
            method="GET",
        )
        return DatasetRevision.model_validate(response.json())

    def create_dataset_publication(
        self,
        source_uid: str,
        request: DatasetPublicationCreate | Mapping[str, Any],
        *,
        idempotency_key: str,
    ) -> DatasetPublication:
        response = self._fetch(  # type: ignore[attr-defined]
            self._contents_url(f"/sources/{source_uid}/publications"),
            method="POST",
            headers={"Idempotency-Key": idempotency_key},
            json=_payload(request),
        )
        return DatasetPublication.model_validate(response.json())

    def list_dataset_publications(self, source_uid: str) -> DatasetPublicationList:
        response = self._fetch(  # type: ignore[attr-defined]
            self._contents_url(f"/sources/{source_uid}/publications"), method="GET"
        )
        return DatasetPublicationList.model_validate(response.json())

    def unpublish_dataset(
        self, source_uid: str, publication_uid: str
    ) -> DatasetPublication:
        response = self._fetch(  # type: ignore[attr-defined]
            self._contents_url(f"/sources/{source_uid}/publications/{publication_uid}"),
            method="DELETE",
        )
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

    def list_home_folder_objects(
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

    def stat_home_folder_object(self, path: str) -> ContentObject:
        response = self._fetch(  # type: ignore[attr-defined]
            f"{self._contents_url('/sources/home-folder/objects/stat')}?{urlencode({'path': path})}",
            method="GET",
        )
        return ContentObject.model_validate(response.json())

    def list_home_folder_object_versions(
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

    def delete_home_folder_object(
        self, object_uid: str, *, idempotency_key: str
    ) -> ContentObject:
        response = self._fetch(  # type: ignore[attr-defined]
            self._contents_url(f"/sources/home-folder/objects/{object_uid}"),
            method="DELETE",
            headers={"Idempotency-Key": idempotency_key},
        )
        return ContentObject.model_validate(response.json())

    def restore_home_folder_object(
        self,
        object_uid: str,
        version_uid: str,
        *,
        idempotency_key: str,
    ) -> ContentObject:
        response = self._fetch(  # type: ignore[attr-defined]
            self._contents_url(f"/sources/home-folder/objects/{object_uid}/restore"),
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

    def publish_table(
        self,
        table: Any,
        *,
        relation: str,
        row_group_rows: int = 1_000_000,
    ) -> dict[str, Any]:
        """Publish a table so other people can query it.

        Three calls, made as one: reserve a publication, write its parts, and
        complete it. The caller never names a path — the directory is derived
        from their own uid — and the record is created only once the bytes
        have landed, so a publication either exists or it does not.

        `table` is anything Arrow can take: a pyarrow Table, a pandas or
        polars DataFrame, or anything with `to_arrow()` or `__arrow_c_stream__`.
        It is written as Parquet in parts, because a frame worth publishing is
        one worth streaming.
        """
        import pyarrow as pa
        import pyarrow.parquet as pq

        arrow = _as_arrow_table(table)
        self._fetch(  # type: ignore[attr-defined]
            self._contents_url("/published-tables"),
            method="POST",
            json={"relation": relation},
        )
        # One part per row-group slice. A single part would put the whole
        # frame in one request, which is the thing the two-step shape exists
        # to avoid.
        written = 0
        for index in range(0, max(arrow.num_rows, 1), row_group_rows):
            chunk = arrow.slice(index, row_group_rows)
            if chunk.num_rows == 0 and arrow.num_rows:
                continue
            buffer = pa.BufferOutputStream()
            pq.write_table(chunk, buffer)
            part = f"part-{written:05d}.parquet"
            self._fetch(  # type: ignore[attr-defined]
                self._contents_url(f"/published-tables/{relation}/parts/{part}"),
                method="PUT",
                files={"file": (part, buffer.getvalue().to_pybytes())},
            )
            written += 1
        response = self._fetch(  # type: ignore[attr-defined]
            self._contents_url(f"/published-tables/{relation}/complete"),
            method="POST",
        )
        return dict(response.json())

    def upload_home_folder_file(
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

        return self.upload_file(
            local_path,
            f"home-folder:///{destination_path.lstrip('/')}",
            idempotency_key=idempotency_key,
            media_type=media_type,
            overwrite=overwrite,
            chunk_size=chunk_size,
            progress=progress,
        )

    def upload_dataset_file(
        self,
        local_path: str | Path,
        dataset_uid: str,
        destination_path: str,
        *,
        idempotency_key: str,
        media_type: str = "application/octet-stream",
        overwrite: str = "reject",
        chunk_size: int = 8 * 1024 * 1024,
        progress: Callable[[int, int, str], None] | None = None,
    ) -> TransferView:
        """Capture a file into a Dataset: a result, or a file on a mounted Volume.

        Run where the file is — inside the sandbox — the bytes go up through
        the same verified, resumable transfer as a Home Folder upload and
        become a version of the Dataset; a revision then pins that version.
        """

        return self.upload_file(
            local_path,
            f"dataset://{dataset_uid}/{destination_path.lstrip('/')}",
            idempotency_key=idempotency_key,
            media_type=media_type,
            overwrite=overwrite,
            chunk_size=chunk_size,
            progress=progress,
        )

    def upload_file(
        self,
        local_path: str | Path,
        destination_uri: str,
        *,
        idempotency_key: str,
        media_type: str = "application/octet-stream",
        overwrite: str = "reject",
        chunk_size: int = 8 * 1024 * 1024,
        progress: Callable[[int, int, str], None] | None = None,
    ) -> TransferView:
        """Create or resume a transfer to any destination the service accepts."""

        path = Path(local_path)
        size = path.stat().st_size
        digest = hashlib.sha256()
        with path.open("rb") as stream:
            while chunk := stream.read(chunk_size):
                digest.update(chunk)
        transfer = self.create_content_transfer(
            {
                "destination_uri": destination_uri,
                "size": size,
                "checksum": digest.hexdigest(),
                "media_type": media_type,
                "overwrite": overwrite,
            },
            idempotency_key=idempotency_key,
        )
        verified = {part.number for part in transfer.parts or []}
        uploaded = sum(part.size for part in transfer.parts or [])
        if transfer.parts:
            # Resuming: the parts already verified fix the part size. Cutting
            # the file differently would number the bytes differently, and a
            # "verified" part would then be the wrong bytes.
            chunk_size = transfer.parts[0].size
        with path.open("rb") as stream:
            number = 0
            while chunk := stream.read(chunk_size):
                if number not in verified:
                    self.upload_content_transfer_part(transfer.uid, number, chunk)
                    uploaded += len(chunk)
                    if progress is not None:
                        progress(uploaded, size, transfer.uid)
                number += 1
        return self.complete_content_transfer(transfer.uid)

    def iter_home_folder_object(
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

    def iter_home_folder_file(
        self,
        path: str,
        *,
        byte_range: str | None = None,
        chunk_size: int = 1024 * 1024,
    ) -> Iterator[bytes]:
        """
        Read one file of a Home Folder by its path, ranges included.

        The object download beside this one is keyed by what Contents wrote.
        A folder on the shared filesystem also holds what a notebook wrote,
        and synchronization has to be able to fetch those: a file the catalog
        never heard of is no less a file in the folder.
        """
        query = urlencode({"path": path})
        headers = {"Range": byte_range} if byte_range else {}
        response = self._fetch(  # type: ignore[attr-defined]
            self._contents_url(f"/sources/home-folder/files/content?{query}"),
            method="GET",
            headers=headers,
            stream=True,
        )
        yield from response.iter_content(chunk_size=chunk_size)

    # -- cloud storage ------------------------------------------------------
    #
    # A bucket a person connected, read through Contents with a credential
    # resolved for each request and never returned: the client sees objects
    # and bytes, not keys.

    def list_cloud_storage_objects(
        self, source_uid: str, *, prefix: str = "", cursor: str | None = None
    ) -> dict[str, Any]:
        parameters: dict[str, str] = {"prefix": prefix}
        if cursor:
            parameters["cursor"] = cursor
        return self._fetch(  # type: ignore[attr-defined]
            self._contents_url(f"/sources/{source_uid}/cloud/objects?{urlencode(parameters)}"),
            method="GET",
        ).json()

    def stat_cloud_storage_object(self, source_uid: str, path: str) -> dict[str, Any]:
        return self._fetch(  # type: ignore[attr-defined]
            self._contents_url(
                f"/sources/{source_uid}/cloud/objects/stat?{urlencode({'path': path})}"
            ),
            method="GET",
        ).json()

    def iter_cloud_storage_object(
        self,
        source_uid: str,
        path: str,
        *,
        byte_range: str | None = None,
        chunk_size: int = 1024 * 1024,
    ) -> Iterator[bytes]:
        headers = {"Range": byte_range} if byte_range else {}
        response = self._fetch(  # type: ignore[attr-defined]
            self._contents_url(
                f"/sources/{source_uid}/cloud/objects/content?{urlencode({'path': path})}"
            ),
            method="GET",
            headers=headers,
            stream=True,
        )
        yield from response.iter_content(chunk_size=chunk_size)

    def test_cloud_storage_connection(self, source_uid: str) -> dict[str, Any]:
        """Does the bucket answer with this credential, right now?"""
        return self._fetch(  # type: ignore[attr-defined]
            self._contents_url(f"/sources/{source_uid}/cloud/test"), method="POST"
        ).json()

    def presign_cloud_storage_object(
        self, source_uid: str, path: str, *, operation: str = "get", expires_in: int = 900
    ) -> dict[str, Any]:
        """A URL for one object, one operation, a short while."""
        query = urlencode({"path": path, "operation": operation, "expires_in": expires_in})
        return self._fetch(  # type: ignore[attr-defined]
            self._contents_url(f"/sources/{source_uid}/cloud/objects/presign?{query}"),
            method="POST",
        ).json()

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
        parameters: dict[str, str | int] = {
            "active": str(active).lower(),
            "limit": limit,
        }
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

    def upload_content_sync_block(
        self, session_uid: str, path: str, index: int, content: bytes
    ) -> dict[str, Any]:
        """
        Stage one block of one path of a session, for composition.

        The block-level half of a push: the plan says which blocks the remote
        version lacks, and each goes up on its own, checksummed. The same
        block twice is accepted once.
        """
        checksum = hashlib.sha256(content).hexdigest()
        query = urlencode({"path": path, "index": index})
        response = self._fetch(  # type: ignore[attr-defined]
            self._contents_url(f"/sync/{session_uid}/blocks?{query}"),
            method="POST",
            headers={
                "Content-Type": "application/octet-stream",
                "Content-SHA256": checksum,
            },
            data=content,
        )
        return response.json()

    def compose_content_sync_version(
        self, session_uid: str, request: Mapping[str, Any]
    ) -> ContentObject:
        """
        Publish a new version of a path from its staged blocks and the base version.

        `request` is ``{path, base_version_uid, size, checksum, blocks}``, the
        block hashes being those of the whole file as it now is. The service
        answers ``SYNC_BASE_STALE`` when the base is no longer current — the
        session must be reconciled again — and ``SYNC_BLOCK_MISSING`` naming
        a block that neither the staging area nor the base supplies.
        """
        response = self._fetch(  # type: ignore[attr-defined]
            self._contents_url(f"/sync/{session_uid}/compose"),
            method="POST",
            json=dict(request),
        )
        return ContentObject.model_validate(response.json())

    # -- local bridges -----------------------------------------------------
    #
    # A bridge session is what a `local-bridge` attachment holds while the
    # person's computer serves a folder to the sandbox through the relay.
    # Opening one answers the client's half — its token, the relay to dial,
    # the session key the relay never sees — and never learns the folder's
    # path: what is sent is a fingerprint of it.

    def open_content_bridge(
        self, attachment_uid: str, request: BridgeCreate | Mapping[str, Any]
    ) -> BridgeOpened:
        """
        Open the session for a `local-bridge` attachment, or find it open.

        Idempotent for the same folder while the session is live; another
        folder for the same attachment is refused as `BRIDGE_CONFLICT`.
        """
        response = self._fetch(  # type: ignore[attr-defined]
            self._contents_url(f"/attachments/{attachment_uid}/bridge"),
            method="POST",
            json=_payload(request),
        )
        return BridgeOpened.model_validate(response.json())

    def get_attachment_bridge(self, attachment_uid: str) -> BridgeSession | None:
        """The live session of an attachment; `None` when nothing has dialled yet."""
        try:
            response = self._fetch(  # type: ignore[attr-defined]
                self._contents_url(f"/attachments/{attachment_uid}/bridge"),
                method="GET",
            )
        except RuntimeError as error:
            if http_status_of(error) == 404:
                return None
            raise
        return BridgeSession.model_validate(response.json())

    def get_content_bridge(self, bridge_uid: str) -> BridgeSession:
        response = self._fetch(  # type: ignore[attr-defined]
            self._contents_url(f"/bridges/{bridge_uid}"), method="GET"
        )
        return BridgeSession.model_validate(response.json())

    def list_content_bridges(self, *, active: bool = False) -> BridgeList:
        """The caller's sessions, newest first; `active` leaves out the ended ones."""
        response = self._fetch(  # type: ignore[attr-defined]
            f"{self._contents_url('/bridges')}?active={str(active).lower()}",
            method="GET",
        )
        return BridgeList.model_validate(response.json())

    def heartbeat_content_bridge(self, bridge_uid: str) -> BridgeHeartbeat:
        """Still here: the session stays alive and the answer carries a fresh token."""
        response = self._fetch(  # type: ignore[attr-defined]
            self._contents_url(f"/bridges/{bridge_uid}/heartbeat"), method="POST"
        )
        return BridgeHeartbeat.model_validate(response.json())

    def revoke_content_bridge(self, bridge_uid: str) -> BridgeSession:
        """End the session; the attachment goes `revoking` with it."""
        response = self._fetch(  # type: ignore[attr-defined]
            self._contents_url(f"/bridges/{bridge_uid}"), method="DELETE"
        )
        return BridgeSession.model_validate(response.json())

    # -- MCP ---------------------------------------------------------------
    #
    # An MCP source is a server somebody connected. Nothing here talks to
    # that server: Contents does, with the credential it holds, through a
    # session it opens for the caller. What comes back is tool definitions,
    # call records and approvals — and for a call that moved bytes, the
    # Transfer or object that holds them rather than the bytes.

    def discover_mcp_tools(self, source_uid: str) -> McpToolManifest:
        """The tools and resources the server behind a source offers."""
        response = self._fetch(  # type: ignore[attr-defined]
            self._contents_url(f"/sources/{source_uid}/mcp/tools"), method="GET"
        )
        return McpToolManifest.model_validate(response.json())

    def test_mcp_source(self, source_uid: str) -> McpHealth:
        """Does the server answer through this source, right now?"""
        response = self._fetch(  # type: ignore[attr-defined]
            self._contents_url(f"/sources/{source_uid}/mcp/health"), method="POST"
        )
        return McpHealth.model_validate(response.json())

    def create_mcp_session(
        self,
        source_uid: str,
        *,
        sandbox_uid: str | None = None,
        tools: list[str] | None = None,
        expires_in: int | None = None,
        idempotency_key: str | None = None,
    ) -> McpSession:
        """
        Open a scoped connection to an MCP source on the caller's behalf.

        The session's allowlists are the source's, narrowed by ``tools`` when
        given; asking for a tool the source does not allow is refused rather
        than silently dropped.
        """
        payload: dict[str, Any] = {"source_uid": source_uid}
        if sandbox_uid is not None:
            payload["sandbox_uid"] = sandbox_uid
        if tools is not None:
            payload["tools"] = list(tools)
        if expires_in is not None:
            payload["expires_in"] = expires_in
        headers = {"Idempotency-Key": idempotency_key} if idempotency_key else {}
        response = self._fetch(  # type: ignore[attr-defined]
            self._contents_url("/mcp-sessions"),
            method="POST",
            headers=headers,
            json=payload,
        )
        return McpSession.model_validate(response.json())

    def get_mcp_session(self, session_uid: str) -> McpSession:
        response = self._fetch(  # type: ignore[attr-defined]
            self._contents_url(f"/mcp-sessions/{session_uid}"), method="GET"
        )
        return McpSession.model_validate(response.json())

    def list_mcp_sessions(self) -> McpSessionList:
        """Every session the caller opened; the contract lists them whole."""
        response = self._fetch(  # type: ignore[attr-defined]
            self._contents_url("/mcp-sessions"), method="GET"
        )
        return McpSessionList.model_validate(response.json())

    def revoke_mcp_session(self, session_uid: str) -> McpSession:
        response = self._fetch(  # type: ignore[attr-defined]
            self._contents_url(f"/mcp-sessions/{session_uid}"), method="DELETE"
        )
        return McpSession.model_validate(response.json())

    def call_mcp_tool(
        self,
        session_uid: str,
        tool: str,
        arguments: Mapping[str, Any] | None = None,
        *,
        destination_uri: str | None = None,
    ) -> McpCall:
        """
        Invoke one tool through a session.

        The answer is the call record, not necessarily the result: under an
        ``explicit`` approval policy it comes back ``pending-approval`` with
        the approval to decide, and a bulk acquisition ends in artifacts that
        name a Transfer rather than carrying bytes.
        """
        payload: dict[str, Any] = {"tool": tool, "arguments": dict(arguments or {})}
        if destination_uri is not None:
            payload["destination_uri"] = destination_uri
        response = self._fetch(  # type: ignore[attr-defined]
            self._contents_url(f"/mcp-sessions/{session_uid}/calls"),
            method="POST",
            json=payload,
        )
        return McpCall.model_validate(response.json())

    def get_mcp_call(self, session_uid: str, call_uid: str) -> McpCall:
        response = self._fetch(  # type: ignore[attr-defined]
            self._contents_url(f"/mcp-sessions/{session_uid}/calls/{call_uid}"),
            method="GET",
        )
        return McpCall.model_validate(response.json())

    def list_mcp_calls(self, session_uid: str) -> McpCallList:
        """
        The calls made through a session, newest first.

        This is where provenance lives: a call whose result carries artifacts
        is an acquisition, and the artifact names the Transfer, object and
        version it became.
        """
        response = self._fetch(  # type: ignore[attr-defined]
            self._contents_url(f"/mcp-sessions/{session_uid}/calls"), method="GET"
        )
        return McpCallList.model_validate(response.json())

    def list_mcp_approvals(self, *, status: str | None = None) -> McpApprovalList:
        """The caller's approvals, in one status; the contract filters on nothing else."""
        url = self._contents_url("/mcp-approvals")
        if status is not None:
            url = f"{url}?{urlencode({'status': status})}"
        response = self._fetch(url, method="GET")  # type: ignore[attr-defined]
        return McpApprovalList.model_validate(response.json())

    def approve_mcp_approval(
        self, approval_uid: str, *, note: str | None = None
    ) -> McpApproval:
        response = self._fetch(  # type: ignore[attr-defined]
            self._contents_url(f"/mcp-approvals/{approval_uid}/approve"),
            method="POST",
            json={"note": note} if note else {},
        )
        return McpApproval.model_validate(response.json())

    def reject_mcp_approval(
        self, approval_uid: str, *, note: str | None = None
    ) -> McpApproval:
        response = self._fetch(  # type: ignore[attr-defined]
            self._contents_url(f"/mcp-approvals/{approval_uid}/reject"),
            method="POST",
            json={"note": note} if note else {},
        )
        return McpApproval.model_validate(response.json())

    # -- datasources -------------------------------------------------------
    #
    # A Datasource is a database, warehouse or query service somebody
    # connected. Nothing here talks to it: Contents does, with the credential
    # it holds, directly or through a Dataserver in the customer's network.
    # A query is a job — submitted, polled, cancelled — and its result is a
    # stream of Arrow IPC bytes, read by range so a result larger than memory
    # is still readable one batch at a time.

    def test_datasource(self, source_uid: str) -> DatasourceTest:
        """Does the database answer through this source, right now?"""
        response = self._fetch(  # type: ignore[attr-defined]
            self._contents_url(f"/sources/{source_uid}/datasource/test"),
            method="POST",
        )
        return DatasourceTest.model_validate(response.json())

    def discover_datasource_schema(self, source_uid: str) -> DatasourceSchema:
        """The tables and columns the source exposes, as the service saw them."""
        response = self._fetch(  # type: ignore[attr-defined]
            self._contents_url(f"/sources/{source_uid}/datasource/schema"),
            method="GET",
        )
        return DatasourceSchema.model_validate(response.json())

    def get_datasource_capabilities(self, source_uid: str) -> DatasourceCapabilities:
        response = self._fetch(  # type: ignore[attr-defined]
            self._contents_url(f"/sources/{source_uid}/datasource/capabilities"),
            method="GET",
        )
        return DatasourceCapabilities.model_validate(response.json())

    def create_datasource_query(
        self,
        source_uid: str,
        sql: str,
        *,
        row_limit: int | None = None,
        max_bytes: int | None = None,
        max_seconds: int | None = None,
        sandbox_uid: str | None = None,
        idempotency_key: str | None = None,
    ) -> DatasourceQuery:
        """
        Submit a statement; the answer is the job, not the rows.

        The service checks the statement against the source's operation
        allowlist and the limits against its policy before the job exists,
        so a refused query is refused here, with a reason, and not later on
        the stream.
        """
        payload: dict[str, Any] = {"sql": sql}
        if row_limit is not None:
            payload["row_limit"] = row_limit
        if max_bytes is not None:
            payload["max_bytes"] = max_bytes
        if max_seconds is not None:
            payload["max_seconds"] = max_seconds
        if sandbox_uid is not None:
            payload["sandbox_uid"] = sandbox_uid
        headers = {"Idempotency-Key": idempotency_key} if idempotency_key else {}
        response = self._fetch(  # type: ignore[attr-defined]
            self._contents_url(f"/sources/{source_uid}/queries"),
            method="POST",
            headers=headers,
            json=payload,
        )
        return DatasourceQuery.model_validate(response.json())

    def list_datasource_queries(
        self, source_uid: str, *, cursor: str | None = None, limit: int = 50
    ) -> DatasourceQueryList:
        """The queries run against a source, newest first: its history."""
        parameters: dict[str, str | int] = {"limit": limit}
        if cursor is not None:
            parameters["cursor"] = cursor
        response = self._fetch(  # type: ignore[attr-defined]
            f"{self._contents_url(f'/sources/{source_uid}/queries')}?{urlencode(parameters)}",
            method="GET",
        )
        return DatasourceQueryList.model_validate(response.json())

    def get_datasource_query(self, query_uid: str) -> DatasourceQuery:
        response = self._fetch(  # type: ignore[attr-defined]
            self._contents_url(f"/queries/{query_uid}"), method="GET"
        )
        return DatasourceQuery.model_validate(response.json())

    def cancel_datasource_query(self, query_uid: str) -> DatasourceQuery:
        """Ask for the query to stop; cancellation reaches the connector."""
        response = self._fetch(  # type: ignore[attr-defined]
            self._contents_url(f"/queries/{query_uid}/cancel"), method="POST"
        )
        return DatasourceQuery.model_validate(response.json())

    def iter_datasource_query_results(
        self,
        query_uid: str,
        *,
        byte_range: str | None = None,
        chunk_size: int = 1024 * 1024,
    ) -> Iterator[bytes]:
        """
        The result of a finished query, as Arrow IPC bytes, chunk by chunk.

        A `Range` reads part of it, which is how a stream that broke halfway
        is resumed rather than restarted.
        """
        headers = {"Range": byte_range} if byte_range else {}
        response = self._fetch(  # type: ignore[attr-defined]
            self._contents_url(f"/queries/{query_uid}/results"),
            method="GET",
            headers=headers,
            stream=True,
        )
        yield from response.iter_content(chunk_size=chunk_size)

    def save_datasource_query(
        self, query_uid: str, *, dataset_uid: str, path: str
    ) -> DatasetRevision:
        """
        Keep a result: written into a Dataset as a verified revision.

        The bytes go from the service into the Dataset; nothing is downloaded
        to be uploaded again, and the answer is the revision that now holds
        them.
        """
        response = self._fetch(  # type: ignore[attr-defined]
            self._contents_url(f"/queries/{query_uid}/save"),
            method="POST",
            json={"dataset_uid": dataset_uid, "path": path.lstrip("/")},
        )
        return DatasetRevision.model_validate(response.json())

    def create_datasource_query_ticket(
        self,
        query_uid: str,
        *,
        sandbox_uid: str | None = None,
        expires_in: int | None = None,
    ) -> CapabilityTicket:
        """A Flight ticket for the result, for a client inside a sandbox."""
        payload: dict[str, Any] = {}
        if sandbox_uid is not None:
            payload["sandbox_uid"] = sandbox_uid
        if expires_in is not None:
            payload["expires_in"] = expires_in
        response = self._fetch(  # type: ignore[attr-defined]
            self._contents_url(f"/queries/{query_uid}/ticket"),
            method="POST",
            json=payload,
        )
        return CapabilityTicket.model_validate(response.json())

    # -- dataservers -------------------------------------------------------
    #
    # A Dataserver is a gateway in a customer's network, known here by its
    # registration. Its status is what it last said of itself; drain, resume
    # and revoke move its state; its identity is a certificate issued from a
    # CSR, so the private key never travels.

    def get_dataserver_status(self, source_uid: str) -> DataServerStatus:
        response = self._fetch(  # type: ignore[attr-defined]
            self._contents_url(f"/dataservers/{source_uid}/status"), method="GET"
        )
        return DataServerStatus.model_validate(response.json())

    def test_dataserver(self, source_uid: str) -> DataServerConnectivity:
        """Try the gateway on Flight and on the HTTPS fallback; a verdict per path."""
        response = self._fetch(  # type: ignore[attr-defined]
            self._contents_url(f"/dataservers/{source_uid}/test"), method="POST"
        )
        return DataServerConnectivity.model_validate(response.json())

    def _dataserver_transition(self, source_uid: str, action: str) -> DataServerStatus:
        response = self._fetch(  # type: ignore[attr-defined]
            self._contents_url(f"/dataservers/{source_uid}/{action}"), method="POST"
        )
        return DataServerStatus.model_validate(response.json())

    def drain_dataserver(self, source_uid: str) -> DataServerStatus:
        """Stop routing new queries; the ones running finish."""
        return self._dataserver_transition(source_uid, "drain")

    def resume_dataserver(self, source_uid: str) -> DataServerStatus:
        """Route to the gateway again."""
        return self._dataserver_transition(source_uid, "resume")

    def revoke_dataserver(self, source_uid: str) -> DataServerStatus:
        """Refuse the gateway's identity from now on. Nothing in its network changes."""
        return self._dataserver_transition(source_uid, "revoke")

    def issue_dataserver_identity(self, source_uid: str, csr: str) -> IssuedIdentity:
        """A first certificate for the identity the CSR names."""
        response = self._fetch(  # type: ignore[attr-defined]
            self._contents_url(f"/dataservers/{source_uid}/identity"),
            method="POST",
            json={"csr": csr},
        )
        return IssuedIdentity.model_validate(response.json())

    def rotate_dataserver_identity(self, source_uid: str, csr: str) -> IssuedIdentity:
        """A new certificate that overlaps the current one, so nothing stops."""
        response = self._fetch(  # type: ignore[attr-defined]
            self._contents_url(f"/dataservers/{source_uid}/identity/rotate"),
            method="POST",
            json={"csr": csr},
        )
        return IssuedIdentity.model_validate(response.json())

    def get_content_operation(self, operation_uid: str) -> OperationView:
        response = self._fetch(  # type: ignore[attr-defined]
            self._contents_url(f"/operations/{operation_uid}"), method="GET"
        )
        return OperationView.model_validate(response.json())

    def list_dead_letter_operations(self, *, rows: int = 100) -> DeadLetterList:
        """The operations that gave up: retries exhausted, or quarantined."""

        response = self._fetch(  # type: ignore[attr-defined]
            self._contents_url(f"/operations/dead-letter?rows={int(rows)}"), method="GET"
        )
        return DeadLetterList.model_validate(response.json())

    def quarantine_content_operation(self, operation_uid: str, *, reason: str) -> OperationView:
        """Keep a failed operation out of the queue while it is looked at."""

        response = self._fetch(  # type: ignore[attr-defined]
            self._contents_url(f"/operations/{operation_uid}/quarantine"),
            method="POST",
            json={"reason": reason},
        )
        return OperationView.model_validate(response.json())

    def requeue_content_operation(self, operation_uid: str) -> OperationView:
        """Try a failed operation again from its first attempt."""

        response = self._fetch(  # type: ignore[attr-defined]
            self._contents_url(f"/operations/{operation_uid}/requeue"), method="POST"
        )
        return OperationView.model_validate(response.json())

    def cancel_content_operation(self, operation_uid: str) -> OperationView:
        response = self._fetch(  # type: ignore[attr-defined]
            self._contents_url(f"/operations/{operation_uid}/cancel"), method="POST"
        )
        return OperationView.model_validate(response.json())

def _as_arrow_table(table: Any) -> Any:
    """Whatever the caller has, as an Arrow table.

    Accepting one type would mean a user converting first, and the conversion
    they would write is this one — done less carefully, because it is in their
    way rather than the point of their work.
    """
    import pyarrow as pa

    if isinstance(table, pa.Table):
        return table
    for attribute in ("to_arrow", "to_arrow_table"):
        converter = getattr(table, attribute, None)
        if callable(converter):
            return pa.table(converter())
    if hasattr(table, "__arrow_c_stream__") or hasattr(table, "to_pandas"):
        return pa.table(table)
    try:
        return pa.table(table)
    except Exception as refused:  # noqa: BLE001 - the caller needs the name
        raise TypeError(
            f"cannot publish a {type(table).__name__}: give a pyarrow Table, a "
            "pandas or polars DataFrame, or anything Arrow can take"
        ) from refused
