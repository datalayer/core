# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""Contents command group; feature commands are added by delivery milestones."""

import json
import os
import sys
import tempfile
from collections.abc import Iterator
from contextlib import contextmanager
from dataclasses import dataclass
from functools import wraps
from pathlib import Path
from typing import Any, Callable, TypeVar
from uuid import uuid4

import typer
import yaml
from rich.console import Console
from rich.progress import Progress, SpinnerColumn, TextColumn
from rich.table import Table

from datalayer_core.client.client import DatalayerClient
from datalayer_core.displays.contents import (
    content_sources_table,
    operations_table,
    sync_conflicts_table,
    sync_sessions_table,
    transfers_table,
)
from datalayer_core.mixins.contents import ConditionalCatalogSource
from datalayer_core.models.contents import ContentAttachment

# `enum.StrEnum` is 3.11+, and this package still supports 3.10.
if sys.version_info >= (3, 11):
    from enum import StrEnum
else:
    from enum import Enum

    class StrEnum(str, Enum):  # type: ignore[no-redef]
        """Values that are their own string, as :class:`enum.StrEnum` gives."""

        def __str__(self) -> str:
            """
            Return the member value.

            Returns
            -------
            str
                The member's value, not its qualified name.
            """
            return str(self.value)


_Command = TypeVar("_Command", bound=Callable[..., Any])
console = Console()
error_console = Console(stderr=True)


class OutputFormat(StrEnum):
    TABLE = "table"
    JSON = "json"
    YAML = "yaml"


@dataclass(frozen=True)
class ContentsCLIContext:
    output: OutputFormat


class ContentsCommandError(RuntimeError):
    """A safe, user-facing Contents command error."""


def contents_command(function: _Command) -> _Command:
    """Apply the common Contents error boundary to a CLI command."""

    @wraps(function)
    def wrapped(*args: Any, **kwargs: Any) -> Any:
        try:
            return function(*args, **kwargs)
        except ContentsCommandError as error:
            error_console.print(f"[red]{error}[/red]")
            raise typer.Exit(1) from None

    return wrapped  # type: ignore[return-value]


@contextmanager
def contents_progress(message: str) -> Iterator[None]:
    """Render the spinner convention shared by long-running commands."""

    with Progress(
        SpinnerColumn(),
        TextColumn("{task.description}"),
        console=console,
        transient=True,
    ) as progress:
        progress.add_task(message, total=None)
        yield


app = typer.Typer(
    name="contents",
    help="Browse, transfer, attach, and manage Datalayer Contents.",
    invoke_without_command=True,
    no_args_is_help=True,
)


@app.callback()
def contents_callback(
    ctx: typer.Context,
    output: OutputFormat = typer.Option(
        OutputFormat.TABLE,
        "--output",
        "-o",
        case_sensitive=False,
        help="Output format used by Contents commands.",
    ),
) -> None:
    """Use the shared CLI authentication and the selected output format."""

    ctx.obj = ContentsCLIContext(output=output)


def _context(ctx: typer.Context) -> ContentsCLIContext:
    value = ctx.find_object(ContentsCLIContext)
    return value or ContentsCLIContext(output=OutputFormat.TABLE)


def _table_for(rows: list[dict[str, Any]]) -> Table:
    """
    The display that fits what came back.

    The commands answer catalog rows, transfers, operations, synchronization
    sessions and conflicts, and each of those has a table of its own in
    `datalayer_core.displays.contents` — the same one a notebook or a script
    would reach for. What the rows carry says which it is; a shape nothing
    recognises is still a catalog row, which is what most of them are.
    """
    first = rows[0] if rows else {}
    if "operation_kind" in first:
        return operations_table(rows)
    if "remote_uri" in first:
        return sync_sessions_table(rows)
    if "session_uid" in first and "reason" in first:
        return sync_conflicts_table(rows)
    if "received_bytes" in first:
        return transfers_table(rows)
    return content_sources_table(rows)


def _render(value: Any, context: ContentsCLIContext) -> None:
    if hasattr(value, "model_dump"):
        value = value.model_dump(mode="json")
    if context.output is OutputFormat.JSON:
        console.print_json(json.dumps(value))
        return
    if context.output is OutputFormat.YAML:
        console.print(yaml.safe_dump(value, sort_keys=False).rstrip())
        return
    if isinstance(value, list):
        console.print(_table_for(value))
        return
    # One of the same things, on its own: a table of one row reads better than
    # a dictionary, and reads the same as the list it came from.
    if isinstance(value, dict) and "uid" in value:
        console.print(_table_for([value]))
        return
    console.print(value)


def _client() -> DatalayerClient:
    try:
        return DatalayerClient()
    except Exception as error:
        raise ContentsCommandError(str(error)) from error


