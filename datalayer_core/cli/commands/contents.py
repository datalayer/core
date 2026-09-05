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
    bridge_sessions_table,
    content_sources_table,
    dataserver_connectors_table,
    dataserver_status_table,
    datasource_queries_table,
    datasource_schema_table,
    display_arrow_batches,
    operations_table,
    sync_conflicts_table,
    sync_sessions_table,
    transfers_table,
)
from datalayer_core.mixins.contents import ConditionalCatalogSource
from datalayer_core.models.contents import (
    is_call_terminal,
    ContentAttachment,
    McpApprovalList,
    call_artifacts,
    call_transfer_uids,
)

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
    if "local_root_fingerprint" in first:
        return bridge_sessions_table(rows)
    if "sql_hash" in first:
        return datasource_queries_table(rows)
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
    kind: str | None = typer.Option(
        None,
        "--kind",
        # The flag was `--source`, and it takes a *kind*: the one place the
        # product itself said one word and meant the other. The old name
        # still works, so nothing anybody typed before stops working.
        "--source",
        help="Filter by kind, such as dataset or volume.",
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
            kind=kind, space_uid=space_uid, cursor=cursor, limit=limit
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
    # Not `--version`: the CLI has a global eager `--version` that prints the
    # core version and exits before a subcommand runs, so `home-folder restore
    # PATH --version <uid>` never restored — it printed `datalayer_core: x.y.z`
    # (audit 81). The option a command owns cannot be one the app reserves.
    version_uid: str = typer.Option(..., "--version-uid", "--to-version"),
) -> None:
    client = _client()
    object_ = client.stat_home_folder_object(_home_folder_path(path))
    restored = client.restore_home_folder_object(
        object_.uid,
        version_uid,
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


@app.command(name="mount")
@contents_command
def mount_folder(
    ctx: typer.Context,
    local_root: Path = typer.Argument(
        ..., exists=True, file_okay=False, resolve_path=True, help="The folder to serve"
    ),
    sandbox: str = typer.Option(..., "--sandbox", help="The Code Sandbox the folder is served to"),
    path: str = typer.Option(
        ..., "--path", help="Where the folder appears in the sandbox, such as /home/jovyan/local"
    ),
    read_only: bool = typer.Option(False, "--ro", help="Serve the folder read-only"),
    exclude: list[str] = typer.Option(
        [], "--exclude", help="gitignore-style pattern the sandbox never sees; repeatable"
    ),
    provider: str = typer.Option("datalayer", "--provider", help="The sandbox provider"),
    heartbeat_seconds: float = typer.Option(30.0, "--heartbeat-seconds", hidden=True),
) -> None:
    """
    Serve a folder of this computer inside a Code Sandbox, until unmounted.

    The folder is attached as a local bridge and served through the relay for
    as long as this command runs: Ctrl-C, `datalayer contents unmount`, the
    Unmount button or the session's expiry end it. The folder's path never
    leaves this machine; the service is told a fingerprint of it.
    """
    from datalayer_core.contents_bridge import LocalBridge

    context = _context(ctx)
    quiet = context.output is not OutputFormat.TABLE

    def say(message: str) -> None:
        if not quiet:
            console.print(f"[dim]{message}[/dim]")

    bridge = LocalBridge(
        _client(),
        local_root=local_root,
        sandbox_uid=sandbox,
        mount_path=path,
        mode="ro" if read_only else "rw",
        exclusions=exclude,
        sandbox_provider=provider,
        progress=say,
        heartbeat_seconds=heartbeat_seconds,
    )
    try:
        opened = bridge.open()
    except Exception as error:
        raise ContentsCommandError(str(error)) from error
    if not quiet:
        console.print(
            f"Bridge [cyan]{opened.bridge.uid}[/cyan] serves {local_root} at "
            f"{path} ({bridge.mode}) in sandbox {sandbox}; Ctrl-C to unmount."
        )
    try:
        outcome = bridge.run_forever()
    except Exception as error:
        raise ContentsCommandError(str(error)) from error
    _render(outcome.to_dict(), context)
    if outcome.state in {"refused", "ended"}:
        raise typer.Exit(1)


@app.command(name="mounts")
@contents_command
def list_mounts(
    ctx: typer.Context,
    active: bool = typer.Option(
        True, "--active/--all", help="Only sessions that are not revoked or expired"
    ),
) -> None:
    """The caller's local bridge sessions and the state of their two ends."""
    sessions = _client().list_content_bridges(active=active)
    _render([item.model_dump(mode="json") for item in sessions.items], _context(ctx))


@app.command(name="unmount")
@contents_command
def unmount_folder(ctx: typer.Context, bridge_uid: str = typer.Argument(...)) -> None:
    """End a bridge session; the attachment is revoked with it and the mount goes away."""
    try:
        session = _client().revoke_content_bridge(bridge_uid)
    except Exception as error:
        raise ContentsCommandError(str(error)) from error
    _render(session.model_dump(mode="json"), _context(ctx))


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


operations_app = typer.Typer(
    name="operations", help="Durable operations: what runs, what gave up, what to try again."
)
app.add_typer(operations_app)


@operations_app.command(name="get")
@contents_command
def operations_get(ctx: typer.Context, operation_uid: str = typer.Argument(...)) -> None:
    """One operation: kind, status, attempts, error."""
    try:
        operation = _client().get_content_operation(operation_uid)
    except Exception as error:
        raise ContentsCommandError(str(error)) from error
    _render(operation.model_dump(mode="json"), _context(ctx))


@operations_app.command(name="cancel")
@contents_command
def operations_cancel(ctx: typer.Context, operation_uid: str = typer.Argument(...)) -> None:
    try:
        operation = _client().cancel_content_operation(operation_uid)
    except Exception as error:
        raise ContentsCommandError(str(error)) from error
    _render(operation.model_dump(mode="json"), _context(ctx))


@operations_app.command(name="dead-letter")
@contents_command
def operations_dead_letter(
    ctx: typer.Context, rows: int = typer.Option(100, "--rows", min=1, max=1000)
) -> None:
    """What gave up, and why: retries exhausted or quarantined. Platform administrators only."""
    try:
        listed = _client().list_dead_letter_operations(rows=rows)
    except Exception as error:
        raise ContentsCommandError(str(error)) from error
    context = _context(ctx)
    if context.output is not OutputFormat.TABLE:
        _render(listed.model_dump(mode="json"), context)
        return
    _render([item.model_dump(mode="json") for item in listed.items], context)


@operations_app.command(name="quarantine")
@contents_command
def operations_quarantine(
    ctx: typer.Context,
    operation_uid: str = typer.Argument(...),
    reason: str = typer.Option(..., "--reason", help="Why it is kept out of the queue"),
) -> None:
    """Keep a failed operation out of the queue while it is looked at."""
    try:
        operation = _client().quarantine_content_operation(operation_uid, reason=reason)
    except Exception as error:
        raise ContentsCommandError(str(error)) from error
    _render(operation.model_dump(mode="json"), _context(ctx))


@operations_app.command(name="requeue")
@contents_command
def operations_requeue(ctx: typer.Context, operation_uid: str = typer.Argument(...)) -> None:
    """Try a failed operation again from its first attempt, once the cause is fixed."""
    try:
        operation = _client().requeue_content_operation(operation_uid)
    except Exception as error:
        raise ContentsCommandError(str(error)) from error
    _render(operation.model_dump(mode="json"), _context(ctx))


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
    managed: bool = typer.Option(
        False,
        "--managed",
        help="Datalayer runs this one: it may obtain its own identity at start.",
    ),
) -> None:
    """
    Register a gateway deployed in your own network, or a managed one.

    The identity is what the gateway presents when it calls home: rotating its
    certificate under the same identity resumes this registration rather than
    making a second one.

    `--managed` says Datalayer runs the host. It is the difference between a
    Dataserver that must be handed a certificate somebody generated with
    `bootstrap` and one that obtains its own at start — Contents issues an
    identity to a pod with none only for a registration marked this way. The
    flag was missing until 2026-09-02, which left the documented self-bootstrap
    path with no way to create its own precondition: the field existed in the
    contract, the service checked it, and nothing a person could run set it.
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
                    "managed": managed,
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


def _resolve_kind(client: DatalayerClient, reference: str, kind: str, label: str) -> str:
    """The uid of a source of one kind, named or identified by ``reference``."""
    resolved = _resolve_source(client, reference)
    found = getattr(resolved.value.source.kind, "value", resolved.value.source.kind)
    if found != kind:
        raise ContentsCommandError(f"'{reference}' is a {found} source, not a {label}")
    return str(resolved.value.source.uid)


@dataservers_app.command(name="status")
@contents_command
def dataservers_status(ctx: typer.Context, source: str = typer.Argument(...)) -> None:
    """The gateway as last heard: state, heartbeat lease, queue and identity."""
    client = _client()
    source_uid = _resolve_kind(client, source, "data-server", "Dataserver")
    try:
        status = client.get_dataserver_status(source_uid)
    except Exception as error:
        raise ContentsCommandError(str(error)) from error
    context = _context(ctx)
    if context.output is not OutputFormat.TABLE:
        _render(status.model_dump(mode="json"), context)
        return
    console.print(dataserver_status_table(status.model_dump(mode="json")))


@dataservers_app.command(name="connectors")
@contents_command
def dataservers_connectors(ctx: typer.Context, source: str = typer.Argument(...)) -> None:
    """The connectors the gateway advertises, with the operations each allows."""
    client = _client()
    source_uid = _resolve_kind(client, source, "data-server", "Dataserver")
    try:
        status = client.get_dataserver_status(source_uid)
    except Exception as error:
        raise ContentsCommandError(str(error)) from error
    connectors = [item.model_dump(mode="json") for item in status.connectors]
    context = _context(ctx)
    if context.output is not OutputFormat.TABLE:
        _render(connectors, context)
        return
    console.print(dataserver_connectors_table(connectors))


def _dataserver_transition(ctx: typer.Context, source: str, action: str) -> None:
    client = _client()
    source_uid = _resolve_kind(client, source, "data-server", "Dataserver")
    try:
        status = getattr(client, f"{action}_dataserver")(source_uid)
    except Exception as error:
        raise ContentsCommandError(str(error)) from error
    context = _context(ctx)
    if context.output is not OutputFormat.TABLE:
        _render(status.model_dump(mode="json"), context)
        return
    console.print(dataserver_status_table(status.model_dump(mode="json")))


@dataservers_app.command(name="drain")
@contents_command
def dataservers_drain(ctx: typer.Context, source: str = typer.Argument(...)) -> None:
    """Stop routing new queries to the gateway; the ones running finish."""
    _dataserver_transition(ctx, source, "drain")


@dataservers_app.command(name="resume")
@contents_command
def dataservers_resume(ctx: typer.Context, source: str = typer.Argument(...)) -> None:
    """Route to the gateway again after a drain."""
    _dataserver_transition(ctx, source, "resume")


@dataservers_app.command(name="revoke")
@contents_command
def dataservers_revoke(
    ctx: typer.Context,
    source: str = typer.Argument(...),
    yes: bool = typer.Option(False, "--yes", "-y", help="Do not ask for confirmation."),
) -> None:
    """
    Refuse the gateway's identity from now on.

    The registration stays, revoked, so what routed through it can still be
    read; nothing inside the customer's network is touched. A revoked gateway
    is re-admitted only with a new identity.
    """
    if not yes and not typer.confirm(f"Revoke the identity of Dataserver '{source}'?"):
        raise typer.Exit(1)
    _dataserver_transition(ctx, source, "revoke")


datasources_app = typer.Typer(
    name="datasources", help="Connect, test and query Datasources."
)
app.add_typer(datasources_app)


def _resolve_datasource(client: DatalayerClient, reference: str) -> str:
    return _resolve_kind(client, reference, "datasource", "Datasource")


@datasources_app.command(name="list")
@contents_command
def datasources_list(ctx: typer.Context) -> None:
    page = _client().list_content_sources(kind="datasource", limit=200)
    _render(page.model_dump(mode="json"), _context(ctx))


@datasources_app.command(name="create")
@contents_command
def datasources_create(
    ctx: typer.Context,
    name: str = typer.Argument(...),
    connector_type: str = typer.Option(
        ..., "--connector-type", "--connector", help="athena, bigquery or sql."
    ),
    endpoint: str | None = typer.Option(None, "--endpoint"),
    database: str | None = typer.Option(
        None, "--database", "--project", help="The database, or the project for BigQuery."
    ),
    credential_uid: str | None = typer.Option(
        None, "--credential", help="The Secret holding the connection credential."
    ),
    dataserver: str | None = typer.Option(
        None, "--dataserver", help="Route through this Dataserver, by uid or name."
    ),
    allow: str = typer.Option(
        "select,describe,list", "--allow", help="Allowed operations, comma separated."
    ),
    row_limit: int | None = typer.Option(None, "--row-limit", min=1),
    max_bytes: int | None = typer.Option(None, "--max-bytes", min=1),
    max_seconds: int | None = typer.Option(None, "--max-seconds", min=1),
    description: str = typer.Option("", "--description"),
    space_uid: str | None = typer.Option(None, "--space"),
) -> None:
    """
    Connect a database, warehouse or query service.

    The credential is a Secret reference; its value stays in Vault and is
    resolved by Contents for each query. A source routed through a
    Dataserver needs none here, because the gateway holds the credential in
    the network the database lives in.
    """
    from datalayer_core.models.contents.datasources import DATASOURCE_OPERATIONS

    if connector_type not in {"athena", "bigquery", "sql"}:
        raise ContentsCommandError("--connector-type must be athena, bigquery or sql")
    operations = [value.strip() for value in allow.split(",") if value.strip()]
    unknown = sorted(set(operations) - set(DATASOURCE_OPERATIONS))
    if unknown:
        raise ContentsCommandError(
            f"--allow accepts {', '.join(DATASOURCE_OPERATIONS)}; not {', '.join(unknown)}"
        )
    if not credential_uid and not dataserver:
        raise ContentsCommandError(
            "a Datasource needs --credential, unless --dataserver routes it "
            "through a gateway that holds the credential"
        )
    client = _client()
    data_server_uid = (
        _resolve_kind(client, dataserver, "data-server", "Dataserver") if dataserver else None
    )
    try:
        created = client.create_content_source(
            {
                "name": name,
                "description": description or None,
                "kind": "datasource",
                "capabilities": ["query"],
                "credential_uid": credential_uid,
                "space_uid": space_uid,
                "configuration": {
                    "kind": "datasource",
                    "connector_type": connector_type,
                    "endpoint": endpoint,
                    "database_or_project": database,
                    "credential_uid": credential_uid,
                    "network_route": "dataserver" if data_server_uid else "direct",
                    "data_server_uid": data_server_uid,
                    "allowed_operations": operations,
                    "default_row_limit": row_limit,
                    "max_bytes": max_bytes,
                    "max_seconds": max_seconds,
                },
            },
            idempotency_key=f"cli-datasource-{uuid4()}",
        )
    except Exception as error:
        raise ContentsCommandError(str(error)) from error
    _render(created.value.model_dump(mode="json"), _context(ctx))


@datasources_app.command(name="test")
@contents_command
def datasources_test(ctx: typer.Context, source: str = typer.Argument(...)) -> None:
    """Does the database answer through this source, right now?"""
    client = _client()
    source_uid = _resolve_datasource(client, source)
    try:
        verdict = client.test_datasource(source_uid)
    except Exception as error:
        raise ContentsCommandError(str(error)) from error
    context = _context(ctx)
    if context.output is not OutputFormat.TABLE:
        _render(verdict.model_dump(mode="json"), context)
    else:
        answer = "[green]reachable[/green]" if verdict.ok else "[red]not reachable[/red]"
        console.print(
            f"{answer} through {verdict.connector_type or 'the connector'}"
            + (f": {verdict.detail}" if verdict.detail else "")
        )
    if not verdict.ok:
        raise typer.Exit(1)


@datasources_app.command(name="schema")
@contents_command
def datasources_schema(ctx: typer.Context, source: str = typer.Argument(...)) -> None:
    """The tables and columns the source exposes."""
    client = _client()
    source_uid = _resolve_datasource(client, source)
    try:
        schema = client.discover_datasource_schema(source_uid)
    except Exception as error:
        raise ContentsCommandError(str(error)) from error
    context = _context(ctx)
    if context.output is not OutputFormat.TABLE:
        _render(schema.model_dump(mode="json"), context)
        return
    console.print(datasource_schema_table(schema.model_dump(mode="json")))


class QueryFormat(StrEnum):
    TABLE = "table"
    ARROW = "arrow"
    PARQUET = "parquet"


def _write_batches(batches: Iterator[Any], destination: Path, format_: QueryFormat) -> int:
    """Write a stream of record batches to a file, batch by batch. Returns the rows."""
    import pyarrow.ipc
    import pyarrow.parquet

    rows = 0
    writer: Any = None
    destination.parent.mkdir(parents=True, exist_ok=True)
    try:
        for batch in batches:
            if writer is None:
                writer = (
                    pyarrow.parquet.ParquetWriter(str(destination), batch.schema)
                    if format_ is QueryFormat.PARQUET
                    else pyarrow.ipc.new_stream(str(destination), batch.schema)
                )
            writer.write_batch(batch) if format_ is QueryFormat.PARQUET else writer.write(batch)
            rows += batch.num_rows
    finally:
        if writer is not None:
            writer.close()
    if writer is None:
        # An empty result is still a result: a file with no rows, not no file.
        destination.write_bytes(b"")
    return rows


@datasources_app.command(name="query")
@contents_command
def datasources_query(
    ctx: typer.Context,
    source: str = typer.Argument(..., help="The Datasource, by uid or name."),
    sql: str | None = typer.Argument(None, help="The statement; or use --sql-file."),
    sql_file: Path | None = typer.Option(
        None, "--sql-file", exists=True, dir_okay=False, help="A file holding the statement."
    ),
    row_limit: int | None = typer.Option(None, "--row-limit", min=1),
    max_bytes: int | None = typer.Option(None, "--max-bytes", min=1),
    max_seconds: int | None = typer.Option(None, "--max-seconds", min=1),
    format_: QueryFormat = typer.Option(
        QueryFormat.TABLE, "--format", case_sensitive=False,
        help="table prints the first rows; arrow and parquet write --output.",
    ),
    output: Path | None = typer.Option(
        None, "--output", help="The file an arrow or parquet result is written to."
    ),
    wait: bool = typer.Option(
        False, "--wait", help="Poll until the query finishes and read its result."
    ),
    timeout: float = typer.Option(600.0, "--timeout", help="Seconds to wait."),
    rows: int = typer.Option(10, "--rows", min=1, help="Rows a table shows."),
) -> None:
    """
    Run a statement against a Datasource.

    Without --wait the command prints the query job — its uid is what to
    poll, cancel or save with. With --wait, or when a file format is asked
    for, it waits and reads the result batch by batch: a table of the first
    rows, or an Arrow IPC or Parquet file written as the batches arrive.
    """
    from datalayer_core.contents import Datasource, QueryFailed

    if (sql is None) == (sql_file is None):
        raise ContentsCommandError("Give the statement as an argument or with --sql-file, not both")
    statement = sql_file.read_text() if sql_file is not None else str(sql)
    if format_ is not QueryFormat.TABLE and output is None:
        raise ContentsCommandError(f"--format {format_} needs --output FILE")
    if output is not None and format_ is QueryFormat.TABLE:
        raise ContentsCommandError("--output goes with --format arrow or --format parquet")
    client = _client()
    source_uid = _resolve_datasource(client, source)
    datasource = Datasource(client, source_uid)
    context = _context(ctx)
    try:
        query = datasource.query(
            statement, row_limit=row_limit, max_bytes=max_bytes, max_seconds=max_seconds
        )
    except Exception as error:
        raise ContentsCommandError(str(error)) from error
    if not wait and format_ is QueryFormat.TABLE:
        _render(query.record.model_dump(mode="json"), context)
        if context.output is OutputFormat.TABLE:
            console.print(
                f"[dim]Follow it: datalayer contents datasources query-status {query.uid}; "
                f"stop it: datalayer contents datasources cancel {query.uid}[/dim]"
            )
        return
    try:
        with contents_progress(f"Running query {query.uid}"):
            query.wait(timeout=timeout)
        if format_ is QueryFormat.TABLE:
            if context.output is not OutputFormat.TABLE:
                _render(query.record.model_dump(mode="json"), context)
                return
            display_arrow_batches(query.to_arrow(), limit=rows, console=console)
            _render(query.record.model_dump(mode="json"), context)
            return
        assert output is not None
        with contents_progress(f"Writing {output}"):
            written = _write_batches(query.to_arrow(), output, format_)
    except QueryFailed as error:
        _render(error.query.model_dump(mode="json"), context)
        raise typer.Exit(1)
    except TimeoutError as error:
        raise ContentsCommandError(str(error)) from error
    except Exception as error:
        raise ContentsCommandError(str(error)) from error
    _render(
        {**query.record.model_dump(mode="json"), "output": str(output), "written_rows": written},
        context,
    )


@datasources_app.command(name="query-status")
@contents_command
def datasources_query_status(ctx: typer.Context, query_uid: str = typer.Argument(...)) -> None:
    """One query job, as the service last saw it."""
    try:
        query = _client().get_datasource_query(query_uid)
    except Exception as error:
        raise ContentsCommandError(str(error)) from error
    _render(query.model_dump(mode="json"), _context(ctx))


@datasources_app.command(name="queries")
@contents_command
def datasources_queries(ctx: typer.Context, source: str = typer.Argument(...)) -> None:
    """The queries run against a source, newest first."""
    client = _client()
    source_uid = _resolve_datasource(client, source)
    try:
        page = client.list_datasource_queries(source_uid)
    except Exception as error:
        raise ContentsCommandError(str(error)) from error
    _render([item.model_dump(mode="json") for item in page.items], _context(ctx))


@datasources_app.command(name="cancel")
@contents_command
def datasources_cancel(ctx: typer.Context, query_uid: str = typer.Argument(...)) -> None:
    """Stop a running query; the cancellation reaches the connector."""
    try:
        query = _client().cancel_datasource_query(query_uid)
    except Exception as error:
        raise ContentsCommandError(str(error)) from error
    _render(query.model_dump(mode="json"), _context(ctx))


@datasources_app.command(name="save")
@contents_command
def datasources_save(
    ctx: typer.Context,
    query_uid: str = typer.Argument(..., help="A finished query."),
    dataset: str = typer.Argument(..., help="The Dataset, by uid or name."),
    path: str = typer.Argument(..., help="The path inside the Dataset, such as results/2026-08.arrow"),
) -> None:
    """
    Keep a query result as a verified revision of a Dataset.

    The service writes the bytes into the Dataset; nothing is downloaded to
    be uploaded again.
    """
    client = _client()
    dataset_uid = _resolve_kind(client, dataset, "dataset", "Dataset")
    try:
        revision = client.save_datasource_query(query_uid, dataset_uid=dataset_uid, path=path)
    except Exception as error:
        raise ContentsCommandError(str(error)) from error
    _render(revision.model_dump(mode="json"), _context(ctx))


mcp_app = typer.Typer(name="mcp", help="Connect and inspect MCP servers.")
app.add_typer(mcp_app)


@mcp_app.command(name="list")
@contents_command
def mcp_list(ctx: typer.Context) -> None:
    page = _client().list_content_sources(kind="mcp", limit=200)
    _render(page.model_dump(mode="json"), _context(ctx))


def _secret_uid(reference: str) -> str:
    """A secret's uid, given its uid or its unambiguous name."""
    wanted = reference.strip()
    if not wanted:
        raise ContentsCommandError("--credential needs a secret name or uid")
    secrets = _client().list_secrets() or []
    if any(str(getattr(secret, "uid", "")) == wanted for secret in secrets):
        return wanted
    matches = [secret for secret in secrets if str(getattr(secret, "name", "")) == wanted]
    if len(matches) != 1:
        qualifier = "Several secrets are" if matches else "No secret is"
        raise ContentsCommandError(f"{qualifier} named or identified by '{wanted}'")
    return str(getattr(matches[0], "uid", ""))


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
    credential: str | None = typer.Option(
        None,
        "--credential",
        help="Secret holding the server's bearer token, by name or UID.",
    ),
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
                    # Every MCP server worth reaching wants a token, and
                    # this was the only way to give one: create the source,
                    # then `PATCH` a `credential_uid` with an `If-Match`
                    # nobody hands you. The secret stays in IAM; the source
                    # carries its uid and never its value.
                    **({"credential_uid": _secret_uid(credential)} if credential else {}),
                },
            },
            idempotency_key=f"cli-mcp-{uuid4()}",
        )
    except Exception as error:
        raise ContentsCommandError(str(error)) from error
    _render(created.value.model_dump(mode="json"), _context(ctx))


