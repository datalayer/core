# Copyright (c) 2023-2026 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""The Contents displays draw the same thing from a model or a dictionary."""

from __future__ import annotations

import pytest
from rich.console import Console, RenderableType

from datalayer_core.displays.contents import (
    arrow_batches_table,
    content_sources_table,
    format_bytes,
    operations_table,
    sync_conflicts_table,
    sync_sessions_table,
    transfer_progress,
    transfers_table,
)
from datalayer_core.models.contents.generated import TransferView


def render(table: RenderableType) -> str:
    console = Console(width=200, record=True, file=open("/dev/null", "w"))
    console.print(table)
    return console.export_text()


def test_bytes_are_written_the_way_a_person_says_them() -> None:
    assert format_bytes(0) == "0 B"
    assert format_bytes(512) == "512 B"
    assert format_bytes(1024) == "1.0 KB"
    assert format_bytes(1024**3 * 2.5) == "2.5 GB"
    # An unknown size is unknown, not zero.
    assert format_bytes(None) == "-"


def test_catalog_rows_carry_the_caller_s_access() -> None:
    output = render(
        content_sources_table(
            [
                {
                    "source": {
                        "uid": "01SOURCE",
                        "kind": "dataset",
                        "name": "Earth data",
                        "status": "ready",
                    },
                    "permissions": {"effective_access_level": "edit"},
                }
            ]
        )
    )
    for expected in ("01SOURCE", "dataset", "Earth data", "edit", "ready"):
        assert expected in output


def test_a_bare_source_is_a_row_too() -> None:
    # `describe` answers one source, without the permissions wrapper.
    output = render(
        content_sources_table([{"uid": "01S", "name": "Volume", "kind": "volume"}])
    )
    assert "01S" in output
    assert "Volume" in output


def test_transfers_show_how_far_they_have_come() -> None:
    transfer = TransferView(
        created_at="2026-08-26T10:00:00Z",
        direction="upload",
        expected_checksum="sha256:0",
        expected_size=1000,
        media_type="text/csv",
        overwrite_policy="reject",
        path="reports/q3.csv",
        received_bytes=250,
        source_uid="01SOURCE",
        status="running",
        uid="01TRANSFER",
        updated_at="2026-08-26T10:00:10Z",
        part_count=1,
        parts=[],
    )
    output = render(transfers_table([transfer]))
    assert "reports/q3.csv" in output
    assert "25%" in output
    assert "1000 B" in output


def test_a_transfer_of_unknown_size_says_so_rather_than_zero() -> None:
    output = render(
        transfers_table(
            [
                {
                    "uid": "01T",
                    "path": "big.bin",
                    "status": "running",
                    "received_bytes": 10,
                }
            ]
        )
    )
    assert "-" in output
    assert "0%" not in output


def test_operations_report_the_attempt_and_the_reason_it_failed() -> None:
    output = render(
        operations_table(
            [
                {
                    "uid": "01OPERATION",
                    "operation_kind": "transfer",
                    "status": "failed",
                    "attempt": 2,
                    "max_attempts": 3,
                    "error_message": "The checksum did not match.",
                }
            ]
        )
    )
    assert "2/3" in output
    assert "The checksum did not match." in output


def test_a_running_operation_claims_no_reason() -> None:
    output = render(
        operations_table(
            [
                {
                    "uid": "01OP",
                    "operation_kind": "sync",
                    "status": "running",
                    "attempt": 1,
                    "max_attempts": 3,
                }
            ]
        )
    )
    assert "running" in output
    assert "None" not in output


def test_sync_sessions_show_what_moved() -> None:
    output = render(
        sync_sessions_table(
            [
                {
                    "uid": "01SESSION",
                    "remote_uri": "home-folder:///eric/reports",
                    "direction": "push",
                    "status": "running",
                    "uploaded_files": 3,
                    "downloaded_files": 1,
                    "deleted_files": 0,
                    "transferred_bytes": 2048,
                    "conflict_count": 2,
                }
            ]
        )
    )
    assert "home-folder:///eric/reports" in output
    assert "2.0 KB" in output
    assert "2" in output


def test_conflicts_name_the_path_and_the_decision() -> None:
    output = render(
        sync_conflicts_table(
            [
                {
                    "uid": "01CONFLICT",
                    "path": "notes.md",
                    "reason": "both-changed",
                    "status": "resolved",
                    "resolution": "keep-both",
                }
            ]
        )
    )
    assert "notes.md" in output
    assert "both-changed" in output
    assert "keep-both" in output


def test_an_unresolved_conflict_shows_a_dash_rather_than_none() -> None:
    output = render(
        sync_conflicts_table(
            [
                {
                    "uid": "01C",
                    "path": "notes.md",
                    "reason": "both-changed",
                    "status": "open",
                }
            ]
        )
    )
    assert "None" not in output
    assert "-" in output


def test_arrow_batches_are_previewed_up_to_the_limit() -> None:
    pyarrow = pytest.importorskip("pyarrow")
    batch = pyarrow.record_batch(
        [pyarrow.array([1, 2, 3]), pyarrow.array(["a", "b", "c"])],
        names=["n", "letter"],
    )
    output = render(arrow_batches_table([batch], limit=2))
    assert "letter" in output
    assert "a" in output and "b" in output
    # The third row is past the limit.
    assert "c" not in output.split("letter")[1]


def test_an_empty_arrow_stream_says_nothing_arrived() -> None:
    output = render(arrow_batches_table([]))
    assert "No record batch was received." in output


def test_the_transfer_progress_bar_is_built_from_the_shared_columns() -> None:
    progress = transfer_progress()
    # Bytes, speed and time left are what a transfer is watched by.
    columns = {type(column).__name__ for column in progress.columns}
    assert {"DownloadColumn", "TransferSpeedColumn", "TimeRemainingColumn"} <= columns