def _resolve_source(
    client: DatalayerClient, reference: str
) -> ConditionalCatalogSource:
    try:
        return client.get_content_source(reference)
    except Exception:
        page = client.list_content_sources(limit=200)
        matches = [item for item in page.items if item.source.name == reference]
        if len(matches) != 1:
            qualifier = "Several sources are" if matches else "No source is"
            raise ContentsCommandError(
                f"{qualifier} named or identified by '{reference}'"
            )
        return client.get_content_source(matches[0].source.uid)


def _home_folder_path(uri_or_path: str) -> str:
    prefix = "home-folder:///"
    value = (
        uri_or_path[len(prefix) :] if uri_or_path.startswith(prefix) else uri_or_path
    )
    value = value.lstrip("/")
    if not value:
        raise ContentsCommandError("A Home Folder file path is required")
    return value


@app.command(name="list")
@contents_command
def list_contents(
    ctx: typer.Context,
    source: str | None = typer.Option(
        None,
        "--source",
        help="Filter by content source type, such as dataset or volume.",
    ),
    space_uid: str | None = typer.Option(None, "--space", help="Filter by Space UID."),
    cursor: str | None = typer.Option(
        None, "--cursor", help="Continue a catalog page."
    ),
    limit: int = typer.Option(50, "--limit", min=1, max=200),
) -> None:
    """List content sources available to the authenticated user."""

    try:
        page = _client().list_content_sources(
            kind=source, space_uid=space_uid, cursor=cursor, limit=limit
        )
    except Exception as error:
        raise ContentsCommandError(str(error)) from error
    result = page.model_dump(mode="json")
    if _context(ctx).output is OutputFormat.TABLE:
        _render(result["items"], _context(ctx))
        if result.get("next_cursor"):
            console.print(f"Next cursor: {result['next_cursor']}")
    else:
        _render(result, _context(ctx))


@app.command(name="describe")
@contents_command
def describe_content(ctx: typer.Context, source: str = typer.Argument(...)) -> None:
    """Describe a content source by UID or unambiguous name."""

    resolved = _resolve_source(_client(), source)
    _render(resolved.value.model_dump(mode="json"), _context(ctx))


home_folder_app = typer.Typer(
    name="home-folder", help="Browse and recover private Home Folder files."
)
app.add_typer(home_folder_app)


@home_folder_app.command(name="list")
@contents_command
def home_folder_list(
    ctx: typer.Context,
    prefix: str | None = typer.Option(None, "--prefix"),
    cursor: str | None = typer.Option(None, "--cursor"),
    limit: int = typer.Option(100, "--limit", min=1, max=200),
) -> None:
    page = _client().list_home_folder_objects(prefix=prefix, cursor=cursor, limit=limit)
    _render(page.model_dump(mode="json"), _context(ctx))


@home_folder_app.command(name="versions")
@contents_command
def home_folder_versions(ctx: typer.Context, path: str = typer.Argument(...)) -> None:
    client = _client()
    object_ = client.stat_home_folder_object(_home_folder_path(path))
    versions = client.list_home_folder_object_versions(object_.uid)
    _render(versions.model_dump(mode="json"), _context(ctx))


@home_folder_app.command(name="restore")
@contents_command
def home_folder_restore(
    ctx: typer.Context,
    path: str = typer.Argument(...),
    version: str = typer.Option(..., "--version"),
) -> None:
    client = _client()
    object_ = client.stat_home_folder_object(_home_folder_path(path))
    restored = client.restore_home_folder_object(
        object_.uid,
        version,
        idempotency_key=f"cli-restore-{uuid4()}",
    )
    _render(restored.model_dump(mode="json"), _context(ctx))


@app.command(name="upload")
@contents_command
def upload_content(
    ctx: typer.Context,
    local_path: Path = typer.Argument(..., exists=True, dir_okay=False),
    destination: str = typer.Argument(...),
    overwrite: bool = typer.Option(False, "--overwrite"),
) -> None:
    destination_path = _home_folder_path(destination)
    try:
        with contents_progress(f"Uploading {local_path.name}"):
            transfer = _client().upload_home_folder_file(
                local_path,
                destination_path,
                idempotency_key=f"cli-upload-{uuid4()}",
                overwrite="replace" if overwrite else "reject",
            )
    except Exception as error:
        raise ContentsCommandError(str(error)) from error
    _render(transfer.model_dump(mode="json"), _context(ctx))