@mcp_app.command(name="test")
@contents_command
def mcp_test(ctx: typer.Context, source: str = typer.Argument(...)) -> None:
    """Does the server answer through this source, right now?"""
    client = _client()
    source_uid = _resolve_mcp_source(client, source)
    try:
        health = client.test_mcp_source(source_uid)
    except Exception as error:
        raise ContentsCommandError(str(error)) from error
    context = _context(ctx)
    if context.output is not OutputFormat.TABLE:
        _render(health.model_dump(mode="json"), context)
    else:
        verdict = "[green]reachable[/green]" if health.ok else "[red]not reachable[/red]"
        console.print(
            f"{verdict} over {health.transport or 'the configured transport'}"
            + (f": {health.detail}" if health.detail else "")
        )
    if not health.ok:
        raise typer.Exit(1)


@mcp_app.command(name="tools")
@contents_command
def mcp_tools(ctx: typer.Context, source: str = typer.Argument(...)) -> None:
    """List the tools and resources the server behind a source offers."""
    client = _client()
    source_uid = _resolve_mcp_source(client, source)
    try:
        discovered = client.discover_mcp_tools(source_uid)
    except Exception as error:
        raise ContentsCommandError(str(error)) from error
    context = _context(ctx)
    if context.output is not OutputFormat.TABLE:
        _render(discovered.model_dump(mode="json"), context)
        return
    table = Table(title="Tools")
    table.add_column("Tool", style="bold")
    table.add_column("Description")
    table.add_column("Arguments")
    for tool in discovered.tools:
        # `input_schema` is optional on the wire, and a tool that takes no
        # arguments is entitled to omit it. Reaching through it directly
        # turned that into an `AttributeError` in the middle of rendering the
        # table — `datalayer contents mcp tools` crashing on a server whose
        # tools are all zero-argument.
        schema = tool.input_schema or {}
        properties = schema.get("properties") or {}
        required = set(schema.get("required") or [])
        arguments = ", ".join(
            f"{name}{'' if name in required else '?'}" for name in properties
        )
        table.add_row(tool.name, tool.description or "", arguments or "-")
    console.print(table)
    if discovered.resources:
        resources = Table(title="Resources")
        resources.add_column("URI", style="bold")
        resources.add_column("Name")
        resources.add_column("Media type")
        for resource in discovered.resources:
            resources.add_row(
                resource.uri, resource.name or "", resource.media_type or ""
            )
        console.print(resources)


