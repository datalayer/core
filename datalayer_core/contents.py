# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

# Copyright (c) 2023-2026 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""High-level Python Contents facade built on the canonical client mixin."""

from __future__ import annotations

import os
from pathlib import Path
import tempfile
from typing import Callable, Iterator
from uuid import uuid4

from datalayer_core.client import DatalayerClient
from datalayer_core.models.contents.generated import (
    ContentObject,
    ObjectList,
    TransferView,
    VersionList,
)


class UserFolder:
    def __init__(self, client: DatalayerClient) -> None:
        self.client = client

    def list(
        self, prefix: str | None = None, *, cursor: str | None = None, limit: int = 100
    ) -> ObjectList:
        return self.client.list_user_folder_objects(
            prefix=prefix, cursor=cursor, limit=limit
        )

    def stat(self, path: str) -> ContentObject:
        return self.client.stat_user_folder_object(path.lstrip("/"))

    def versions(self, path: str) -> VersionList:
        object_ = self.stat(path)
        return self.client.list_user_folder_object_versions(object_.uid)

    def restore(self, path: str, version_uid: str) -> ContentObject:
        object_ = self.stat(path)
        return self.client.restore_user_folder_object(
            object_.uid,
            version_uid,
            idempotency_key=f"python-restore-{uuid4()}",
        )

    def upload(
        self,
        local_path: str | Path,
        destination_path: str,
        *,
        overwrite: bool = False,
        progress: Callable[[int, int, str], None] | None = None,
    ) -> TransferView:
        return self.client.upload_user_folder_file(
            local_path,
            destination_path.lstrip("/"),
            idempotency_key=f"python-upload-{uuid4()}",
            overwrite="replace" if overwrite else "reject",
            progress=progress,
        )

    def iter_download(
        self,
        path: str,
        *,
        version_uid: str | None = None,
        byte_range: str | None = None,
    ) -> Iterator[bytes]:
        object_ = self.stat(path)
        return self.client.iter_user_folder_object(
            object_.uid,
            version_uid=version_uid,
            byte_range=byte_range,
        )

    def download(
        self,
        source_path: str,
        local_path: str | Path,
        *,
        version_uid: str | None = None,
        overwrite: bool = False,
    ) -> Path:
        destination = Path(local_path)
        if destination.exists() and not overwrite:
            raise FileExistsError(destination)
        destination.parent.mkdir(parents=True, exist_ok=True)
        descriptor, temporary_name = tempfile.mkstemp(
            prefix=f".{destination.name}.", suffix=".part", dir=destination.parent
        )
        try:
            with os.fdopen(descriptor, "wb") as output:
                for chunk in self.iter_download(
                    source_path, version_uid=version_uid
                ):
                    output.write(chunk)
            os.replace(temporary_name, destination)
        except Exception:
            Path(temporary_name).unlink(missing_ok=True)
            raise
        return destination


class Contents:
    def __init__(self, client: DatalayerClient | None = None) -> None:
        self._client = client

    @property
    def client(self) -> DatalayerClient:
        if self._client is None:
            self._client = DatalayerClient()
        return self._client

    def user_folder(self) -> UserFolder:
        self.client.get_user_folder()
        return UserFolder(self.client)


contents = Contents()

__all__ = ["Contents", "UserFolder", "contents"]