@app.command(name="download")
@contents_command
def download_content(
    source: str = typer.Argument(...),
    local_path: Path = typer.Argument(...),
    overwrite: bool = typer.Option(False, "--overwrite"),
) -> None:
    if local_path.exists() and not overwrite:
        raise ContentsCommandError(
            f"Destination '{local_path}' exists; pass --overwrite to replace it"
        )
    client = _client()
    object_ = client.stat_home_folder_object(_home_folder_path(source))
    local_path.parent.mkdir(parents=True, exist_ok=True)
    descriptor, temporary_name = tempfile.mkstemp(
        prefix=f".{local_path.name}.", suffix=".part", dir=local_path.parent
    )
    try:
        with (
            os.fdopen(descriptor, "wb") as output,
            contents_progress(f"Downloading {object_.path}"),
        ):
            for chunk in client.iter_home_folder_object(object_.uid):
                output.write(chunk)
        os.replace(temporary_name, local_path)
    except Exception as error:
        Path(temporary_name).unlink(missing_ok=True)
        raise ContentsCommandError(str(error)) from error


@app.command(name="sync")
@contents_command
def sync_folder(
    ctx: typer.Context,
    local_path: Path = typer.Argument(
        ..., exists=True, file_okay=False, resolve_path=True
    ),
    remote: str = typer.Argument(
        ..., help="A folder of the Home Folder, as home-folder:///path"
    ),
    direction: str = typer.Option(
        "bidirectional", "--direction", help="push, pull or bidirectional"
    ),
    watch: bool = typer.Option(
        False, "--watch", help="Keep the session open and reconcile as files change"
    ),
    exclude: list[str] = typer.Option(
        [], "--exclude", help="gitignore-style pattern; repeatable"
    ),
    conflict: str = typer.Option(
        "manual", "--conflict", help="manual, newest, local or remote"
    ),
    delete: bool = typer.Option(
        False, "--delete", help="Propagate deletions in the selected direction"
    ),
    block_size: int = typer.Option(
        4 * 1024 * 1024, "--block-size", help="Bytes per hashed block"
    ),
    interval: float = typer.Option(
        5.0, "--interval", help="Seconds between scans while watching"
    ),
) -> None:
    """Synchronize a local folder with a folder of the Home Folder."""
    from datalayer_core.contents_sync import Synchronizer, SyncOutcome

    if not remote.startswith("home-folder:///"):
        raise ContentsCommandError(
            "This release synchronizes with a folder of the Home Folder: "
            "address it as home-folder:///path"
        )
    context = _context(ctx)
    quiet = context.output is not OutputFormat.TABLE

    def say(message: str) -> None:
        if not quiet:
            console.print(f"[dim]{message}[/dim]")

    synchronizer = Synchronizer(
        _client(),
        local_root=local_path,
        remote_uri=remote,
        direction=direction,
        conflict_policy=conflict,
        delete=delete,
        exclusions=exclude,
        block_size=block_size,
        progress=say,
    )
    try:
        if watch:

            def report(outcome: SyncOutcome) -> None:
                _render(outcome.to_dict(), context)

            outcome = synchronizer.watch(interval_seconds=interval, on_pass=report)
        else:
            outcome = synchronizer.run_once()
    except Exception as error:
        raise ContentsCommandError(str(error)) from error
    if not watch:
        _render(outcome.to_dict(), context)
    if outcome.conflicts and not quiet:
        console.print(
            f"[yellow]{len(outcome.conflicts)} path(s) need a decision: "
            f"datalayer contents sync-conflicts {outcome.session_uid}[/yellow]"
        )
    if outcome.status == "failed":
        raise typer.Exit(1)


@app.command(name="sync-status")
@contents_command
def sync_status(ctx: typer.Context, session_uid: str) -> None:
    session = _client().get_content_sync(session_uid)
    _render(session.model_dump(mode="json", exclude={"plan"}), _context(ctx))


@app.command(name="sync-list")
@contents_command
def sync_list(
    ctx: typer.Context, active: bool = typer.Option(False, "--active")
) -> None:
    sessions = _client().list_content_syncs(active=active)
    _render(
        [item.model_dump(mode="json", exclude={"plan"}) for item in sessions.items],
        _context(ctx),
    )


@app.command(name="sync-cancel")
@contents_command
def sync_cancel(ctx: typer.Context, session_uid: str) -> None:
    session = _client().cancel_content_sync(session_uid)
    _render(session.model_dump(mode="json", exclude={"plan"}), _context(ctx))


@app.command(name="sync-conflicts")
@contents_command
def sync_conflicts(
    ctx: typer.Context,
    session_uid: str,
    open_only: bool = typer.Option(True, "--open/--all"),
) -> None:
    conflicts = _client().list_content_sync_conflicts(session_uid, open_only=open_only)
    _render([item.model_dump(mode="json") for item in conflicts.items], _context(ctx))