def _parse_arguments(
    arguments_file: Path | None, pairs: list[str]
) -> dict[str, Any]:
    """
    The tool's arguments, from a JSON file and/or ``key=value`` flags.

    A flag's value is read as JSON when it parses as such — ``count=5`` is a
    number, ``bbox=[1,2,3,4]`` a list — and as a string otherwise, so a
    keyword needs no quoting and a structure needs no file.
    """
    arguments: dict[str, Any] = {}
    if arguments_file is not None:
        try:
            loaded = json.loads(arguments_file.read_text())
        except (OSError, json.JSONDecodeError) as error:
            raise ContentsCommandError(
                f"Could not read arguments from {arguments_file}: {error}"
            ) from error
        if not isinstance(loaded, dict):
            raise ContentsCommandError(
                f"{arguments_file} must hold a JSON object of arguments"
            )
        arguments.update(loaded)
    for pair in pairs:
        key, separator, raw = pair.partition("=")
        if not separator or not key.strip():
            raise ContentsCommandError(f"--arg expects key=value, got '{pair}'")
        try:
            value: Any = json.loads(raw)
        except json.JSONDecodeError:
            value = raw
        arguments[key.strip()] = value
    return arguments


def _report_call(call: Any, context: ContentsCLIContext) -> None:
    """One call, as the terminal should see it: status, then what to do."""
    if context.output is not OutputFormat.TABLE:
        _render(call.model_dump(mode="json"), context)
        return
    colors = {
        "succeeded": "green",
        "failed": "red",
        "denied": "red",
        "refused": "red",
        "pending-approval": "yellow",
    }
    color = colors.get(call.status, "cyan")
    console.print(
        f"Call [bold]{call.uid}[/bold] of {call.tool}: [{color}]{call.status}[/{color}]"
    )
    if call.status == "pending-approval" and call.approval_uid:
        console.print(
            f"[yellow]Approval {call.approval_uid} is pending:[/yellow] "
            f"datalayer contents mcp approvals approve {call.approval_uid}"
        )
    if not is_call_terminal(call):
        # Reading the call back later takes both uids, and the session's is
        # on no other line of this output: without it the call could be
        # followed only through the JSON output or the raw API (audit 76).
        console.print(
            f"Read it back: datalayer contents mcp call-status {call.session_uid} {call.uid}"
        )
    if call.error:
        console.print(f"[red]{call.error.code}: {call.error.message}[/red]")
    artifacts = call_artifacts(call)
    if call.result is not None:
        for artifact in artifacts:
            handle = (
                f"Transfer {artifact.transfer_uid}"
                if artifact.transfer_uid
                else f"object {artifact.object_uid}"
                if artifact.object_uid
                else artifact.url or "inline"
            )
            console.print(f"  {artifact.name}: {handle}")
        if call.result.content is not None and not artifacts:
            console.print(json.dumps(call.result.content, indent=2))
    transfer_uids = call_transfer_uids(call)
    if transfer_uids:
        console.print(
            "Transfers: " + ", ".join(transfer_uids)
            + "  (datalayer contents transfer status <uid>)"
        )


