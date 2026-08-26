# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

from __future__ import annotations

from pathlib import Path
from typing import Any, Iterator, cast

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