@app.command(name="sync-resolve")
@contents_command
def sync_resolve(
    ctx: typer.Context,
    session_uid: str,
    conflict_uid: str,
    use: str = typer.Option(..., "--use", help="local, remote or keep-both"),
) -> None:
    """Decide a conflict; the decision is applied on the next `sync` of the folder."""
    if use not in {"local", "remote", "keep-both"}:
        raise ContentsCommandError("--use must be local, remote or keep-both")
    session = _client().resolve_content_sync_conflict(
        session_uid, conflict_uid, use=use
    )
    _render(session.model_dump(mode="json", exclude={"plan"}), _context(ctx))


transfer_app = typer.Typer(name="transfer", help="Inspect or cancel transfers.")
app.add_typer(transfer_app)


@transfer_app.command(name="status")
@contents_command
def transfer_status(ctx: typer.Context, transfer_uid: str) -> None:
    transfer = _client().get_content_transfer(transfer_uid)
    _render(transfer.model_dump(mode="json"), _context(ctx))


@transfer_app.command(name="cancel")
@contents_command
def transfer_cancel(ctx: typer.Context, transfer_uid: str) -> None:
    transfer = _client().cancel_content_transfer(transfer_uid)
    _render(transfer.model_dump(mode="json"), _context(ctx))


sandbox_app = typer.Typer(
    name="sandbox", help="List, attach, and detach Code Sandbox contents."
)
app.add_typer(sandbox_app)


def _attach_source(
    *,
    client: DatalayerClient,
    sandbox_uid: str,
    source: str,
    provider: str,
    mount_path: str | None,
    mode: str,
    delivery: str,
    required: bool = True,
    revision_uid: str | None = None,
) -> ContentAttachment:
    resolved = _resolve_source(client, source)
    return client.create_content_attachment(
        {
            "source_uid": resolved.value.source.uid,
            "revision_uid": revision_uid,
            "sandbox_uid": sandbox_uid,
            "sandbox_provider": provider,
            "mode": mode,
            "mount_path": mount_path,
            "delivery": delivery,
            "required": required,
        },
        idempotency_key=f"cli-attachment-{uuid4()}",
    )


@sandbox_app.command(name="list")
@contents_command
def sandbox_list(
    ctx: typer.Context,
    sandbox_uid: str | None = typer.Argument(None),
    active: bool = typer.Option(False, "--active"),
) -> None:
    attachments = _client().list_content_attachments(
        sandbox_uid=sandbox_uid, active=active
    )
    _render(attachments.model_dump(mode="json"), _context(ctx))


@sandbox_app.command(name="attach")
@contents_command
def sandbox_attach(
    ctx: typer.Context,
    sandbox_uid: str = typer.Argument(...),
    source: str = typer.Argument(...),
    provider: str = typer.Option(..., "--provider"),
    mount_path: str | None = typer.Option(None, "--path", "--mount-path"),
    read_write: bool = typer.Option(False, "--read-write"),
    delivery: str = typer.Option("mount", "--delivery"),
    optional: bool = typer.Option(False, "--optional"),
) -> None:
    client = _client()
    try:
        attachment = _attach_source(
            client=client,
            sandbox_uid=sandbox_uid,
            source=source,
            provider=provider,
            mount_path=mount_path,
            mode="rw" if read_write else "ro",
            delivery=delivery,
            required=not optional,
        )
    except Exception as error:
        raise ContentsCommandError(str(error)) from error
    _render(attachment.model_dump(mode="json"), _context(ctx))


@sandbox_app.command(name="detach")
@contents_command
def sandbox_detach(
    ctx: typer.Context,
    sandbox_uid: str,
    attachment_uid: str,
) -> None:
    try:
        client = _client()
        attachments = client.list_content_attachments(sandbox_uid=sandbox_uid)
        if attachment_uid not in {item.uid for item in attachments.items}:
            raise ContentsCommandError(
                f"Attachment {attachment_uid} is not attached to {sandbox_uid}"
            )
        attachment = client.revoke_content_attachment(attachment_uid)
    except Exception as error:
        raise ContentsCommandError(str(error)) from error
    _render(attachment.model_dump(mode="json"), _context(ctx))


volumes_app = typer.Typer(name="volumes", help="Manage persistent Volume sources.")
app.add_typer(volumes_app)


@volumes_app.command(name="list")
@contents_command
def volumes_list(ctx: typer.Context) -> None:
    _render(
        _client()
        .list_content_sources(kind="volume", limit=200)
        .model_dump(mode="json"),
        _context(ctx),
    )