@mcp_app.command(name="call")
@contents_command
def mcp_call(
    ctx: typer.Context,
    source: str = typer.Argument(...),
    tool: str = typer.Argument(...),
    arguments_file: Path | None = typer.Option(
        None,
        "--arguments-file",
        exists=True,
        dir_okay=False,
        help="A JSON object of arguments.",
    ),
    arg: list[str] = typer.Option(
        [], "--arg", help="One argument as key=value; repeatable."
    ),
    destination: str | None = typer.Option(
        None,
        "--destination",
        help="Where an acquisition lands, as a Contents URI (home-folder:///path, dataset://uid/path).",
    ),
    wait: bool = typer.Option(
        False, "--wait", help="Poll until the call finishes, approval included."
    ),
    timeout: float = typer.Option(600.0, "--timeout", help="Seconds to wait."),
) -> None:
    """
    Call one tool through a session on the source.

    The command prints the call's status. Under an explicit approval policy
    that is `pending-approval` with the approval uid to decide; with `--wait`
    it keeps polling until the decision lands and the call finishes. A bulk
    acquisition never comes back as bytes: the command prints the Transfer
    uid(s) behind the artifacts.
    """
    from datalayer_core.contents import McpSource

    client = _client()
    source_uid = _resolve_mcp_source(client, source)
    arguments = _parse_arguments(arguments_file, arg)
    mcp_source = McpSource(client, source_uid, output=error_console.file)
    try:
        call = mcp_source.call(
            tool, destination=destination, wait=wait, timeout=timeout, **arguments
        )
    except TimeoutError as error:
        raise ContentsCommandError(str(error)) from error
    except Exception as error:
        raise ContentsCommandError(str(error)) from error
    _report_call(call, _context(ctx))
    if call.status in {"failed", "denied", "refused"}:
        raise typer.Exit(1)


