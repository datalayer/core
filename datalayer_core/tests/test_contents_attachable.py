# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""The three content sources the manual documents and the client now has.

Written against the *documented* shape rather than the implementation: what
these assert is the code in the user manual, because that is the promise. The
doc checker holds the names; these hold what the names do.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any, Iterator, cast

import pytest

from datalayer_core.client import DatalayerClient
from datalayer_core.contents import Contents

CLOUD_UID = "01CSAAAAAAAAAAAAAAAAAAAAAA"
DATASET_UID = "01DSAAAAAAAAAAAAAAAAAAAAAA"
VOLUME_UID = "01VMAAAAAAAAAAAAAAAAAAAAAA"

CONFIGURATIONS: dict[str, dict[str, Any]] = {
    "cloud-storage": {
        "kind": "cloud-storage",
        "provider": "s3",
        "origin": "user",
        "bucket_or_container": "company-analytics",
        "prefix": "production/events",
    },
    "dataset": {"kind": "dataset", "tags": [], "publication_eligible": False},
    "volume": {
        "kind": "volume",
        "capacity_bytes": 10_000_000_000,
        "scope": "user",
        "default_mount_path": "/mnt/model-artifacts",
        "access_modes": ["ro", "rw"],
        "concurrent_readers": True,
        "concurrent_writers": False,
    },
}


def catalog(kind: str, uid: str, name: str, configuration: Any = None) -> Any:
    from datalayer_core.mixins.contents import ConditionalCatalogSource
    from datalayer_core.models.contents.generated import CatalogSource

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
                    "configuration": configuration or CONFIGURATIONS[kind],
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


class Client:
    """The parts of `DatalayerClient` these three facades call."""

    def __init__(self, volume_configuration: Any = None) -> None:
        self.attachments: list[dict[str, Any]] = []
        self.keys: list[str] = []
        self.ranges: list[str | None] = []
        self.listed: list[tuple[str, str | None]] = []
        self.uploaded: tuple[Any, str, str, dict[str, Any]] | None = None
        self.volume_configuration = volume_configuration

    def get_content_source(self, reference: str) -> Any:
        if reference == CLOUD_UID:
            return catalog("cloud-storage", reference, "company-analytics")
        if reference == DATASET_UID:
            return catalog("dataset", reference, "earth-observation")
        if reference == VOLUME_UID:
            return catalog(
                "volume", reference, "model-artifacts", self.volume_configuration
            )
        raise RuntimeError("not found")

    def list_content_sources(self, *, kind: str, **kwargs: Any) -> Any:
        from datalayer_core.models.contents.generated import SourceList

        uid = {
            "cloud-storage": CLOUD_UID,
            "dataset": DATASET_UID,
            "volume": VOLUME_UID,
        }[kind]
        return SourceList(items=[self.get_content_source(uid).value], next_cursor=None)

    # Cloud Storage -----------------------------------------------------

    def list_cloud_storage_objects(
        self, source_uid: str, *, prefix: str = "", cursor: str | None = None
    ) -> dict[str, Any]:
        self.listed.append((prefix, cursor))
        if cursor is None:
            return {
                "items": [{"path": f"{prefix}a.parquet", "size": 1, "is_directory": False}],
                "next_cursor": "more",
            }
        return {
            "items": [{"path": f"{prefix}b.parquet", "size": 2, "is_directory": False}],
            "next_cursor": None,
        }

    def stat_cloud_storage_object(self, source_uid: str, path: str) -> dict[str, Any]:
        return {"path": path, "size": 9, "is_directory": False, "etag": "abc"}

    def iter_cloud_storage_object(
        self, source_uid: str, path: str, *, byte_range: str | None = None, **kwargs: Any
    ) -> Iterator[bytes]:
        self.ranges.append(byte_range)
        yield b"par"
        yield b"quet"

    def test_cloud_storage_connection(self, source_uid: str) -> dict[str, Any]:
        return {"ok": True}

    def presign_cloud_storage_object(self, source_uid: str, path: str, **kwargs: Any) -> Any:
        return {"url": "https://example.invalid/one-object"}

    # Dataset -----------------------------------------------------------

    def list_dataset_revisions(self, source_uid: str) -> Any:
        from datalayer_core.models.contents.generated import DatasetRevisionList

        return DatasetRevisionList(items=[], next_cursor=None)

    def create_dataset_revision(
        self, source_uid: str, request: Any, *, idempotency_key: str
    ) -> Any:
        self.keys.append(idempotency_key)
        return {"source_uid": source_uid, "request": dict(request)}

    def create_dataset_publication(
        self, source_uid: str, request: Any, *, idempotency_key: str
    ) -> Any:
        self.keys.append(idempotency_key)
        return {"source_uid": source_uid, "request": dict(request)}

    def upload_dataset_file(
        self, local_path: Any, dataset_uid: str, destination_path: str, **kwargs: Any
    ) -> Any:
        self.uploaded = (local_path, dataset_uid, destination_path, kwargs)
        return {"uid": "01TRANSFER"}

    # Attachments -------------------------------------------------------

    def create_content_attachment(self, request: Any, *, idempotency_key: str) -> Any:
        self.attachments.append(dict(request))
        self.keys.append(idempotency_key)
        return dict(request)


