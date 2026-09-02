# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""High-level Python Contents facade built on the canonical client mixin."""

from __future__ import annotations

import os
import sys
import tempfile
import time
from collections.abc import AsyncIterator, Mapping
from pathlib import Path
from typing import Any, Callable, Iterator, TextIO
from uuid import uuid4

from datalayer_core.client import DatalayerClient
from datalayer_core.models.contents.datasources import (
    CapabilityTicket,
    DataServerConnector,
    DataServerStatus,
    DatasourceCapabilities,
    DatasourceQuery,
    DatasourceQueryList,
    DatasourceSchema,
    DatasourceTest,
    IssuedIdentity,
    is_query_terminal,
)
from datalayer_core.models.contents.generated import (
    AttachmentList,
    ContentAttachment,
    ContentObject,
    DatasetPublication,
    DatasetPublicationList,
    DatasetRevision,
    DatasetRevisionList,
    ObjectList,
    TransferView,
    VersionList,
)
from datalayer_core.models.contents.mcp import (
    McpApproval,
    McpApprovalList,
    McpCall,
    McpHealth,
    McpSession,
    McpToolManifest,
    is_call_terminal,
)


class HomeFolder:
    def __init__(self, client: DatalayerClient) -> None:
        self.client = client

    def list(
        self, prefix: str | None = None, *, cursor: str | None = None, limit: int = 100
    ) -> ObjectList:
        return self.client.list_home_folder_objects(
            prefix=prefix, cursor=cursor, limit=limit
        )

    def stat(self, path: str) -> ContentObject:
        return self.client.stat_home_folder_object(path.lstrip("/"))

    def versions(self, path: str) -> VersionList:
        object_ = self.stat(path)
        return self.client.list_home_folder_object_versions(object_.uid)

    def restore(self, path: str, version_uid: str) -> ContentObject:
        object_ = self.stat(path)
        return self.client.restore_home_folder_object(
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
        return self.client.upload_home_folder_file(
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
        return self.client.iter_home_folder_object(
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
                for chunk in self.iter_download(source_path, version_uid=version_uid):
                    output.write(chunk)
            os.replace(temporary_name, destination)
        except Exception:
            Path(temporary_name).unlink(missing_ok=True)
            raise
        return destination


class McpSource:
    """
    An MCP source, used: its tools, and calls through a session of it.

    The session is opened lazily, on the first call, and narrowed to nothing
    beyond what the source allows. A call that needs approval comes back as
    such — this prints the approval uid, because somebody has to go and
    decide it — and ``wait=True`` polls until that decision lands and the
    call finishes.
    """

    def __init__(
        self,
        client: DatalayerClient,
        source_uid: str,
        *,
        output: TextIO | None = None,
    ) -> None:
        self.client = client
        self.source_uid = source_uid
        self._session: McpSession | None = None
        self._output = output or sys.stdout

    def tools(self) -> McpToolManifest:
        return self.client.discover_mcp_tools(self.source_uid)

    def test(self) -> McpHealth:
        return self.client.test_mcp_source(self.source_uid)

    @property
    def session(self) -> McpSession:
        if self._session is None or self._session.status != "active":
            self._session = self.client.create_mcp_session(
                self.source_uid, idempotency_key=f"python-mcp-session-{uuid4()}"
            )
        return self._session

    def close(self) -> None:
        if self._session is not None:
            self.client.revoke_mcp_session(self._session.uid)
            self._session = None

    def call(
        self,
        tool: str,
        *,
        destination: str | None = None,
        wait: bool = False,
        timeout: float = 600.0,
        interval: float = 2.0,
        **arguments: Any,
    ) -> McpCall:
        call = self.client.call_mcp_tool(
            self.session.uid, tool, arguments, destination_uri=destination
        )
        if call.status == "pending-approval":
            print(
                f"Call {call.uid} of {tool} awaits approval {call.approval_uid}: "
                f"datalayer contents mcp approvals approve {call.approval_uid}",
                file=self._output,
            )
        if wait and not is_call_terminal(call):
            call = self.wait(call, timeout=timeout, interval=interval)
        return call

    def wait(
        self, call: McpCall, *, timeout: float = 600.0, interval: float = 2.0
    ) -> McpCall:
        """Poll a call until the service is done with it, or time runs out."""
        deadline = time.monotonic() + timeout
        while not is_call_terminal(call):
            if time.monotonic() >= deadline:
                raise TimeoutError(
                    f"call {call.uid} is still {call.status} after {timeout:.0f}s"
                )
            time.sleep(interval)
            call = self.client.get_mcp_call(call.session_uid, call.uid)
        return call

    def approvals(self, status: str | None = "pending") -> McpApprovalList:
        """The approvals on this source; the service filters on status alone."""
        page = self.client.list_mcp_approvals(status=status)
        return McpApprovalList(
            items=[item for item in page.items if item.source_uid == self.source_uid]
        )

    def approve(self, approval_uid: str, *, note: str | None = None) -> McpApproval:
        return self.client.approve_mcp_approval(approval_uid, note=note)

    def reject(self, approval_uid: str, *, note: str | None = None) -> McpApproval:
        return self.client.reject_mcp_approval(approval_uid, note=note)


class QueryFailed(RuntimeError):
    """A query that ended without a result: failed or cancelled."""

    def __init__(self, query: DatasourceQuery) -> None:
        self.query = query
        detail = f": {query.error.message}" if query.error else ""
        super().__init__(f"query {query.uid} {query.status}{detail}")


class Query:
    """
    One query of a Datasource: a job, then a result read in batches.

    The record is what the service last said of the job; ``refresh`` asks
    again and ``wait`` keeps asking until it is over. The result is an Arrow
    IPC stream, and every reader here — ``to_arrow``, ``to_pandas``,
    ``to_polars`` — walks it one record batch at a time rather than holding
    the bytes and the frame both in memory. Only what a caller keeps is kept:
    ``to_pandas`` and ``to_polars`` build one frame, so their peak is that
    frame plus one batch; ``to_arrow`` never holds more than one batch.
    """

    def __init__(self, client: DatalayerClient, record: DatasourceQuery) -> None:
        self.client = client
        self.record = record

    @property
    def uid(self) -> str:
        return self.record.uid

    @property
    def status(self) -> str:
        return self.record.status

    @property
    def is_terminal(self) -> bool:
        return is_query_terminal(self.record)

    def refresh(self) -> "Query":
        self.record = self.client.get_datasource_query(self.record.uid)
        return self

    def wait(self, *, timeout: float = 600.0, interval: float = 1.0) -> "Query":
        """Poll until the service is done with the query, or time runs out."""
        deadline = time.monotonic() + timeout
        while not is_query_terminal(self.record):
            if time.monotonic() >= deadline:
                raise TimeoutError(
                    f"query {self.record.uid} is still {self.record.status} "
                    f"after {timeout:.0f}s"
                )
            time.sleep(interval)
            self.refresh()
        return self

    def cancel(self) -> "Query":
        """Ask the service to stop the query; the connector is told too."""
        self.record = self.client.cancel_datasource_query(self.record.uid)
        return self

    def ticket(
        self, *, sandbox_uid: str | None = None, expires_in: int | None = None
    ) -> CapabilityTicket:
        """A Flight ticket for the result, for a client inside a sandbox."""
        return self.client.create_datasource_query_ticket(
            self.record.uid, sandbox_uid=sandbox_uid, expires_in=expires_in
        )

    def _succeeded(self, *, timeout: float, interval: float) -> DatasourceQuery:
        """The record once the query has succeeded; anything else is raised."""
        if not is_query_terminal(self.record):
            self.wait(timeout=timeout, interval=interval)
        if self.record.status != "succeeded":
            raise QueryFailed(self.record)
        return self.record

    def iter_bytes(
        self,
        *,
        byte_range: str | None = None,
        chunk_size: int = 1024 * 1024,
        timeout: float = 600.0,
        interval: float = 1.0,
    ) -> Iterator[bytes]:
        """The result as it is on the wire: Arrow IPC bytes, chunk by chunk."""
        self._succeeded(timeout=timeout, interval=interval)
        return self.client.iter_datasource_query_results(
            self.record.uid, byte_range=byte_range, chunk_size=chunk_size
        )

    def to_arrow(
        self, *, timeout: float = 600.0, interval: float = 1.0
    ) -> Iterator[Any]:
        """
        The result as Arrow record batches, one at a time.

        Waits for the query when it is still running. Needs ``pyarrow``.
        """
        from datalayer_core.contents_streaming import iter_arrow_batches

        return iter_arrow_batches(self.iter_bytes(timeout=timeout, interval=interval))

    async def stream_arrow(
        self, *, timeout: float = 600.0, interval: float = 1.0
    ) -> AsyncIterator[Any]:
        """The result as Arrow record batches, for an async caller."""
        import asyncio

        from datalayer_core.contents_streaming import stream_arrow_batches

        chunks = await asyncio.to_thread(
            lambda: self.iter_bytes(timeout=timeout, interval=interval)
        )

        async def bytes_of() -> AsyncIterator[bytes]:
            iterator = iter(chunks)
            sentinel = object()
            while True:
                chunk = await asyncio.to_thread(next, iterator, sentinel)
                if chunk is sentinel:
                    return
                yield chunk  # type: ignore[misc]

        async for batch in stream_arrow_batches(bytes_of()):
            yield batch

    def to_table(self, *, timeout: float = 600.0, interval: float = 1.0) -> Any:
        """The whole result as one ``pyarrow.Table``. Holds it all: mind the size."""
        import pyarrow

        batches = list(self.to_arrow(timeout=timeout, interval=interval))
        if not batches:
            return pyarrow.table({})
        return pyarrow.Table.from_batches(batches)

    def to_pandas(self, *, timeout: float = 600.0, interval: float = 1.0) -> Any:
        """
        The whole result as a ``pandas.DataFrame``.

        Built batch by batch and concatenated once, so the peak in memory is
        the frame plus one batch, not the frame plus the bytes it came from.
        The frame itself is the whole result: for something larger than
        memory, iterate ``to_arrow`` instead and keep what you need.
        """
        import pandas

        frames = [
            batch.to_pandas()
            for batch in self.to_arrow(timeout=timeout, interval=interval)
        ]
        if not frames:
            return pandas.DataFrame()
        if len(frames) == 1:
            return frames[0]
        return pandas.concat(frames, ignore_index=True)

    def to_polars(self, *, timeout: float = 600.0, interval: float = 1.0) -> Any:
        """The whole result as a ``polars.DataFrame``, when ``polars`` is installed."""
        try:
            import polars
        except ImportError as error:
            raise RuntimeError(
                "Reading a result as Polars needs polars: pip install polars."
            ) from error
        frames = [
            polars.from_arrow(batch)
            for batch in self.to_arrow(timeout=timeout, interval=interval)
        ]
        if not frames:
            return polars.DataFrame()
        return polars.concat(frames)

    def save_as_dataset(
        self,
        dataset_uid: str,
        path: str,
        *,
        timeout: float = 600.0,
        interval: float = 1.0,
    ) -> DatasetRevision:
        """
        Keep the result as a verified revision of a Dataset.

        The service writes the bytes into the Dataset; nothing comes down to
        go back up. The answer is the revision that now holds them.
        """
        self._succeeded(timeout=timeout, interval=interval)
        return self.client.save_datasource_query(
            self.record.uid, dataset_uid=dataset_uid, path=path
        )

    def __repr__(self) -> str:
        return f"Query({self.record.uid}, {self.record.status})"


class Datasource:
    """
    A Datasource, used: tested, described, queried.

    None of this reaches the database from here. Contents does, with the
    credential it holds — directly or through a Dataserver — and answers with
    a verdict, a schema, or a query job whose result is streamed back.
    """

    def __init__(self, client: DatalayerClient, source_uid: str) -> None:
        self.client = client
        self.source_uid = source_uid

    def test(self) -> DatasourceTest:
        """Does the database answer through this source, right now?"""
        return self.client.test_datasource(self.source_uid)

    def schema(self) -> DatasourceSchema:
        """The tables and columns the source exposes."""
        return self.client.discover_datasource_schema(self.source_uid)

    def capabilities(self) -> DatasourceCapabilities:
        return self.client.get_datasource_capabilities(self.source_uid)

    def query(
        self,
        sql: str,
        *,
        row_limit: int | None = None,
        max_bytes: int | None = None,
        max_seconds: int | None = None,
        sandbox_uid: str | None = None,
        wait: bool = False,
        timeout: float = 600.0,
        interval: float = 1.0,
    ) -> Query:
        """
        Submit a statement and get the job back.

        The job is what to hold on to: ``query.wait()`` polls it, ``.cancel()``
        stops it, ``.to_pandas()`` reads the result. ``wait=True`` polls here
        before returning.
        """
        record = self.client.create_datasource_query(
            self.source_uid,
            sql,
            row_limit=row_limit,
            max_bytes=max_bytes,
            max_seconds=max_seconds,
            sandbox_uid=sandbox_uid,
            idempotency_key=f"python-query-{uuid4()}",
        )
        query = Query(self.client, record)
        if wait:
            query.wait(timeout=timeout, interval=interval)
        return query

    def queries(self, *, cursor: str | None = None, limit: int = 50) -> DatasourceQueryList:
        """The queries run against this source, newest first."""
        return self.client.list_datasource_queries(
            self.source_uid, cursor=cursor, limit=limit
        )

    def query_by_uid(self, query_uid: str) -> Query:
        """A query already submitted, by uid: how a notebook reconnects to one."""
        return Query(self.client, self.client.get_datasource_query(query_uid))


class Dataserver:
    """
    A Dataserver registration, inspected and moved between states.

    The gateway itself runs in somebody's network; what is here is what it
    last said of itself and the levers the catalog has on it. Nothing here
    prints a private key: an identity is issued from a CSR the gateway made.
    """

    def __init__(self, client: DatalayerClient, source_uid: str) -> None:
        self.client = client
        self.source_uid = source_uid

    def status(self) -> DataServerStatus:
        return self.client.get_dataserver_status(self.source_uid)

    def connectors(self) -> list[DataServerConnector]:
        """The connectors the gateway advertises, each with its operations."""
        return list(self.status().connectors)

    def drain(self) -> DataServerStatus:
        return self.client.drain_dataserver(self.source_uid)

    def resume(self) -> DataServerStatus:
        return self.client.resume_dataserver(self.source_uid)

    def revoke(self) -> DataServerStatus:
        return self.client.revoke_dataserver(self.source_uid)

    def issue_identity(self, csr: str) -> IssuedIdentity:
        return self.client.issue_dataserver_identity(self.source_uid, csr)

    def rotate_identity(self, csr: str) -> IssuedIdentity:
        return self.client.rotate_dataserver_identity(self.source_uid, csr)


class _Attached:
    """
    What every attachable source shares: being put into a sandbox.

    Cloud Storage, a Dataset and a Volume are three different things to hold
    and one thing to attach — the service takes the same attachment either
    way, and the kind decides what the sandbox ends up seeing. Writing it
    once means `--path` and `--ro` cannot come to mean different things in
    three places.
    """

    client: DatalayerClient
    source_uid: str

    def source(self) -> Any:
        """The catalog record, fetched now.

        Not cached: a source can be renamed, re-scoped or revoked between two
        calls, and a stale copy of that is worse than a second request.
        """
        return self.client.get_content_source(self.source_uid).value

    def attach(
        self,
        sandbox_uid: str,
        *,
        path: str | None = None,
        read_only: bool = False,
        delivery: str = "mount",
        required: bool = True,
        provider: str = "datalayer",
        revision_uid: str | None = None,
    ) -> ContentAttachment:
        """Put this source into a sandbox.

        `path` is where it appears. A sandbox that is **already running**
        receives it under the home directory instead, so an absolute path
        asked for after launch is answered with the reason rather than
        silently moved — see the Cloud Storage page.
        """
        return self.client.create_content_attachment(
            {
                "source_uid": self.source_uid,
                "revision_uid": revision_uid,
                "sandbox_uid": sandbox_uid,
                "sandbox_provider": provider,
                "mode": "ro" if read_only else "rw",
                "mount_path": path,
                "delivery": delivery,
                "required": required,
            },
            idempotency_key=f"contents-attachment-{uuid4()}",
        )

    def attachments(self, *, active: bool = False) -> AttachmentList:
        """Where this source is attached."""
        return self.client.list_content_attachments(
            source_uid=self.source_uid, active=active
        )

    def detach(self, attachment_uid: str) -> ContentAttachment:
        """Revoke one attachment of this source."""
        return self.client.revoke_content_attachment(attachment_uid)


class CloudStorageObject:
    """One object, opened for reading.

    A file-like the standard readers accept — `pandas.read_parquet`,
    `pyarrow`, `json.load` — that pulls through Contents rather than from the
    bucket, so the process never holds a bucket key. It is sequential and
    read-only: no `seek`, because there is one range request behind it and
    pretending otherwise would quietly re-read the object from the start.
    """

    def __init__(self, chunks: Iterator[bytes]) -> None:
        self._chunks = chunks
        self._buffer = b""
        self._done = False

    def readable(self) -> bool:
        return True

    def seekable(self) -> bool:
        return False

    def writable(self) -> bool:
        return False

    def read(self, size: int = -1) -> bytes:
        while (size < 0 or len(self._buffer) < size) and not self._done:
            try:
                self._buffer += next(self._chunks)
            except StopIteration:
                self._done = True
        if size < 0:
            taken, self._buffer = self._buffer, b""
            return taken
        taken, self._buffer = self._buffer[:size], self._buffer[size:]
        return taken

    def close(self) -> None:
        self._done = True
        self._buffer = b""
        closer = getattr(self._chunks, "close", None)
        if closer is not None:
            closer()

    def __enter__(self) -> "CloudStorageObject":
        return self

    def __exit__(self, *exception: Any) -> None:
        self.close()

    def __iter__(self) -> Iterator[bytes]:
        while True:
            chunk = self.read(1024 * 1024)
            if not chunk:
                return
            yield chunk


class CloudStorage(_Attached):
    """
    A bucket, container or shared filesystem, read through Contents.

    The point of reaching it from here rather than with `boto3` is what is
    *not* in the notebook: no key, no endpoint, no region. Contents holds the
    credential, applies the source's prefix and read/write mode, and answers
    with bytes. What you can see is what the source was configured to expose.

    Listing, stat and reads go through the service. `presign` is the one
    exception and it is deliberate: one object, one operation, minutes — for
    handing to something that cannot call Datalayer.
    """

    def __init__(self, client: DatalayerClient, source_uid: str) -> None:
        self.client = client
        self.source_uid = source_uid

    def test(self) -> dict[str, Any]:
        """Does the bucket answer with this credential, right now?"""
        return self.client.test_cloud_storage_connection(self.source_uid)

    def ls(self, prefix: str = "", *, recursive: bool = False) -> list[dict[str, Any]]:
        """The objects under `prefix`, following pagination to the end.

        Paths are relative to the source's own prefix; the source's prefix is
        never a thing the caller has to know or repeat.
        """
        found: list[dict[str, Any]] = []
        cursor: str | None = None
        while True:
            page = self.client.list_cloud_storage_objects(
                self.source_uid, prefix=prefix, cursor=cursor
            )
            found.extend(page.get("items", []))
            cursor = page.get("next_cursor")
            if not cursor:
                break
        if recursive:
            for entry in list(found):
                if entry.get("is_directory"):
                    found.extend(self.ls(entry["path"], recursive=True))
        return found

    def stat(self, path: str) -> dict[str, Any]:
        """Size, modification time and etag for one object."""
        return self.client.stat_cloud_storage_object(self.source_uid, path)

    def open(self, path: str, mode: str = "rb") -> CloudStorageObject:
        """One object as a file-like, streamed.

        Binary and read-only. A text mode or a write mode is refused here
        rather than at the first `read` — there is no write route on a Cloud
        Storage source, and failing at `open` says so while the caller can
        still see which line asked.
        """
        if mode not in {"rb", "r"}:
            raise ValueError(
                f"Cloud Storage objects open read-only and binary, not '{mode}'. "
                "Write to a Dataset or a Volume instead."
            )
        return CloudStorageObject(self.iter_bytes(path))

    def iter_bytes(
        self,
        path: str,
        *,
        byte_range: str | None = None,
        chunk_size: int = 1024 * 1024,
    ) -> Iterator[bytes]:
        """The object's bytes, a chunk at a time, optionally one HTTP range."""
        return self.client.iter_cloud_storage_object(
            self.source_uid, path, byte_range=byte_range, chunk_size=chunk_size
        )

    def presign(
        self, path: str, *, operation: str = "get", expires_in: int = 900
    ) -> dict[str, Any]:
        """A URL for one object, one operation, a short while."""
        return self.client.presign_cloud_storage_object(
            self.source_uid, path, operation=operation, expires_in=expires_in
        )

    def filesystem(self, implementation: str = "auto") -> Any:
        """An `fsspec` filesystem over this source, for libraries that want one.

        `implementation` exists because the answer is not always the same
        thing, and today there is one: `"auto"`, which reads through Contents.
        A provider-native `s3fs` needs bucket-scoped credentials handed to
        this process, and no route issues them — so asking for `"s3fs"` is
        refused with that reason rather than answered with something that
        merely looks like it.
        """
        if implementation not in {"auto", "datalayer"}:
            raise ValueError(
                f"'{implementation}' is not available from the client: Contents "
                "does not issue bucket credentials to a caller. Use "
                "filesystem() to read through the service, or attach the "
                "source to a sandbox for a provider-native mount."
            )
        from datalayer_core.contents_fsspec import ContentsFileSystem

        return ContentsFileSystem(storage=self)


class Dataset(_Attached):
    """
    A Dataset: its revisions, its publications, and files going into it.

    A revision is what makes a Dataset citable — it pins the versions that
    were there when somebody ran something, so re-running it a year later
    reads the same bytes. Uploading a file does not create one; pinning does.
    """

    def __init__(self, client: DatalayerClient, source_uid: str) -> None:
        self.client = client
        self.source_uid = source_uid

    def revisions(self) -> DatasetRevisionList:
        return self.client.list_dataset_revisions(self.source_uid)

    def revision(self, revision_uid: str) -> DatasetRevision:
        return self.client.get_dataset_revision(self.source_uid, revision_uid)

    def create_revision(
        self, request: Mapping[str, Any] | None = None, **fields: Any
    ) -> DatasetRevision:
        """Pin the current contents as a revision.

        The idempotency key is generated here. That is safe because a retry
        of *this* call is a retry of one intent; a second deliberate revision
        is a second call, with a key of its own.
        """
        payload: dict[str, Any] = dict(request or {})
        payload.update(fields)
        return self.client.create_dataset_revision(
            self.source_uid, payload, idempotency_key=f"contents-revision-{uuid4()}"
        )

    def publications(self) -> DatasetPublicationList:
        return self.client.list_dataset_publications(self.source_uid)

    def publish(
        self, request: Mapping[str, Any] | None = None, **fields: Any
    ) -> DatasetPublication:
        """Publish a revision of this Dataset.

        Not to be confused with `contents.publish(frame, name=...)`, which
        publishes a table for querying. This one makes a Dataset visible
        beyond the people it is shared with.
        """
        payload: dict[str, Any] = dict(request or {})
        payload.update(fields)
        return self.client.create_dataset_publication(
            self.source_uid, payload, idempotency_key=f"contents-publication-{uuid4()}"
        )

    def unpublish(self, publication_uid: str) -> DatasetPublication:
        return self.client.unpublish_dataset(self.source_uid, publication_uid)

    def upload(
        self,
        local_path: str | Path,
        destination_path: str,
        *,
        media_type: str = "application/octet-stream",
        overwrite: str = "reject",
        progress: Callable[[int, int, str], None] | None = None,
    ) -> TransferView:
        """Capture a local file into this Dataset.

        Run it where the file is — usually inside the sandbox — and the bytes
        go up through the same verified, resumable transfer the Home Folder
        uses.
        """
        return self.client.upload_dataset_file(
            local_path,
            self.source_uid,
            destination_path,
            idempotency_key=f"contents-dataset-upload-{uuid4()}",
            media_type=media_type,
            overwrite=overwrite,
            progress=progress,
        )


class Volume(_Attached):
    """
    A Volume: read-write storage that outlives the sandbox using it.

    There is little to *call* on a Volume, and that is the point — it is a
    filesystem. What is here is what a notebook needs before writing to one:
    where it lands, how big it is, and whether this attachment may write.
    Everything after that is `open()`.
    """

    def __init__(self, client: DatalayerClient, source_uid: str) -> None:
        self.client = client
        self.source_uid = source_uid

    def configuration(self) -> dict[str, Any]:
        """The Volume's own settings: capacity, scope, mount path, modes."""
        configuration = self.source().source.configuration
        if hasattr(configuration, "model_dump"):
            return dict(configuration.model_dump(mode="json"))
        return dict(configuration or {})

    def default_mount_path(self) -> str | None:
        """Where it appears when attached without a path."""
        return self.configuration().get("default_mount_path")

    def capacity_bytes(self) -> int | None:
        return self.configuration().get("capacity_bytes")

    def writable(self) -> bool:
        """Whether this Volume permits read-write attachments at all."""
        return "rw" in (self.configuration().get("access_modes") or [])

    def attach(
        self,
        sandbox_uid: str,
        *,
        path: str | None = None,
        read_only: bool = False,
        delivery: str = "mount",
        required: bool = True,
        provider: str = "datalayer",
        revision_uid: str | None = None,
    ) -> ContentAttachment:
        """Mount this Volume in a sandbox.

        A read-write attachment of a Volume configured read-only is refused
        here, with the configuration as the reason. The service refuses it
        too; doing it first turns a rejected request into a sentence naming
        the setting to change.
        """
        if not read_only and not self.writable():
            raise ValueError(
                f"Volume '{self.source_uid}' allows "
                f"{self.configuration().get('access_modes')} attachments only; "
                "pass read_only=True."
            )
        return super().attach(
            sandbox_uid,
            path=path,
            read_only=read_only,
            delivery=delivery,
            required=required,
            provider=provider,
            revision_uid=revision_uid,
        )


class Contents:
    def __init__(self, client: DatalayerClient | None = None) -> None:
        self._client = client

    @property
    def client(self) -> DatalayerClient:
        if self._client is None:
            self._client = DatalayerClient()
        return self._client

    def home_folder(self) -> HomeFolder:
        self.client.get_home_folder()
        return HomeFolder(self.client)

    def publish(
        self,
        table: Any,
        *,
        name: str,
        live: bool = False,
        **options: Any,
    ) -> dict[str, Any]:
        """Publish a table so other people can query it.

        ``contents.publish(frame, name="sales")`` writes the frame out and
        registers it. What comes back is a **Datasource** — nothing new to
        learn: it is queried the way every other Datasource is, with the same
        limits and the same result streaming.

        By default the table is a **snapshot** taken now: publishing the same
        name again replaces it, and nothing the kernel does in between changes
        what a query sees.

        With ``live=True`` this sandbox also answers queries against the
        object itself, so every query sees its current value. The snapshot is
        still written, and it is what queries fall back to once this sandbox
        stops — a live table does not vanish from under the people using it,
        it becomes explicitly the last known value.

        `table` may be a value or a callable. With ``live=True`` a **callable**
        is what makes it live: `publish(lambda: frame, name="sales", live=True)`
        follows the name, while passing the frame itself serves the object it
        was bound to at this moment.
        """
        subject = table() if (live and callable(table)) else table
        published = self.client.publish_table(subject, relation=name, **options)
        if live:
            published["live"] = self._serve_live(name, table)
        return published

    def _serve_live(self, name: str, table: Any) -> bool:
        """Serve `table` from this sandbox, if this process can.

        Answers whether it is **actually being served**, which is not the same
        question as whether the package imported. This used to return `True`
        as soon as the import succeeded, and the import is the easy half: the
        table is then registered in a process-local registry, and the server
        that would let anything reach it starts only where a runner has been
        configured. Where none has, the table sits in that registry unreachable
        and `publish(live=True)` said `live: True` — reporting success for a
        thing that had not happened, which is the one answer worse than
        reporting the failure.

        A sandbox that cannot serve live still publishes the snapshot and says
        the live half did not happen, rather than raising: the publication
        succeeded, and losing it to make a point about a missing package would
        be the wrong trade.
        """
        try:
            from datalayer_dataservers.live_server import live_server
        except ImportError:
            return False
        getter = table if callable(table) else (lambda: table)
        live_server.serve(name, getter)
        return live_server.running

    def _resolve(self, source: str, kind: str, label: str) -> str:
        """
        The uid of a source of one kind, given its uid or unambiguous name.

        Resolving by name lists the caller's sources of that kind once, so a
        notebook can say ``contents.datasource("earth-observation")`` rather
        than paste a uid.
        """
        try:
            resolved = self.client.get_content_source(source)
        except Exception:
            page = self.client.list_content_sources(kind=kind, limit=200)
            matches = [item for item in page.items if item.source.name == source]
            if len(matches) != 1:
                qualifier = f"Several {label} sources are" if matches else f"No {label} source is"
                raise LookupError(
                    f"{qualifier} named or identified by '{source}'"
                ) from None
            return str(matches[0].source.uid)
        found = getattr(resolved.value.source.kind, "value", resolved.value.source.kind)
        if found != kind:
            raise LookupError(f"'{source}' is a {found} source, not a {label} one")
        return str(resolved.value.source.uid)

    def mcp(self, source: str) -> McpSource:
        """An MCP source by uid or unambiguous name."""
        return McpSource(self.client, self._resolve(source, "mcp", "MCP"))

    def datasource(self, source: str) -> Datasource:
        """A Datasource by uid or unambiguous name."""
        return Datasource(self.client, self._resolve(source, "datasource", "Datasource"))

    def dataserver(self, source: str) -> Dataserver:
        """A Dataserver registration by uid or unambiguous name."""
        return Dataserver(self.client, self._resolve(source, "data-server", "Dataserver"))

    def cloud_storage(self, source: str) -> CloudStorage:
        """A Cloud Storage source by uid or unambiguous name."""
        return CloudStorage(
            self.client, self._resolve(source, "cloud-storage", "Cloud Storage")
        )

    def dataset(self, source: str) -> Dataset:
        """A Dataset by uid or unambiguous name."""
        return Dataset(self.client, self._resolve(source, "dataset", "Dataset"))

    def volume(self, source: str) -> Volume:
        """A Volume by uid or unambiguous name."""
        return Volume(self.client, self._resolve(source, "volume", "Volume"))


contents = Contents()

__all__ = [
    "CloudStorage",
    "CloudStorageObject",
    "Contents",
    "Dataserver",
    "Dataset",
    "Datasource",
    "HomeFolder",
    "McpSource",
    "Query",
    "QueryFailed",
    "Volume",
    "contents",
]