mcp_approvals_app = typer.Typer(
    name="approvals", help="Decide the tool calls that wait on you."
)
mcp_app.add_typer(mcp_approvals_app)


@mcp_approvals_app.command(name="list")
@contents_command
def mcp_approvals_list(
    ctx: typer.Context,
    status: str = typer.Option("pending", "--status", help="pending, approved, rejected, expired or consumed."),
    source: str | None = typer.Option(None, "--source", help="Only one MCP source."),
) -> None:
    client = _client()
    source_uid = _resolve_mcp_source(client, source) if source else None
    try:
        page = client.list_mcp_approvals(status=status)
    except Exception as error:
        raise ContentsCommandError(str(error)) from error
    if source_uid is not None:
        # The service filters on status alone; the source is narrowed here.
        page = McpApprovalList(
            items=[item for item in page.items if item.source_uid == source_uid]
        )
    context = _context(ctx)
    if context.output is not OutputFormat.TABLE:
        _render(page.model_dump(mode="json"), context)
        return
    if not page.items:
        console.print(f"No {status} approval.")
        return
    # One block per approval rather than a table: a uid, a tool name and a
    # destination URI do not survive being wrapped at 80 columns, and the
    # reader needs each of them whole to type it back.
    console.print(f"[bold]{status.capitalize()} approvals[/bold] ({len(page.items)})")
    for approval in page.items:
        lines = [
            f"[bold]{approval.uid}[/bold]  {approval.tool}",
            f"  arguments:   {json.dumps(approval.arguments_redacted, sort_keys=True)}",
        ]
        if approval.destination_uri:
            lines.append(f"  destination: {approval.destination_uri}")
        lines.append(f"  source:      {approval.source_uid}")
        if approval.expires_at:
            lines.append(f"  expires:     {approval.expires_at}")
        if approval.status == "pending":
            lines.append(
                f"  decide:      datalayer contents mcp approvals approve|reject {approval.uid}"
            )
        for line in lines:
            console.print(line, soft_wrap=True)