def facade(client: Client) -> Contents:
    return Contents(cast(DatalayerClient, client))


# The manual's own example --------------------------------------------------


def test_the_cloud_storage_block_in_the_manual_runs() -> None:
    # `ContentCloudStorageDoc.tsx`, line for line: resolve by name, open a
    # key, read it. If this test has to change, that block has to change too.
    client = Client()
    storage = facade(client).cloud_storage("company-analytics")
    with storage.open("production/events/2026-08.parquet") as stream:
        assert stream.read() == b"parquet"


def test_the_contents_block_in_the_manual_runs() -> None:
    # `ContentsDoc.tsx`: a Dataset and a Volume by name.
    client = Client()
    contents = facade(client)
    assert contents.dataset("earth-observation").source_uid == DATASET_UID
    assert contents.volume("model-artifacts").source_uid == VOLUME_UID


# Resolution ----------------------------------------------------------------


@pytest.mark.parametrize(
    ("method", "name", "uid"),
    [
        ("cloud_storage", "company-analytics", CLOUD_UID),
        ("dataset", "earth-observation", DATASET_UID),
        ("volume", "model-artifacts", VOLUME_UID),
    ],
)
def test_each_resolves_by_name_and_by_uid(method: str, name: str, uid: str) -> None:
    contents = facade(Client())
    assert getattr(contents, method)(name).source_uid == uid
    assert getattr(contents, method)(uid).source_uid == uid


def test_asking_for_the_wrong_kind_says_which_kind_it_is() -> None:
    # A Dataset uid handed to `volume()` is a typo worth naming, not a
    # Volume facade over a Dataset that fails later and further away.
    with pytest.raises(LookupError, match="is a dataset source, not a Volume one"):
        facade(Client()).volume(DATASET_UID)


# Cloud Storage -------------------------------------------------------------


def test_listing_follows_every_page() -> None:
    # One page looks like the whole bucket until the day it is not.
    client = Client()
    found = facade(client).cloud_storage(CLOUD_UID).ls("2026/")
    assert [item["path"] for item in found] == ["2026/a.parquet", "2026/b.parquet"]
    assert client.listed == [("2026/", None), ("2026/", "more")]


def test_reading_in_pieces_spans_chunk_boundaries() -> None:
    # The stream arrives as `par` + `quet`; a reader asking for 5 bytes must
    # get 5, not the first chunk.
    storage = facade(Client()).cloud_storage(CLOUD_UID)
    stream = storage.open("k")
    assert stream.read(5) == b"parqu"
    assert stream.read() == b"et"
    assert stream.read() == b""


def test_an_object_is_not_seekable_and_says_so() -> None:
    # Readers branch on this. Claiming to seek and re-reading from the start
    # would corrupt a parquet read rather than fail it.
    stream = facade(Client()).cloud_storage(CLOUD_UID).open("k")
    assert stream.seekable() is False
    assert stream.readable() is True


def test_opening_for_writing_is_refused_at_open() -> None:
    storage = facade(Client()).cloud_storage(CLOUD_UID)
    with pytest.raises(ValueError, match="read-only"):
        storage.open("k", mode="wb")


def test_a_provider_native_filesystem_is_refused_with_the_reason() -> None:
    # The manual used to show `implementation="s3fs"`. Nothing issues bucket
    # credentials to a caller, so this must not quietly return something else.
    storage = facade(Client()).cloud_storage(CLOUD_UID)
    with pytest.raises(ValueError, match="does not issue bucket credentials"):
        storage.filesystem(implementation="s3fs")


def test_the_fsspec_filesystem_reads_through_the_service() -> None:
    # A hard import, not `importorskip`: fsspec is a declared test
    # dependency, so it missing is a broken environment to fail on rather
    # than three tests that quietly stop running.
    import fsspec

    client = Client()
    filesystem = facade(client).cloud_storage(CLOUD_UID).filesystem()
    assert isinstance(filesystem, fsspec.AbstractFileSystem)
    assert filesystem.cat_file("k") == b"parquet"
    assert filesystem.info("k")["size"] == 9
    assert filesystem.ls("", detail=False) == ["a.parquet", "b.parquet"]


