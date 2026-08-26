# Copyright (c) 2023-2026 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""
Rich displays for Contents catalogs, operations and Arrow batches.

One place decides what a catalog row, a transfer, an operation, a
synchronization session, a conflict and a batch of Arrow look like. The CLI, a
notebook and a script that drives the client all reach for the same function,
so the same thing is shown the same way wherever a reader meets it.

Every display accepts the generated Pydantic models and the plain dictionaries
they dump to: the CLI holds dictionaries because it also emits JSON and YAML,
and a caller who kept the model should not have to take it apart first.
"""

from __future__ import annotations

from collections.abc import Iterable, Sequence
from typing import Any

from rich.console import Console
from rich.progress import (
    BarColumn,
    DownloadColumn,
    Progress,
    SpinnerColumn,
    TaskProgressColumn,
    TextColumn,
    TimeRemainingColumn,
    TransferSpeedColumn,
)
from rich.table import Table

__all__ = [
    "arrow_batches_table",
    "content_sources_table",
    "display_arrow_batches",
    "display_content_sources",
    "display_operations",
    "display_sync_conflicts",
    "display_sync_sessions",
    "display_transfers",
    "format_bytes",
    "operations_table",
    "sync_conflicts_table",
    "sync_sessions_table",
    "transfer_progress",
    "transfers_table",
]

_BYTE_UNITS = ("B", "KB", "MB", "GB", "TB", "PB")


def _field(item: Any, name: str, default: Any = None) -> Any:
    """Read one field from a model or from the dictionary it dumps to."""
    if isinstance(item, dict):
        return item.get(name, default)
    return getattr(item, name, default)


def _text(item: Any, name: str, default: str = "") -> str:
    value = _field(item, name)
    if value is None:
        return default
    return str(value)


def format_bytes(size: float | int | None) -> str:
    """A byte count as a person would say it: `1.4 MB`, `0 B`, `-` for unknown."""
    if size is None:
        return "-"
    amount = float(size)
    for unit in _BYTE_UNITS:
        if abs(amount) < 1024 or unit == _BYTE_UNITS[-1]:
            if unit == "B":
                return f"{int(amount)} {unit}"
            return f"{amount:.1f} {unit}"
        amount /= 1024
    return f"{amount:.1f} {_BYTE_UNITS[-1]}"


def _percent(received: Any, expected: Any) -> str:
    """How far a transfer has come, when the total is known."""
    try:
        done = float(received or 0)
        total = float(expected)
    except (TypeError, ValueError):
        return "-"
    if not total:
        return "-"
    return f"{min(done / total, 1.0) * 100:.0f}%"


def content_sources_table(items: Iterable[Any], *, title: str | None = None) -> Table:
    """The catalog, one row per content source the caller can see."""
    table = Table(title=title)
    table.add_column("UID", style="cyan", no_wrap=True)
    table.add_column("Type", style="cyan")
    table.add_column("Name", style="cyan")
    table.add_column("Access", style="cyan")
    table.add_column("Status", style="cyan")
    for item in items:
        # A catalog row wraps the source with the caller's permissions on it;
        # a bare source is accepted too, since that is what a detail call
        # answers.
        source = _field(item, "source", item)
        permissions = _field(item, "permissions", {}) or {}
        table.add_row(
            _text(source, "uid"),
            _text(source, "kind"),
            _text(source, "name"),
            _text(permissions, "effective_access_level"),
            _text(source, "status"),
        )
    return table


def transfers_table(items: Iterable[Any], *, title: str | None = None) -> Table:
    """Build a table of transfers with how far each has come."""
    table = Table(title=title)
    table.add_column("UID", style="cyan", no_wrap=True)
    table.add_column("Path", style="cyan")
    table.add_column("Direction", style="cyan")
    table.add_column("Status", style="cyan")
    table.add_column("Done", style="cyan", justify="right")
    table.add_column("Size", style="cyan", justify="right")
    for item in items:
        expected = _field(item, "expected_size")
        table.add_row(
            _text(item, "uid"),
            _text(item, "path"),
            _text(item, "direction"),
            _text(item, "status"),
            _percent(_field(item, "received_bytes"), expected),
            format_bytes(expected),
        )
    return table


def operations_table(items: Iterable[Any], *, title: str | None = None) -> Table:
    """Durable operations: what is running, what failed and why."""
    table = Table(title=title)
    table.add_column("UID", style="cyan", no_wrap=True)
    table.add_column("Operation", style="cyan")
    table.add_column("Status", style="cyan")
    table.add_column("Attempt", style="cyan", justify="right")
    table.add_column("Detail", style="cyan")
    for item in items:
        attempt = _field(item, "attempt")
        max_attempts = _field(item, "max_attempts")
        attempts = (
            f"{attempt}/{max_attempts}"
            if attempt is not None and max_attempts is not None
            else _text(item, "attempt", "-")
        )
        # An operation that failed says why; one that is still running says
        # nothing, which is the honest answer.
        detail = _text(item, "error_message") or _text(item, "error_code")
        table.add_row(
            _text(item, "uid"),
            _text(item, "operation_kind"),
            _text(item, "status"),
            attempts,
            detail,
        )
    return table


def sync_sessions_table(items: Iterable[Any], *, title: str | None = None) -> Table:
    """Synchronization sessions, with what each has moved so far."""
    table = Table(title=title)
    table.add_column("UID", style="cyan", no_wrap=True)
    table.add_column("Remote", style="cyan")
    table.add_column("Direction", style="cyan")
    table.add_column("Status", style="cyan")
    table.add_column("Up", style="cyan", justify="right")
    table.add_column("Down", style="cyan", justify="right")
    table.add_column("Deleted", style="cyan", justify="right")
    table.add_column("Bytes", style="cyan", justify="right")
    table.add_column("Conflicts", style="cyan", justify="right")
    for item in items:
        table.add_row(
            _text(item, "uid"),
            _text(item, "remote_uri"),
            _text(item, "direction"),
            _text(item, "status"),
            _text(item, "uploaded_files", "0"),
            _text(item, "downloaded_files", "0"),
            _text(item, "deleted_files", "0"),
            format_bytes(_field(item, "transferred_bytes")),
            _text(item, "conflict_count", "0"),
        )
    return table


def sync_conflicts_table(items: Iterable[Any], *, title: str | None = None) -> Table:
    """The paths a synchronization cannot decide on its own."""
    table = Table(title=title)
    table.add_column("UID", style="cyan", no_wrap=True)
    table.add_column("Path", style="cyan")
    table.add_column("Reason", style="cyan")
    table.add_column("Status", style="cyan")
    table.add_column("Resolution", style="cyan")
    for item in items:
        table.add_row(
            _text(item, "uid"),
            _text(item, "path"),
            _text(item, "reason"),
            _text(item, "status"),
            _text(item, "resolution", "-"),
        )
    return table


def arrow_batches_table(
    batches: Iterable[Any],
    *,
    limit: int = 10,
    title: str | None = None,
) -> Table:
    """
    The first rows of a stream of Arrow record batches.

    Duck-typed on purpose: anything with a `schema.names` and a `to_pylist()`
    is drawn, so `pyarrow` is needed by the caller who produced the batches
    and not by this package.
    """
    table = Table(title=title)
    columns: Sequence[str] = ()
    shown = 0
    for batch in batches:
        if not columns:
            columns = list(getattr(batch.schema, "names", []))
            for column in columns:
                table.add_column(str(column), style="cyan")
        if shown >= limit:
            break
        for row in batch.to_pylist():
            if shown >= limit:
                break
            table.add_row(*(str(row.get(column, "")) for column in columns))
            shown += 1
    if not columns:
        table.add_column("Arrow", style="cyan")
        table.add_row("No record batch was received.")
    return table


def transfer_progress(console: Console | None = None) -> Progress:
    """
    The progress bar transfers are watched with.

    A caller adds one task per file and updates it as bytes arrive; the
    columns — bar, bytes, speed, time left — are the same in the CLI and in a
    notebook, so a transfer looks like a transfer wherever it is watched.
    """
    return Progress(
        SpinnerColumn(),
        TextColumn("{task.description}"),
        BarColumn(),
        TaskProgressColumn(),
        DownloadColumn(),
        TransferSpeedColumn(),
        TimeRemainingColumn(),
        console=console,
    )


def _print(table: Table, console: Console | None) -> None:
    (console or Console()).print(table)


def display_content_sources(
    items: Iterable[Any], *, console: Console | None = None, title: str | None = None
) -> None:
    """Print the catalog."""
    _print(content_sources_table(items, title=title), console)


def display_transfers(
    items: Iterable[Any], *, console: Console | None = None, title: str | None = None
) -> None:
    """Print transfers and their progress."""
    _print(transfers_table(items, title=title), console)


def display_operations(
    items: Iterable[Any], *, console: Console | None = None, title: str | None = None
) -> None:
    """Print durable operations."""
    _print(operations_table(items, title=title), console)


def display_sync_sessions(
    items: Iterable[Any], *, console: Console | None = None, title: str | None = None
) -> None:
    """Print synchronization sessions."""
    _print(sync_sessions_table(items, title=title), console)


def display_sync_conflicts(
    items: Iterable[Any], *, console: Console | None = None, title: str | None = None
) -> None:
    """Print the conflicts of a synchronization session."""
    _print(sync_conflicts_table(items, title=title), console)


def display_arrow_batches(
    batches: Iterable[Any],
    *,
    limit: int = 10,
    console: Console | None = None,
    title: str | None = None,
) -> None:
    """Print the first rows of a stream of Arrow record batches."""
    _print(arrow_batches_table(batches, limit=limit, title=title), console)
