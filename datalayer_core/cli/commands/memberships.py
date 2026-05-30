# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""Memberships command: list the authenticated user's organization and team memberships."""

import json as _json
import os
from typing import Optional

import typer
from rich.console import Console
from rich.table import Table

from datalayer_core.cli.commands.authn import _fetch_memberships
from datalayer_core.utils.urls import DatalayerURLs

app = typer.Typer(
    name="memberships",
    help="List organization and team memberships for the authenticated user.",
    invoke_without_command=True,
)

console = Console()


def _print_memberships(
    memberships: list[dict],
    *,
    only: Optional[str] = None,
) -> None:
    orgs = [m for m in memberships if (m.get("type") or "").lower() == "organization"]
    teams = [m for m in memberships if (m.get("type") or "").lower() == "team"]
    org_by_uid = {m.get("uid"): m for m in orgs}

    if only in (None, "organization", "organizations", "org", "orgs"):
        if orgs:
            table = Table(title="🏢 Organizations")
            table.add_column("Handle", style="cyan")
            table.add_column("Name")
            table.add_column("UID")
            table.add_column("Roles")
            for org in orgs:
                table.add_row(
                    str(org.get("handle") or ""),
                    str(org.get("name") or ""),
                    str(org.get("uid") or ""),
                    ", ".join(org.get("roles_ss") or []) or "-",
                )
            console.print(table)
        elif only is not None:
            console.print("[dim]No organization memberships.[/dim]")

    if only in (None, "team", "teams"):
        if teams:
            table = Table(title="👥 Teams")
            table.add_column("Handle", style="cyan")
            table.add_column("Name")
            table.add_column("Organization", style="magenta")
            table.add_column("UID")
            table.add_column("Roles")
            for team in teams:
                org_uid = team.get("organization_uid")
                parent = org_by_uid.get(org_uid) if org_uid else None
                parent_label = (
                    parent.get("handle") if parent else (org_uid or "unknown")
                )
                table.add_row(
                    str(team.get("handle") or ""),
                    str(team.get("name") or ""),
                    str(parent_label or ""),
                    str(team.get("uid") or ""),
                    ", ".join(team.get("roles_ss") or []) or "-",
                )
            console.print(table)
        elif only is not None:
            console.print("[dim]No team memberships.[/dim]")

    if only is None and not orgs and not teams:
        console.print("[dim]No organization or team memberships.[/dim]")


@app.callback(invoke_without_command=True)
def memberships_root(
    ctx: typer.Context,
    iam_url: Optional[str] = typer.Option(
        None,
        "--iam-url",
        help="Datalayer IAM server URL",
    ),
    token: Optional[str] = typer.Option(
        None,
        "--token",
        help="User access token",
    ),
    only: Optional[str] = typer.Option(
        None,
        "--only",
        help="Restrict output to one type: 'organizations' or 'teams'.",
    ),
    as_json: bool = typer.Option(
        False,
        "--json",
        help="Print raw JSON memberships response.",
    ),
) -> None:
    """List the authenticated user's organization and team memberships."""
    if ctx.invoked_subcommand is not None:
        return

    urls = DatalayerURLs.from_environment(iam_url=iam_url)
    access_token = token or os.environ.get("DATALAYER_API_KEY")
    if not access_token:
        console.print(
            "[red]No access token available. Use --token or set DATALAYER_API_KEY.[/red]"
        )
        raise typer.Exit(1)

    memberships = _fetch_memberships(urls.iam_url, access_token)
    if memberships is None:
        console.print("[red]Failed to fetch memberships from IAM service.[/red]")
        raise typer.Exit(1)

    if as_json:
        typer.echo(_json.dumps(memberships, indent=2, sort_keys=True))
        return

    _print_memberships(memberships, only=only)