def test_an_fsspec_byte_range_becomes_an_inclusive_http_range() -> None:
    # fsspec's `end` is exclusive and HTTP's is not. Off by one here reads
    # one byte too few, forever, quietly.
    client = Client()
    facade(client).cloud_storage(CLOUD_UID).filesystem().cat_file("k", 0, 4)
    assert client.ranges == ["bytes=0-3"]


def test_the_fsspec_filesystem_refuses_to_write() -> None:
    filesystem = facade(Client()).cloud_storage(CLOUD_UID).filesystem()
    with pytest.raises(ValueError, match="read-only"):
        filesystem._open("k", mode="wb")


# Dataset -------------------------------------------------------------------


def test_a_revision_carries_its_own_idempotency_key() -> None:
    client = Client()
    dataset = facade(client).dataset(DATASET_UID)
    dataset.create_revision(note="first")
    dataset.create_revision(note="second")
    assert len(set(client.keys)) == 2, "two deliberate revisions are two intents"
    assert all(key.startswith("contents-revision-") for key in client.keys)


def test_uploading_names_the_dataset_and_the_destination() -> None:
    client = Client()
    facade(client).dataset(DATASET_UID).upload(Path("/tmp/x.csv"), "raw/x.csv")
    assert client.uploaded is not None
    local, uid, destination, kwargs = client.uploaded
    assert (str(local), uid, destination) == ("/tmp/x.csv", DATASET_UID, "raw/x.csv")
    assert kwargs["idempotency_key"].startswith("contents-dataset-upload-")


# Volume --------------------------------------------------------------------


def test_a_volume_reports_what_a_notebook_needs_before_writing() -> None:
    volume = facade(Client()).volume(VOLUME_UID)
    assert volume.default_mount_path() == "/mnt/model-artifacts"
    assert volume.capacity_bytes() == 10_000_000_000
    assert volume.writable() is True


def test_attaching_a_read_only_volume_read_write_is_refused_here() -> None:
    # The service refuses it too. Refusing first turns a rejected request
    # into a sentence naming the setting to change.
    configuration = dict(CONFIGURATIONS["volume"], access_modes=["ro"])
    client = Client(volume_configuration=configuration)
    volume = facade(client).volume(VOLUME_UID)
    with pytest.raises(ValueError, match="read_only=True"):
        volume.attach("01SBXAAAAAAAAAAAAAAAAAAAAA")
    assert client.attachments == [], "nothing was sent"
    volume.attach("01SBXAAAAAAAAAAAAAAAAAAAAA", read_only=True)
    assert client.attachments[0]["mode"] == "ro"


def test_a_volume_configuration_is_read_fresh_every_time() -> None:
    # A cached copy of a revoked or re-scoped source is worse than a request.
    client = Client()
    volume = facade(client).volume(VOLUME_UID)
    assert volume.writable() is True
    client.volume_configuration = dict(CONFIGURATIONS["volume"], access_modes=["ro"])
    assert volume.writable() is False


# Attaching -----------------------------------------------------------------


@pytest.mark.parametrize(
    ("method", "uid"),
    [("cloud_storage", CLOUD_UID), ("dataset", DATASET_UID), ("volume", VOLUME_UID)],
)
def test_all_three_attach_the_same_way(method: str, uid: str) -> None:
    # One implementation, so `path` and `read_only` cannot come to mean
    # three different things.
    client = Client()
    source = getattr(facade(client), method)(uid)
    source.attach("01SBXAAAAAAAAAAAAAAAAAAAAA", path="/data/events", read_only=True)
    assert client.attachments == [
        {
            "source_uid": uid,
            "revision_uid": None,
            "sandbox_uid": "01SBXAAAAAAAAAAAAAAAAAAAAA",
            "sandbox_provider": "datalayer",
            "mode": "ro",
            "mount_path": "/data/events",
            "delivery": "mount",
            "required": True,
        }
    ]


def test_an_attachment_matches_what_the_cli_sends() -> None:
    # The CLI's `_attach_source` and this build the same request. Two ways to
    # attach that disagree is the defect this repository keeps finding.
    from datalayer_core.cli.commands import contents as cli

    import inspect

    sent = inspect.getsource(cli._attach_source)
    client = Client()
    facade(client).dataset(DATASET_UID).attach("01SBXAAAAAAAAAAAAAAAAAAAAA")
    for field in client.attachments[0]:
        assert f'"{field}"' in sent, f"the CLI does not send {field}"