@mcp_approvals_app.command(name="approve")
@contents_command
def mcp_approvals_approve(
    ctx: typer.Context,
    approval_uid: str = typer.Argument(...),
    note: str | None = typer.Option(None, "--note"),
    wait: bool = typer.Option(
        False, "--wait", help="Follow the approved call until it finishes."
    ),
    timeout: float = typer.Option(600.0, "--timeout", help="Seconds to wait."),
) -> None:
    """
    Approve a waiting call, and show the call it releases.

    The approval is consumed the moment the call runs, so the thing to look
    at afterwards is the call, not the approval — printed here, and followed
    to its end with `--wait`. It can be read again later with
    `datalayer contents mcp call-status SESSION CALL`.
    """
    from datalayer_core.contents import wait_for_mcp_call

    client = _client()
    try:
        decided = client.approve_mcp_approval(approval_uid, note=note)
    except Exception as error:
        raise ContentsCommandError(str(error)) from error
    context = _context(ctx)
    if context.output is not OutputFormat.TABLE:
        _render(decided.model_dump(mode="json"), context)
    else:
        console.print(f"Approval [bold]{decided.uid}[/bold] for {decided.tool}: {decided.status}")
    try:
        call = client.get_mcp_call(decided.session_uid, decided.call_uid)
        if wait:
            call = wait_for_mcp_call(client, call, timeout=timeout)
    except TimeoutError as error:
        raise ContentsCommandError(str(error)) from error
    except Exception as error:
        raise ContentsCommandError(f"approved, but the call could not be read: {error}") from error
    _report_call(call, context)
    if call.status in {"failed", "denied", "refused"}:
        raise typer.Exit(1)


