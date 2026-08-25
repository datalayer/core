# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

from __future__ import annotations

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
    def __init__(self) -> None:
        self.upload = None

    def get_user_folder(self):
        return object()

    def list_user_folder_objects(self, **kwargs):
        return ObjectList(items=[object_()], next_cursor=None)

    def stat_user_folder_object(self, path):
        return object_()

    def iter_user_folder_object(self, object_uid, **kwargs):
        yield b"earth"

    def upload_user_folder_file(self, local_path, destination_path, **kwargs):
        self.upload = (local_path, destination_path, kwargs)
        return object()


def test_high_level_user_folder_browses_uploads_and_streams_downloads(tmp_path) -> None:
    client = Client()
    folder = Contents(client).user_folder()
    local = tmp_path / "earth.csv"
    local.write_text("earth")

    listed = folder.list("reports")
    folder.upload(local, "/reports/earth.csv")
    chunks = list(folder.iter_download("/reports/earth.csv"))

    assert listed.items[0].path == "reports/earth.csv"
    assert client.upload[1] == "reports/earth.csv"
    assert chunks == [b"earth"]