@volumes_app.command(name="create")
@contents_command
def volume_create(
    ctx: typer.Context,
    name: str,
    backing_resource_id: str | None = typer.Option(None, "--backing-resource"),
    capacity_bytes: int = typer.Option(..., "--capacity-bytes", min=1),
    mount_path: str = typer.Option(..., "--path", "--mount-path"),
    scope: str = typer.Option("user", "--scope"),
    space_uid: str | None = typer.Option(None, "--space"),
) -> None:
    if scope not in {"user", "space"}:
        raise ContentsCommandError("--scope must be user or space")
    if scope == "space" and not space_uid:
        raise ContentsCommandError("--space is required when --scope is space")
    created = _client().create_content_source(
        {
            "name": name,
            "kind": "volume",
            "capabilities": ["browse", "transfer", "mount"],
            "space_uid": space_uid,
            "configuration": {
                "kind": "volume",
                "scope": scope,
                "capacity_bytes": capacity_bytes,
                "access_modes": ["ro", "rw"],
                "default_mount_path": mount_path,
                "backing_resource_id": backing_resource_id,
                "concurrent_readers": True,
                "concurrent_writers": True,
            },
        },
        idempotency_key=f"cli-volume-{uuid4()}",
    )
    _render(created.value.model_dump(mode="json"), _context(ctx))


@volumes_app.command(name="attach")
@contents_command
def volume_attach(
    ctx: typer.Context,
    source: str,
    sandbox_uid: str,
    mount_path: str | None = typer.Option(None, "--path", "--mount-path"),
    read_only: bool = typer.Option(False, "--read-only"),
    provider: str = typer.Option("datalayer", "--sandbox-provider"),
) -> None:
    """Attach a Contents-managed Volume to a Code Sandbox."""

    attachment = _attach_source(
        client=_client(),
        sandbox_uid=sandbox_uid,
        source=source,
        provider=provider,
        mount_path=mount_path,
        mode="ro" if read_only else "rw",
        delivery="mount",
    )
    _render(attachment.model_dump(mode="json"), _context(ctx))


datasets_app = typer.Typer(name="datasets", help="Manage versioned Dataset sources.")
app.add_typer(datasets_app)


@datasets_app.command(name="list")
@contents_command
def datasets_list(ctx: typer.Context) -> None:
    _render(
        _client()
        .list_content_sources(kind="dataset", limit=200)
        .model_dump(mode="json"),
        _context(ctx),
    )


@datasets_app.command(name="create")
@contents_command
def dataset_create(
    ctx: typer.Context,
    name: str,
    description: str | None = typer.Option(None, "--description"),
    tag: list[str] | None = typer.Option(None, "--tag"),
) -> None:
    created = _client().create_content_source(
        {
            "name": name,
            "description": description,
            "kind": "dataset",
            "capabilities": ["browse", "transfer", "materialize"],
            "configuration": {
                "kind": "dataset",
                "current_revision_uid": None,
                "publication_eligible": False,
                "tags": tag or [],
            },
        },
        idempotency_key=f"cli-dataset-{uuid4()}",
    )
    _render(created.value.model_dump(mode="json"), _context(ctx))


@datasets_app.command(name="revisions")
@contents_command
def dataset_revisions(ctx: typer.Context, source: str) -> None:
    client = _client()
    uid = _resolve_source(client, source).value.source.uid
    _render(client.list_dataset_revisions(uid).model_dump(mode="json"), _context(ctx))


@datasets_app.command(name="create-revision")
@contents_command
def dataset_create_revision(
    ctx: typer.Context,
    source: str,
    files: list[str] = typer.Option(..., "--file"),
    origin: str = typer.Option("home-folder", "--origin"),
) -> None:
    selected = []
    for value in files:
        parts = value.split(":", 2)
        if len(parts) < 2 or not all(parts[:2]):
            raise ContentsCommandError(
                "--file must be OBJECT_UID:VERSION_UID[:DESTINATION_PATH]"
            )
        selected.append(
            {
                "object_uid": parts[0],
                "version_uid": parts[1],
                "path": parts[2] if len(parts) == 3 else None,
            }
        )
    client = _client()
    uid = _resolve_source(client, source).value.source.uid
    revision = client.create_dataset_revision(
        uid,
        {"origin_kind": origin, "files": selected},
        idempotency_key=f"cli-dataset-revision-{uuid4()}",
    )
    _render(revision.model_dump(mode="json"), _context(ctx))


