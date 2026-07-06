# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""Teams command: list the authenticated user's teams."""

import json as _json
import os
from typing import Optional

import typer
from rich.console import Console
from rich.table import Table

from datalayer_core.cli.commands.authn import _fetch_memberships
from datalayer_core.utils.urls import DatalayerURLs

app = typer.Typer(
    name="teams",
    help="List teams for the authenticated user.",
    invoke_without_command=True,
)

console = Console()


def _is_owner(roles: list[str]) -> bool:
    """Return whether the given roles indicate team ownership."""
    return any(
        (role or "").lower() in ("team_owner", "owner")
        or (role or "").lower().endswith("_owner")
        for role in roles
    )


def _print_teams(memberships: list[dict]) -> None:
    """Render a table of the user's teams with roles and ownership."""
    orgs = [
        m for m in memberships if (m.get("type") or "").lower() == "organization"
    ]
    teams = [m for m in memberships if (m.get("type") or "").lower() == "team"]
    org_by_uid = {m.get("uid"): m for m in orgs}

    if not teams:
        console.print("[dim]No team memberships.[/dim]")
        return

    table = Table(title="👥 Teams")
    table.add_column("Handle", style="cyan")
    table.add_column("Name")
    table.add_column("Organization", style="magenta")
    table.add_column("UID")
    table.add_column("Roles")
    table.add_column("Owner", justify="center")
    for team in teams:
        org_uid = team.get("organization_uid")
        parent = org_by_uid.get(org_uid) if org_uid else None
        parent_label = parent.get("handle") if parent else (org_uid or "unknown")
        roles = team.get("roles_ss") or []
        owner = "✔" if _is_owner(roles) else "-"
        table.add_row(
            str(team.get("handle") or ""),
            str(team.get("name") or ""),
            str(parent_label or ""),
            str(team.get("uid") or ""),
            ", ".join(roles) or "-",
            owner,
        )
    console.print(table)


def _run_teams_ls(
    iam_url: Optional[str],
    token: Optional[str],
    as_json: bool,
) -> None:
    """Fetch memberships and print the user's teams."""
    urls = DatalayerURLs.from_environment(iam_url=iam_url)
    access_token = token or os.environ.get("DATALAYER_API_KEY")
    if not access_token:
        console.print(
            "[red]No access token available. Use --api-key or set DATALAYER_API_KEY.[/red]"
        )
        raise typer.Exit(1)

    memberships = _fetch_memberships(urls.iam_url, access_token)
    if memberships is None:
        console.print("[red]Failed to fetch teams from IAM service.[/red]")
        raise typer.Exit(1)

    teams = [m for m in memberships if (m.get("type") or "").lower() == "team"]
    if as_json:
        typer.echo(_json.dumps(teams, indent=2, sort_keys=True))
        return

    _print_teams(memberships)


@app.command(name="ls")
def teams_ls(
    iam_url: Optional[str] = typer.Option(
        None,
        "--iam-url",
        help="Datalayer IAM server URL",
    ),
    token: Optional[str] = typer.Option(
        None,
        "--api-key",
        help="User API key",
    ),
    as_json: bool = typer.Option(
        False,
        "--json",
        help="Print raw JSON teams response.",
    ),
) -> None:
    """List the teams to which the authenticated user has access."""
    _run_teams_ls(iam_url=iam_url, token=token, as_json=as_json)


@app.command(name="list")
def teams_list(
    iam_url: Optional[str] = typer.Option(
        None,
        "--iam-url",
        help="Datalayer IAM server URL",
    ),
    token: Optional[str] = typer.Option(
        None,
        "--api-key",
        help="User API key",
    ),
    as_json: bool = typer.Option(
        False,
        "--json",
        help="Print raw JSON teams response.",
    ),
) -> None:
    """List the teams to which the authenticated user has access."""
    _run_teams_ls(iam_url=iam_url, token=token, as_json=as_json)


@app.callback(invoke_without_command=True)
def teams_root(
    ctx: typer.Context,
    iam_url: Optional[str] = typer.Option(
        None,
        "--iam-url",
        help="Datalayer IAM server URL",
    ),
    token: Optional[str] = typer.Option(
        None,
        "--api-key",
        help="User API key",
    ),
    as_json: bool = typer.Option(
        False,
        "--json",
        help="Print raw JSON teams response.",
    ),
) -> None:
    """List the teams to which the authenticated user has access."""
    if ctx.invoked_subcommand is not None:
        return
    _run_teams_ls(iam_url=iam_url, token=token, as_json=as_json)