@mcp_app.command(name="call-status")
@contents_command
def mcp_call_status(
    ctx: typer.Context,
    session_uid: str = typer.Argument(..., help="The session the call was made on."),
    call_uid: str = typer.Argument(...),
    wait: bool = typer.Option(False, "--wait", help="Poll until the call finishes."),
    timeout: float = typer.Option(600.0, "--timeout", help="Seconds to wait."),
) -> None:
    """
    Read one call back: its status, result or error, and its artifacts.

    A call that waited on an approval finishes after the person who approved
    it has moved on; `mcp call --wait` may have given up by then. Both uids
    are on the call as `mcp call` printed it, and on the approval.
    """
    from datalayer_core.contents import wait_for_mcp_call

    client = _client()
    try:
        call = client.get_mcp_call(session_uid, call_uid)
        if wait:
            call = wait_for_mcp_call(client, call, timeout=timeout)
    except TimeoutError as error:
        raise ContentsCommandError(str(error)) from error
    except Exception as error:
        raise ContentsCommandError(str(error)) from error
    _report_call(call, _context(ctx))
    if call.status in {"failed", "denied", "refused"}:
        raise typer.Exit(1)


@mcp_approvals_app.command(name="reject")
@contents_command
def mcp_approvals_reject(
    ctx: typer.Context,
    approval_uid: str = typer.Argument(...),
    note: str | None = typer.Option(None, "--note"),
) -> None:
    try:
        decided = _client().reject_mcp_approval(approval_uid, note=note)
    except Exception as error:
        raise ContentsCommandError(str(error)) from error
    _render(decided.model_dump(mode="json"), _context(ctx))