@datasets_app.command(name="materialize")
@contents_command
def dataset_materialize(
    ctx: typer.Context,
    source: str,
    revision_uid: str = typer.Option(..., "--revision"),
    sandbox_uid: str = typer.Option(..., "--sandbox"),
    destination: str | None = typer.Option(None, "--path", "--destination"),
    provider: str = typer.Option("datalayer", "--sandbox-provider"),
) -> None:
    """Materialize one immutable Dataset revision in a Code Sandbox."""

    attachment = _attach_source(
        client=_client(),
        sandbox_uid=sandbox_uid,
        source=source,
        provider=provider,
        mount_path=destination,
        mode="ro",
        delivery="materialize",
        revision_uid=revision_uid,
    )
    _render(attachment.model_dump(mode="json"), _context(ctx))


cloud_storage_app = typer.Typer(
    name="cloud-storage", help="Manage scoped Cloud Storage sources."
)
app.add_typer(cloud_storage_app)


@cloud_storage_app.command(name="list")
@contents_command
def cloud_storage_list(ctx: typer.Context) -> None:
    page = _client().list_content_sources(kind="cloud-storage", limit=200)
    _render(page.model_dump(mode="json"), _context(ctx))


@cloud_storage_app.command(name="create")
@contents_command
def cloud_storage_create(
    ctx: typer.Context,
    name: str = typer.Argument(...),
    provider: str = typer.Option(..., "--provider"),
    bucket: str = typer.Option(..., "--bucket", "--container"),
    credential_uid: str = typer.Option(..., "--credential"),
    prefix: str = typer.Option("", "--prefix"),
    region: str | None = typer.Option(None, "--region"),
    endpoint: str | None = typer.Option(None, "--endpoint"),
    read_only: bool = typer.Option(False, "--read-only"),
    access: str = typer.Option("automatic", "--access"),
    mount_implementation: str | None = typer.Option(None, "--mount-implementation"),
    python_implementation: str | None = typer.Option(None, "--python-implementation"),
) -> None:
    capabilities = ["browse", "transfer", "mount"]
    if not read_only:
        capabilities.append("sync")
    try:
        created = _client().create_content_source(
            {
                "name": name,
                "kind": "cloud-storage",
                "credential_uid": credential_uid,
                "capabilities": capabilities,
                "configuration": {
                    "kind": "cloud-storage",
                    "provider": provider,
                    "bucket_or_container": bucket,
                    "prefix": prefix,
                    "region": region,
                    "endpoint": endpoint,
                    "credential_uid": credential_uid,
                    "access_preference": access,
                    "mount_implementation": mount_implementation,
                    "python_implementation": python_implementation,
                },
            },
            idempotency_key=f"cli-cloud-storage-{uuid4()}",
        )
    except Exception as error:
        raise ContentsCommandError(str(error)) from error
    _render(created.value.model_dump(mode="json"), _context(ctx))


@cloud_storage_app.command(name="objects")
@contents_command
def cloud_storage_objects(
    ctx: typer.Context,
    source: str = typer.Argument(..., help="Cloud Storage source name or UID"),
    prefix: str = typer.Option("", "--prefix", help="List under this path"),
) -> None:
    """List what a bucket holds, through Contents, without its key."""
    client = _client()
    resolved = _resolve_source(client, source)
    page = client.list_cloud_storage_objects(str(resolved.value.source.uid), prefix=prefix)
    items = page.get("items", [])
    context = _context(ctx)
    if context.output is not OutputFormat.TABLE:
        _render(items, context)
        return
    table = Table("Path", "Type", "Size", "Modified")
    for item in items:
        table.add_row(
            str(item.get("path", "")),
            "folder" if item.get("is_directory") else "file",
            "" if item.get("is_directory") else str(item.get("size", "")),
            str(item.get("modified_at") or ""),
        )
    console.print(table)
    if page.get("next_cursor"):
        console.print("[dim]more entries follow; narrow the prefix[/dim]")


@cloud_storage_app.command(name="test")
@contents_command
def cloud_storage_test(
    ctx: typer.Context,
    source: str = typer.Argument(..., help="Cloud Storage source name or UID"),
) -> None:
    """Check that the bucket answers with the source's credential."""
    client = _client()
    resolved = _resolve_source(client, source)
    answer = client.test_cloud_storage_connection(str(resolved.value.source.uid))
    _render(answer, _context(ctx))
    if not answer.get("ok"):
        raise typer.Exit(1)


@cloud_storage_app.command(name="download")
@contents_command
def cloud_storage_download(
    ctx: typer.Context,
    source: str = typer.Argument(..., help="Cloud Storage source name or UID"),
    path: str = typer.Argument(..., help="Object path inside the source"),
    destination: Path = typer.Argument(..., help="Local file to write"),
) -> None:
    """Read one object out of the bucket, through Contents."""
    client = _client()
    resolved = _resolve_source(client, source)
    destination.parent.mkdir(parents=True, exist_ok=True)
    with contents_progress(f"Downloading {path}"):
        with destination.open("wb") as output:
            for chunk in client.iter_cloud_storage_object(str(resolved.value.source.uid), path):
                output.write(chunk)
    _render({"path": path, "destination": str(destination)}, _context(ctx))


