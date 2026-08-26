# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""Organizations command: list the authenticated user's organizations."""

import json as _json
import os
from typing import Any, Optional

import typer
from rich.console import Console
from rich.table import Table

from datalayer_core.cli.commands.authn import _fetch_memberships
from datalayer_core.utils.urls import DatalayerURLs

app = typer.Typer(
    name="orgs",
    help="List organizations for the authenticated user.",
    invoke_without_command=True,
)

console = Console()


def _is_owner(roles: list[str]) -> bool:
    """Return whether the given roles indicate organization ownership."""
    return any(
        (role or "").lower() in ("organization_owner", "owner")
        or (role or "").lower().endswith("_owner")
        for role in roles
    )


def _print_organizations(memberships: list[dict[str, Any]]) -> None:
    """Render a table of the user's organizations with roles and ownership."""
    orgs = [m for m in memberships if (m.get("type") or "").lower() == "organization"]
    if not orgs:
        console.print("[dim]No organization memberships.[/dim]")
        return

    table = Table(title="🏢 Organizations")
    table.add_column("Handle", style="cyan")
    table.add_column("Name")
    table.add_column("UID")
    table.add_column("Roles")
    table.add_column("Owner", justify="center")
    for org in orgs:
        roles = org.get("roles_ss") or []
        owner = "✔" if _is_owner(roles) else "-"
        table.add_row(
            str(org.get("handle") or ""),
            str(org.get("name") or ""),
            str(org.get("uid") or ""),
            ", ".join(roles) or "-",
            owner,
        )
    console.print(table)


def _run_orgs_ls(
    iam_url: Optional[str],
    api_key: Optional[str],
    as_json: bool,
) -> None:
    """Fetch memberships and print the user's organizations."""
    urls = DatalayerURLs.from_environment(iam_url=iam_url)
    access_token = api_key or os.environ.get("DATALAYER_API_KEY")
    if not access_token:
        console.print(
            "[red]No API key available. Use --api-key or set DATALAYER_API_KEY.[/red]"
        )
        raise typer.Exit(1)

    memberships = _fetch_memberships(urls.iam_url, access_token)
    if memberships is None:
        console.print("[red]Failed to fetch organizations from IAM service.[/red]")
        raise typer.Exit(1)

    orgs = [m for m in memberships if (m.get("type") or "").lower() == "organization"]
    if as_json:
        typer.echo(_json.dumps(orgs, indent=2, sort_keys=True))
        return

    _print_organizations(memberships)


@app.command(name="ls")
def orgs_ls(
    iam_url: Optional[str] = typer.Option(
        None,
        "--iam-url",
        help="Datalayer IAM server URL",
    ),
    api_key: Optional[str] = typer.Option(
        None,
        "--api-key",
        help="User API key",
    ),
    as_json: bool = typer.Option(
        False,
        "--json",
        help="Print raw JSON organizations response.",
    ),
) -> None:
    """List the organizations to which the authenticated user has access."""
    _run_orgs_ls(iam_url=iam_url, api_key=api_key, as_json=as_json)


@app.command(name="list")
def orgs_list(
    iam_url: Optional[str] = typer.Option(
        None,
        "--iam-url",
        help="Datalayer IAM server URL",
    ),
    api_key: Optional[str] = typer.Option(
        None,
        "--api-key",
        help="User API key",
    ),
    as_json: bool = typer.Option(
        False,
        "--json",
        help="Print raw JSON organizations response.",
    ),
) -> None:
    """List the organizations to which the authenticated user has access."""
    _run_orgs_ls(iam_url=iam_url, api_key=api_key, as_json=as_json)


@app.callback(invoke_without_command=True)
def orgs_root(
    ctx: typer.Context,
    iam_url: Optional[str] = typer.Option(
        None,
        "--iam-url",
        help="Datalayer IAM server URL",
    ),
    api_key: Optional[str] = typer.Option(
        None,
        "--api-key",
        help="User API key",
    ),
    as_json: bool = typer.Option(
        False,
        "--json",
        help="Print raw JSON organizations response.",
    ),
) -> None:
    """List the organizations to which the authenticated user has access."""
    if ctx.invoked_subcommand is not None:
        return
    _run_orgs_ls(iam_url=iam_url, api_key=api_key, as_json=as_json)