def _resolve_mcp_source(client: DatalayerClient, reference: str) -> str:
    """The uid of an MCP source named or identified by ``reference``."""
    resolved = _resolve_source(client, reference)
    kind = getattr(resolved.value.source.kind, "value", resolved.value.source.kind)
    if kind != "mcp":
        raise ContentsCommandError(
            f"'{reference}' is a {kind} source, not an MCP server"
        )
    return str(resolved.value.source.uid)


environment_app = typer.Typer(
    name="environment", help="Inspect the content Environments carry."
)
app.add_typer(environment_app)


def _selected_contents(environment: dict[str, Any]) -> str:
    """One line per selected content: name, mount and access."""
    return "\n".join(
        f"{content.get('name') or content.get('uid')} {content.get('mount', '')}"
        f" ({content.get('permissions', 'ro')})"
        for content in environment.get("contents") or []
    )


@environment_app.command(name="list")
@contents_command
def environment_list(ctx: typer.Context) -> None:
    """
    List the platform Environments and the contents each selects.

    Nobody attaches this: choosing an Environment chooses it, which is why
    there is no `create` beside this command.
    """
    try:
        environments = _client().list_environments()
    except Exception as error:
        raise ContentsCommandError(str(error)) from error
    context = _context(ctx)
    if context.output is not OutputFormat.TABLE:
        _render(environments, context)
        return
    table = Table(title="Environments")
    table.add_column("Environment", style="bold")
    table.add_column("Title")
    table.add_column("Contents")
    for environment in environments:
        table.add_row(
            str(environment.get("name", "")),
            str(environment.get("title", "")),
            _selected_contents(environment) or "-",
        )
    console.print(table)


@environment_app.command(name="verify")
@contents_command
def environment_verify(
    ctx: typer.Context,
    environment: str = typer.Argument(..., help="The Environment name."),
    provider: str = typer.Option(
        "datalayer",
        "--provider",
        help="The sandbox provider: datalayer, daytona, e2b or modal.",
    ),
) -> None:
    """
    Resolve the contents an Environment selects for a provider.

    Every content is printed with its status, and the command exits non-zero
    when any is `unsupported` or `unresolved`, so a pipeline can refuse an
    Environment that would not come up whole.
    """
    try:
        diagnostics = _client().get_environment_contents(environment, provider)
    except Exception as error:
        raise ContentsCommandError(str(error)) from error
    contents = diagnostics.get("contents") or []
    failing = [
        content for content in contents if content.get("status") != "resolved"
    ]
    context = _context(ctx)
    if context.output is not OutputFormat.TABLE:
        _render(diagnostics, context)
    else:
        table = Table(
            title=f"{diagnostics.get('environment', environment)} on "
            f"{diagnostics.get('provider', provider)}"
        )
        table.add_column("Name", style="bold")
        table.add_column("Type")
        table.add_column("Mount")
        table.add_column("Access")
        table.add_column("Status")
        table.add_column("Revision")
        table.add_column("SHA-256")
        table.add_column("Detail")
        for content in contents:
            status = str(content.get("status", "unresolved"))
            color = {"resolved": "green", "unsupported": "red"}.get(status, "yellow")
            table.add_row(
                str(content.get("name") or content.get("uid", "")),
                str(content.get("type", "")),
                str(content.get("mount", "")),
                str(content.get("permissions", "")),
                f"[{color}]{status}[/{color}]",
                str(content.get("revision") or "-"),
                str(content.get("sha256") or "-"),
                str(content.get("detail") or ""),
            )
        console.print(table)
        verdict = (
            f"[green]{environment} is supported on {provider}[/green]"
            if not failing and diagnostics.get("supported", True)
            else f"[red]{environment} is not supported on {provider}[/red]"
        )
        console.print(verdict)
    if failing or not diagnostics.get("supported", True):
        raise typer.Exit(1)


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
            and grant.principal_kind == principal_kind
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
            and grant.principal_kind == principal_kind
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