@cloud_storage_app.command(name="attach")
@contents_command
def cloud_storage_attach(
    ctx: typer.Context,
    source: str = typer.Argument(...),
    sandbox_uid: str = typer.Argument(...),
    mount_path: str | None = typer.Option(None, "--path", "--mount-path"),
    read_only: bool = typer.Option(False, "--read-only"),
    provider: str = typer.Option("datalayer", "--sandbox-provider"),
    access: str = typer.Option("automatic", "--access"),
) -> None:
    if access not in {"automatic", "mount", "python", "object-client"}:
        raise ContentsCommandError(
            "--access must be automatic, mount, python or object-client"
        )
    try:
        attachment = _attach_source(
            client=_client(),
            sandbox_uid=sandbox_uid,
            source=source,
            provider=provider,
            mount_path=mount_path,
            mode="ro" if read_only else "rw",
            delivery="client" if access in {"python", "object-client"} else "mount",
        )
    except Exception as error:
        raise ContentsCommandError(str(error)) from error
    _render(attachment.model_dump(mode="json"), _context(ctx))


dataservers_app = typer.Typer(
    name="dataservers", help="Register and inspect Dataserver gateways."
)
app.add_typer(dataservers_app)


@dataservers_app.command(name="list")
@contents_command
def dataservers_list(ctx: typer.Context) -> None:
    page = _client().list_content_sources(kind="data-server", limit=200)
    _render(page.model_dump(mode="json"), _context(ctx))


@dataservers_app.command(name="register")
@contents_command
def dataservers_register(
    ctx: typer.Context,
    name: str = typer.Argument(...),
    registration_identity: str = typer.Option(..., "--identity"),
    mtls_issuer: str = typer.Option(..., "--mtls-issuer"),
    policy_version: str = typer.Option("1", "--policy-version"),
    connectors: str = typer.Option("", "--connectors"),
    description: str = typer.Option("", "--description"),
) -> None:
    """
    Register a gateway deployed in your own network.

    The identity is what the gateway presents when it calls home: rotating its
    certificate under the same identity resumes this registration rather than
    making a second one.
    """
    try:
        created = _client().create_content_source(
            {
                "name": name,
                "description": description or None,
                "kind": "data-server",
                "capabilities": ["query", "browse"],
                "configuration": {
                    "kind": "data-server",
                    "registration_identity": registration_identity,
                    "mtls_issuer": mtls_issuer,
                    "policy_version": policy_version,
                    "connectors": [
                        value.strip()
                        for value in connectors.split(",")
                        if value.strip()
                    ],
                },
            },
            idempotency_key=f"cli-data-server-{uuid4()}",
        )
    except Exception as error:
        raise ContentsCommandError(str(error)) from error
    _render(created.value.model_dump(mode="json"), _context(ctx))


mcp_app = typer.Typer(name="mcp", help="Connect and inspect MCP servers.")
app.add_typer(mcp_app)


@mcp_app.command(name="list")
@contents_command
def mcp_list(ctx: typer.Context) -> None:
    page = _client().list_content_sources(kind="mcp", limit=200)
    _render(page.model_dump(mode="json"), _context(ctx))


@mcp_app.command(name="connect")
@contents_command
def mcp_connect(
    ctx: typer.Context,
    name: str = typer.Argument(...),
    transport: str = typer.Option("streamable-http", "--transport"),
    endpoint: str | None = typer.Option(None, "--endpoint"),
    allowed_tools: str = typer.Option("", "--tools"),
    allowed_domains: str = typer.Option("", "--domains"),
    description: str = typer.Option("", "--description"),
) -> None:
    """
    Connect an MCP server so agents can use its tools.

    Every tool call is approved explicitly and destinations are an allowlist:
    a server reached this way runs code on somebody's behalf, so the safe
    policy is the default rather than the opt-in.
    """
    if transport != "stdio" and not (endpoint or "").strip():
        raise ContentsCommandError(
            "an MCP server reached over http or sse needs --endpoint"
        )
    listed = lambda value: [
        entry.strip() for entry in value.split(",") if entry.strip()
    ]
    try:
        created = _client().create_content_source(
            {
                "name": name,
                "description": description or None,
                "kind": "mcp",
                "capabilities": ["query", "browse"],
                "configuration": {
                    "kind": "mcp",
                    "transport": transport,
                    "endpoint": endpoint,
                    "approval_policy": "explicit",
                    "destination_policy": "allowlist",
                    "allowed_tools": listed(allowed_tools),
                    "allowed_domains": listed(allowed_domains),
                },
            },
            idempotency_key=f"cli-mcp-{uuid4()}",
        )
    except Exception as error:
        raise ContentsCommandError(str(error)) from error
    _render(created.value.model_dump(mode="json"), _context(ctx))


