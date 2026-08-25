# Copyright (c) 2023-2026 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""Contents command group; feature commands are added by delivery milestones."""

from collections.abc import Iterator
from contextlib import contextmanager
from dataclasses import dataclass
from enum import StrEnum
from functools import wraps
import json
import os
from pathlib import Path
import tempfile
from typing import Any, Callable, TypeVar
from uuid import uuid4

import typer
import yaml
from rich.console import Console
from rich.progress import Progress, SpinnerColumn, TextColumn
from rich.table import Table

from datalayer_core.client.client import DatalayerClient

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
        table = Table("UID", "Kind", "Name", "Access", "Status")
        for item in value:
            source = item.get("source", item)
            permissions = item.get("permissions", {})
            table.add_row(
                str(source.get("uid", "")),
                str(source.get("kind", "")),
                str(source.get("name", "")),
                str(permissions.get("effective_access_level") or ""),
                str(source.get("status", "")),
            )
        console.print(table)
        return
    console.print(value)


def _client() -> DatalayerClient:
    try:
        return DatalayerClient()
    except Exception as error:
        raise ContentsCommandError(str(error)) from error


def _resolve_source(client: DatalayerClient, reference: str):
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


def _user_folder_path(uri_or_path: str) -> str:
    prefix = "user-folder:///"
    value = uri_or_path[len(prefix) :] if uri_or_path.startswith(prefix) else uri_or_path
    value = value.lstrip("/")
    if not value:
        raise ContentsCommandError("A User Folder file path is required")
    return value


@app.command(name="list")
@contents_command
def list_contents(
    ctx: typer.Context,
    kind: str | None = typer.Option(None, "--kind", help="Filter by source kind."),
    space_uid: str | None = typer.Option(None, "--space", help="Filter by Space UID."),
    cursor: str | None = typer.Option(None, "--cursor", help="Continue a catalog page."),
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


user_folder_app = typer.Typer(
    name="user-folder", help="Browse and recover private User Folder files."
)
app.add_typer(user_folder_app)


@user_folder_app.command(name="list")
@contents_command
def user_folder_list(
    ctx: typer.Context,
    prefix: str | None = typer.Option(None, "--prefix"),
    cursor: str | None = typer.Option(None, "--cursor"),
    limit: int = typer.Option(100, "--limit", min=1, max=200),
) -> None:
    page = _client().list_user_folder_objects(
        prefix=prefix, cursor=cursor, limit=limit
    )
    _render(page.model_dump(mode="json"), _context(ctx))


@user_folder_app.command(name="versions")
@contents_command
def user_folder_versions(
    ctx: typer.Context, path: str = typer.Argument(...)
) -> None:
    client = _client()
    object_ = client.stat_user_folder_object(_user_folder_path(path))
    versions = client.list_user_folder_object_versions(object_.uid)
    _render(versions.model_dump(mode="json"), _context(ctx))


@user_folder_app.command(name="restore")
@contents_command
def user_folder_restore(
    ctx: typer.Context,
    path: str = typer.Argument(...),
    version: str = typer.Option(..., "--version"),
) -> None:
    client = _client()
    object_ = client.stat_user_folder_object(_user_folder_path(path))
    restored = client.restore_user_folder_object(
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
    destination_path = _user_folder_path(destination)
    try:
        with contents_progress(f"Uploading {local_path.name}"):
            transfer = _client().upload_user_folder_file(
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
    object_ = client.stat_user_folder_object(_user_folder_path(source))
    local_path.parent.mkdir(parents=True, exist_ok=True)
    descriptor, temporary_name = tempfile.mkstemp(
        prefix=f".{local_path.name}.", suffix=".part", dir=local_path.parent
    )
    try:
        with os.fdopen(descriptor, "wb") as output, contents_progress(
            f"Downloading {object_.path}"
        ):
            for chunk in client.iter_user_folder_object(object_.uid):
                output.write(chunk)
        os.replace(temporary_name, local_path)
    except Exception as error:
        Path(temporary_name).unlink(missing_ok=True)
        raise ContentsCommandError(str(error)) from error


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
):
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
    _render(_client().list_content_sources(kind="volume", limit=200).model_dump(mode="json"), _context(ctx))


@volumes_app.command(name="create")
@contents_command
def volume_create(ctx: typer.Context, name: str, backing_resource_id: str | None = typer.Option(None, "--backing-resource"),
                  capacity_bytes: int = typer.Option(..., "--capacity-bytes", min=1),
                  mount_path: str = typer.Option(..., "--path", "--mount-path"),
                  scope: str = typer.Option("user", "--scope"),
                  space_uid: str | None = typer.Option(None, "--space")) -> None:
    if scope not in {"user", "space"}:
        raise ContentsCommandError("--scope must be user or space")
    if scope == "space" and not space_uid:
        raise ContentsCommandError("--space is required when --scope is space")
    created = _client().create_content_source({
        "name": name, "kind": "volume", "capabilities": ["browse", "transfer", "mount"],
        "space_uid": space_uid,
        "configuration": {"kind": "volume", "scope": scope,
            "capacity_bytes": capacity_bytes, "access_modes": ["ro", "rw"],
            "default_mount_path": mount_path, "backing_resource_id": backing_resource_id,
            "concurrent_readers": True, "concurrent_writers": True}},
        idempotency_key=f"cli-volume-{uuid4()}")
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
    _render(_client().list_content_sources(kind="dataset", limit=200).model_dump(mode="json"), _context(ctx))


@datasets_app.command(name="create")
@contents_command
def dataset_create(ctx: typer.Context, name: str, description: str | None = typer.Option(None, "--description"),
                   tag: list[str] | None = typer.Option(None, "--tag")) -> None:
    created = _client().create_content_source({"name": name, "description": description,
        "kind": "dataset", "capabilities": ["browse", "transfer", "materialize"],
        "configuration": {"kind": "dataset", "current_revision_uid": None,
            "publication_eligible": False, "tags": tag or []}},
        idempotency_key=f"cli-dataset-{uuid4()}")
    _render(created.value.model_dump(mode="json"), _context(ctx))


@datasets_app.command(name="revisions")
@contents_command
def dataset_revisions(ctx: typer.Context, source: str) -> None:
    client = _client()
    uid = _resolve_source(client, source).value.source.uid
    _render(client.list_dataset_revisions(uid).model_dump(mode="json"), _context(ctx))


@datasets_app.command(name="create-revision")
@contents_command
def dataset_create_revision(ctx: typer.Context, source: str,
    files: list[str] = typer.Option(..., "--file"),
    origin: str = typer.Option("user-folder", "--origin")) -> None:
    selected = []
    for value in files:
        parts = value.split(":", 2)
        if len(parts) < 2 or not all(parts[:2]):
            raise ContentsCommandError("--file must be OBJECT_UID:VERSION_UID[:DESTINATION_PATH]")
        selected.append({"object_uid": parts[0], "version_uid": parts[1],
                         "path": parts[2] if len(parts) == 3 else None})
    client = _client()
    uid = _resolve_source(client, source).value.source.uid
    revision = client.create_dataset_revision(uid, {"origin_kind": origin, "files": selected},
        idempotency_key=f"cli-dataset-revision-{uuid4()}")
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
    mount_implementation: str | None = typer.Option(
        None, "--mount-implementation"
    ),
    python_implementation: str | None = typer.Option(
        None, "--python-implementation"
    ),
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
