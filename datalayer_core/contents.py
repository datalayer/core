# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""High-level Python Contents facade built on the canonical client mixin."""

from __future__ import annotations

import os
import sys
import tempfile
import time
from collections.abc import AsyncIterator
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
    ContentObject,
    DatasetRevision,
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


contents = Contents()

__all__ = [
    "Contents",
    "Dataserver",
    "Datasource",
    "HomeFolder",
    "McpSource",
    "Query",
    "QueryFailed",
    "contents",
]