environments_app = typer.Typer(
    name="environments", help="Inspect the content Environments carry."
)
app.add_typer(environments_app)


@environments_app.command(name="list")
@contents_command
def environments_list(ctx: typer.Context) -> None:
    """
    List the content the platform's Environments bring with them.

    Nobody attaches this: choosing an Environment chooses it, which is why
    there is no `create` beside this command.
    """
    page = _client().list_content_sources(kind="environment", limit=200)
    _render(page.model_dump(mode="json"), _context(ctx))


sharing_app = typer.Typer(name="sharing", help="Inspect and change source sharing.")
app.add_typer(sharing_app)


@sharing_app.command(name="show")
@contents_command
def sharing_show(ctx: typer.Context, source: str = typer.Argument(...)) -> None:
    client = _client()
    resolved = _resolve_source(client, source)
    sharing = client.get_content_source_sharing(resolved.value.source.uid)
    _render(sharing.model_dump(mode="json"), _context(ctx))


@sharing_app.command(name="grant")
@contents_command
def sharing_grant(
    ctx: typer.Context,
    source: str = typer.Argument(...),
    principal_uid: str = typer.Argument(...),
    principal_kind: str = typer.Option(..., "--principal-kind"),
    access_level: str = typer.Option(..., "--access"),
) -> None:
    client = _client()
    resolved = _resolve_source(client, source)
    sharing = client.get_content_source_sharing(resolved.value.source.uid)
    grants = [
        grant.model_dump(mode="json", exclude_none=True)
        for grant in (sharing.grants or [])
        if not (
            grant.principal_uid == principal_uid
            and grant.principal_kind.value == principal_kind
        )
    ]
    grants.append(
        {
            "principal_uid": principal_uid,
            "principal_kind": principal_kind,
            "access_level": access_level,
        }
    )
    try:
        updated = client.replace_content_source_sharing(
            resolved.value.source.uid,
            {"grants": grants},
            etag=resolved.etag,
        )
    except Exception as error:
        raise ContentsCommandError(str(error)) from error
    _render(updated.value.model_dump(mode="json"), _context(ctx))


@sharing_app.command(name="revoke")
@contents_command
def sharing_revoke(
    ctx: typer.Context,
    source: str = typer.Argument(...),
    principal_uid: str = typer.Argument(...),
    principal_kind: str = typer.Option(..., "--principal-kind"),
) -> None:
    client = _client()
    resolved = _resolve_source(client, source)
    sharing = client.get_content_source_sharing(resolved.value.source.uid)
    grants = [
        grant.model_dump(mode="json", exclude_none=True)
        for grant in (sharing.grants or [])
        if not (
            grant.principal_uid == principal_uid
            and grant.principal_kind.value == principal_kind
        )
    ]
    if len(grants) == len(sharing.grants or []):
        raise ContentsCommandError("The source has no matching grant")
    try:
        updated = client.replace_content_source_sharing(
            resolved.value.source.uid,
            {"grants": grants},
            etag=resolved.etag,
        )
    except Exception as error:
        raise ContentsCommandError(str(error)) from error
    _render(updated.value.model_dump(mode="json"), _context(ctx))


@datasets_app.command(name="capture")
@contents_command
def capture_dataset_file(
    ctx: typer.Context,
    local_path: Path = typer.Argument(..., exists=True, dir_okay=False),
    dataset: str = typer.Argument(..., help="The Dataset's uid or name"),
    destination: str = typer.Argument(..., help="The path inside the Dataset"),
    overwrite: bool = typer.Option(False, "--overwrite"),
) -> None:
    """Capture a file into a Dataset — a result, or a file on a mounted Volume.

    Run where the file is, inside the sandbox: the bytes go up through the
    same verified, resumable transfer as an upload and become a version of
    the Dataset. `datasets create-revision` then pins that version.
    """
    client = _client()
    dataset_uid = _resolve_source(client, dataset).value.source.uid
    try:
        with contents_progress(f"Capturing {local_path.name}"):
            transfer = client.upload_dataset_file(
                local_path,
                str(dataset_uid),
                destination.lstrip("/"),
                idempotency_key=f"cli-capture-{uuid4()}",
                overwrite="replace" if overwrite else "reject",
            )
    except Exception as error:
        raise ContentsCommandError(str(error)) from error
    _render(transfer.model_dump(mode="json"), _context(ctx))
