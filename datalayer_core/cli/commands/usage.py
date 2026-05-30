# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""Usage/credits commands for Datalayer CLI."""

from datetime import datetime, timezone
from typing import Any, Optional

import typer
from rich.console import Console
from rich.table import Table

from datalayer_core.client.client import DatalayerClient
from datalayer_core.displays.usage import display_usage
from datalayer_core.utils.urls import DatalayerURLs

app = typer.Typer(
    name="usage", help="Usage and credits commands", invoke_without_command=True
)
console = Console()


def _normalize_value(value: Any, fallback: str = "n/a") -> str:
    if value is None:
        return fallback
    text = str(value).strip()
    return text if text else fallback


def _iam_get(client: DatalayerClient, path: str) -> dict[str, Any]:
    return client._fetch(f"{client.urls.iam_url}{path}", method="GET").json()


def _iam_post(
    client: DatalayerClient, path: str, body: dict[str, Any]
) -> dict[str, Any]:
    return client._fetch(
        f"{client.urls.iam_url}{path}",
        method="POST",
        json=body,
    ).json()


def _make_client(
    token: Optional[str] = None,
    iam_url: Optional[str] = None,
) -> DatalayerClient:
    urls = DatalayerURLs.from_environment(iam_url=iam_url)
    return DatalayerClient(urls=urls, token=token)


def _parse_iso_dt(value: Any) -> datetime | None:
    if not value:
        return None
    text = str(value).strip()
    if not text:
        return None
    try:
        normalized = text.replace("Z", "+00:00")
        parsed = datetime.fromisoformat(normalized)
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=timezone.utc)
        return parsed.astimezone(timezone.utc)
    except Exception:
        return None


def _format_duration_seconds(start: Any, end: Any) -> str:
    start_dt = _parse_iso_dt(start)
    end_dt = _parse_iso_dt(end)
    if start_dt is None or end_dt is None:
        return "n/a"
    duration = max(0.0, (end_dt - start_dt).total_seconds())
    return f"{duration:.3f}"


@app.callback()
def usage_callback(ctx: typer.Context) -> None:
    """Usage and credits commands."""
    if ctx.invoked_subcommand is None:
        typer.echo(ctx.get_help())


@app.command(name="show")
def usage_show(
    token: Optional[str] = typer.Option(
        None,
        "--token",
        help="Authentication token (Bearer token for API requests).",
    ),
    iam_url: Optional[str] = typer.Option(
        None,
        "--iam-url",
        help="Datalayer IAM server URL",
    ),
    raw: bool = typer.Option(
        False,
        "--raw",
        help="Print raw JSON payload from IAM.",
    ),
) -> None:
    """Show credits usage and reservations."""
    try:
        client = _make_client(token=token, iam_url=iam_url)
        usage = client.get_usage_credits()
        if not usage.get("success", True):
            console.print(f"[red]Error: {usage.get('message', 'Unknown error')}[/red]")
            raise typer.Exit(1)

        if raw:
            console.print(usage)
            return

        display_usage(usage)
    except Exception as e:
        console.print(f"[red]Error fetching usage: {e}[/red]")
        raise typer.Exit(1)


@app.command(name="records")
def usage_records(
    token: Optional[str] = typer.Option(
        None,
        "--token",
        help="Authentication token (Bearer token for API requests).",
    ),
    iam_url: Optional[str] = typer.Option(
        None,
        "--iam-url",
        help="Datalayer IAM server URL",
    ),
    billable_account_uid: Optional[str] = typer.Option(
        None,
        "--billable-account-uid",
        help="Optional account UID scope. Defaults to the authenticated account.",
    ),
    billable_account_kind: Optional[str] = typer.Option(
        None,
        "--billable-account-kind",
        help="Optional account kind scope: user or organization.",
    ),
    limit: int = typer.Option(20, "--limit", help="Maximum number of usage records."),
    raw: bool = typer.Option(False, "--raw", help="Print raw JSON payload from IAM."),
) -> None:
    """Show detailed usage records for the authenticated account scope."""
    try:
        client = _make_client(token=token, iam_url=iam_url)
        params: list[str] = []
        if billable_account_uid:
            params.append(f"billable_account_uid={billable_account_uid}")
        if billable_account_kind:
            params.append(f"billable_account_kind={billable_account_kind}")
        query_suffix = f"?{'&'.join(params)}" if params else ""
        response = _iam_get(client, f"/api/iam/v1/usage/user{query_suffix}")
        if not response.get("success", True):
            console.print(
                f"[red]Error: {response.get('message', 'Unknown error')}[/red]"
            )
            raise typer.Exit(1)

        usages = (response.get("usages") or [])[: max(1, limit)]
        if raw:
            console.print(response)
            return

        table = Table(title="Usage Records")
        table.add_column("Resource", style="cyan")
        table.add_column("Type", style="white")
        table.add_column("State", style="white")
        table.add_column("Start", style="white")
        table.add_column("End", style="white")
        table.add_column("Duration(s)", style="white", justify="right")
        table.add_column("Credits", style="white", justify="right")
        table.add_column("Burn/s", style="white", justify="right")

        for usage in usages:
            metadata = usage.get("metadata") or {}
            resource = (
                usage.get("resource_given_name")
                or usage.get("resource_uid")
                or usage.get("id")
                or "-"
            )
            start = usage.get("start_date")
            end = usage.get("end_date")
            table.add_row(
                _normalize_value(resource),
                _normalize_value(usage.get("resource_type")),
                _normalize_value(
                    usage.get("resource_state")
                    or usage.get("state")
                    or metadata.get("resource_state")
                ),
                _normalize_value(start),
                _normalize_value(end),
                _format_duration_seconds(start, end),
                _normalize_value(usage.get("credits"), fallback="0"),
                _normalize_value(usage.get("burning_rate"), fallback="0"),
            )
        console.print(table)
    except Exception as e:
        console.print(f"[red]Error fetching usage records: {e}[/red]")
        raise typer.Exit(1)


@app.command(name="reservations")
def usage_reservations(
    token: Optional[str] = typer.Option(
        None,
        "--token",
        help="Authentication token (Bearer token for API requests).",
    ),
    iam_url: Optional[str] = typer.Option(
        None,
        "--iam-url",
        help="Datalayer IAM server URL",
    ),
    reservation_type: Optional[str] = typer.Option(
        None,
        "--type",
        help="Optional reservation type filter.",
    ),
    billable_account_uid: Optional[str] = typer.Option(
        None,
        "--billable-account-uid",
        help="Optional account UID scope for fallback credits view.",
    ),
    billable_account_kind: Optional[str] = typer.Option(
        None,
        "--billable-account-kind",
        help="Optional account kind scope for fallback credits view: user or organization.",
    ),
    limit: int = typer.Option(20, "--limit", help="Maximum number of reservations."),
    raw: bool = typer.Option(False, "--raw", help="Print raw JSON payload from IAM."),
) -> None:
    """Show reservations from IAM reservations endpoint."""
    try:
        client = _make_client(token=token, iam_url=iam_url)
        query_suffix = f"?type={reservation_type}" if reservation_type else ""
        response = _iam_get(client, f"/api/iam/v1/usage/reservations{query_suffix}")
        if not response.get("success", True):
            console.print(
                f"[red]Error: {response.get('message', 'Unknown error')}[/red]"
            )
            raise typer.Exit(1)

        data = response.get("data") or {}
        reservations = data.get("reservations") or []
        source = "usage/reservations"

        if not reservations:
            params: list[str] = []
            if billable_account_uid:
                params.append(f"billable_account_uid={billable_account_uid}")
            if billable_account_kind:
                params.append(f"billable_account_kind={billable_account_kind}")
            credits_query = f"?{'&'.join(params)}" if params else ""
            credits_response = _iam_get(
                client,
                f"/api/iam/v1/usage/credits{credits_query}",
            )
            if credits_response.get("success", True):
                reservations = credits_response.get("reservations") or []
                source = "usage/credits"

        reservations = reservations[: max(1, limit)]
        if raw:
            console.print(response)
            return

        if source == "usage/credits":
            console.print(
                "[yellow]No reservations from /usage/reservations; showing active reservations from /usage/credits.[/yellow]"
            )

        table = Table(title="Reservations")
        table.add_column("Reservation", style="cyan")
        table.add_column("Resource", style="white")
        table.add_column("Type", style="white")
        table.add_column("Credits", style="white", justify="right")
        table.add_column("Burn/s", style="white", justify="right")
        table.add_column("Start", style="white")
        table.add_column("Last Update", style="white")

        for reservation in reservations:
            table.add_row(
                _normalize_value(reservation.get("id")),
                _normalize_value(
                    reservation.get("resource")
                    or reservation.get("resource_uid")
                    or reservation.get("resource_given_name")
                ),
                _normalize_value(reservation.get("resource_type")),
                _normalize_value(
                    reservation.get("credits")
                    or reservation.get("credits_limit"),
                    fallback="0",
                ),
                _normalize_value(reservation.get("burning_rate"), fallback="0"),
                _normalize_value(reservation.get("start_date")),
                _normalize_value(
                    reservation.get("last_update")
                    or reservation.get("updated_at")
                    or reservation.get("last_update_ts_dt")
                ),
            )
        console.print(table)
    except Exception as e:
        console.print(f"[red]Error fetching reservations: {e}[/red]")
        raise typer.Exit(1)


@app.command(name="org-overview")
def usage_org_overview(
    organization_uid: str = typer.Option(
        ...,
        "--organization-uid",
        help="Organization UID.",
    ),
    token: Optional[str] = typer.Option(
        None,
        "--token",
        help="Authentication token (Bearer token for API requests).",
    ),
    iam_url: Optional[str] = typer.Option(
        None,
        "--iam-url",
        help="Datalayer IAM server URL",
    ),
    raw: bool = typer.Option(False, "--raw", help="Print raw JSON payload."),
) -> None:
    """Show organization/team credits allocation overview."""
    try:
        client = _make_client(token=token, iam_url=iam_url)
        response = _iam_get(
            client,
            f"/api/iam/v1/usage/credits/allocations/organizations/{organization_uid}/overview",
        )
        if not response.get("success", True):
            console.print(
                f"[red]Error: {response.get('message', 'Unknown error')}[/red]"
            )
            raise typer.Exit(1)

        if raw:
            console.print(response)
            return

        overview = response.get("overview") or {}
        organization = overview.get("organization") or {}
        teams = overview.get("teams") or []

        summary = Table(title="Organization Credits Overview")
        summary.add_column("Field", style="cyan", no_wrap=True)
        summary.add_column("Value", style="white")
        summary.add_row("Organization UID", _normalize_value(organization.get("uid")))
        summary.add_row(
            "Credits", _normalize_value(organization.get("credits"), fallback="0")
        )
        summary.add_row(
            "Quota", _normalize_value(organization.get("quota"), fallback="none")
        )
        summary.add_row("Teams", str(len(teams)))
        console.print(summary)

        team_table = Table(title="Teams")
        team_table.add_column("UID", style="cyan")
        team_table.add_column("Handle", style="white")
        team_table.add_column("Name", style="white")
        team_table.add_column("Credits", style="white")
        for team in teams:
            team_table.add_row(
                _normalize_value(team.get("uid")),
                _normalize_value(team.get("handle")),
                _normalize_value(team.get("name")),
                _normalize_value(team.get("credits"), fallback="0"),
            )
        console.print(team_table)
    except Exception as e:
        console.print(f"[red]Error fetching organization overview: {e}[/red]")
        raise typer.Exit(1)


@app.command(name="team-overview")
def usage_team_overview(
    team_uid: str = typer.Option(
        ...,
        "--team-uid",
        help="Team UID.",
    ),
    token: Optional[str] = typer.Option(
        None,
        "--token",
        help="Authentication token (Bearer token for API requests).",
    ),
    iam_url: Optional[str] = typer.Option(
        None,
        "--iam-url",
        help="Datalayer IAM server URL",
    ),
    raw: bool = typer.Option(False, "--raw", help="Print raw JSON payload."),
) -> None:
    """Show team/member credits allocation overview."""
    try:
        client = _make_client(token=token, iam_url=iam_url)
        response = _iam_get(
            client,
            f"/api/iam/v1/usage/credits/allocations/teams/{team_uid}/overview",
        )
        if not response.get("success", True):
            console.print(
                f"[red]Error: {response.get('message', 'Unknown error')}[/red]"
            )
            raise typer.Exit(1)

        if raw:
            console.print(response)
            return

        overview = response.get("overview") or {}
        team = overview.get("team") or {}
        members = overview.get("members") or []

        summary = Table(title="Team Credits Overview")
        summary.add_column("Field", style="cyan", no_wrap=True)
        summary.add_column("Value", style="white")
        summary.add_row("Team UID", _normalize_value(team.get("uid")))
        summary.add_row("Team Handle", _normalize_value(team.get("handle")))
        summary.add_row("Credits", _normalize_value(team.get("credits"), fallback="0"))
        summary.add_row("Members", str(len(members)))
        console.print(summary)

        members_table = Table(title="Members")
        members_table.add_column("UID", style="cyan")
        members_table.add_column("Handle", style="white")
        members_table.add_column("Display Name", style="white")
        members_table.add_column("Credits", style="white")
        for member in members:
            members_table.add_row(
                _normalize_value(member.get("uid")),
                _normalize_value(member.get("handle")),
                _normalize_value(member.get("display_name")),
                _normalize_value(member.get("credits"), fallback="0"),
            )
        console.print(members_table)
    except Exception as e:
        console.print(f"[red]Error fetching team overview: {e}[/red]")
        raise typer.Exit(1)


@app.command(name="org-history")
def usage_org_history(
    organization_uid: str = typer.Option(
        ..., "--organization-uid", help="Organization UID."
    ),
    token: Optional[str] = typer.Option(None, "--token", help="Authentication token."),
    iam_url: Optional[str] = typer.Option(
        None,
        "--iam-url",
        help="Datalayer IAM server URL",
    ),
    limit: int = typer.Option(20, "--limit", help="Max events to print."),
) -> None:
    """Show organization/team credits transfer history."""
    try:
        client = _make_client(token=token, iam_url=iam_url)
        response = _iam_get(
            client,
            f"/api/iam/v1/usage/credits/allocations/organizations/{organization_uid}/history",
        )
        if not response.get("success", True):
            console.print(
                f"[red]Error: {response.get('message', 'Unknown error')}[/red]"
            )
            raise typer.Exit(1)

        events = ((response.get("history") or {}).get("events") or [])[: max(1, limit)]
        table = Table(title="Organization Allocation History")
        table.add_column("When", style="cyan")
        table.add_column("Event", style="white")
        table.add_column("Credits", style="white")
        table.add_column("Account", style="white")
        for event in events:
            table.add_row(
                _normalize_value(event.get("created_at")),
                _normalize_value(event.get("event")),
                _normalize_value(event.get("credits"), fallback="0"),
                _normalize_value(event.get("account_uid")),
            )
        console.print(table)
    except Exception as e:
        console.print(f"[red]Error fetching organization history: {e}[/red]")
        raise typer.Exit(1)


@app.command(name="team-history")
def usage_team_history(
    team_uid: str = typer.Option(..., "--team-uid", help="Team UID."),
    token: Optional[str] = typer.Option(None, "--token", help="Authentication token."),
    iam_url: Optional[str] = typer.Option(
        None,
        "--iam-url",
        help="Datalayer IAM server URL",
    ),
    limit: int = typer.Option(20, "--limit", help="Max events to print."),
) -> None:
    """Show team/member credits transfer history."""
    try:
        client = _make_client(token=token, iam_url=iam_url)
        response = _iam_get(
            client,
            f"/api/iam/v1/usage/credits/allocations/teams/{team_uid}/history",
        )
        if not response.get("success", True):
            console.print(
                f"[red]Error: {response.get('message', 'Unknown error')}[/red]"
            )
            raise typer.Exit(1)

        events = ((response.get("history") or {}).get("events") or [])[: max(1, limit)]
        table = Table(title="Team Allocation History")
        table.add_column("When", style="cyan")
        table.add_column("Event", style="white")
        table.add_column("Credits", style="white")
        table.add_column("Account", style="white")
        for event in events:
            table.add_row(
                _normalize_value(event.get("created_at")),
                _normalize_value(event.get("event")),
                _normalize_value(event.get("credits"), fallback="0"),
                _normalize_value(event.get("account_uid")),
            )
        console.print(table)
    except Exception as e:
        console.print(f"[red]Error fetching team history: {e}[/red]")
        raise typer.Exit(1)


@app.command(name="org-monitor")
def usage_org_monitor(
    organization_uid: str = typer.Option(
        ..., "--organization-uid", help="Organization UID."
    ),
    token: Optional[str] = typer.Option(None, "--token", help="Authentication token."),
    iam_url: Optional[str] = typer.Option(
        None,
        "--iam-url",
        help="Datalayer IAM server URL",
    ),
    window_hours: int = typer.Option(
        24, "--window-hours", help="Monitoring window in hours."
    ),
) -> None:
    """Show organization/team credits monitoring metrics and recommendations."""
    try:
        client = _make_client(token=token, iam_url=iam_url)
        response = _iam_get(
            client,
            f"/api/iam/v1/usage/credits/allocations/organizations/{organization_uid}/monitoring?window_hours={max(1, window_hours)}",
        )
        if not response.get("success", True):
            console.print(
                f"[red]Error: {response.get('message', 'Unknown error')}[/red]"
            )
            raise typer.Exit(1)

        monitoring = response.get("monitoring") or {}
        organization = monitoring.get("organization") or {}
        teams = monitoring.get("teams") or []
        recommendations = monitoring.get("recommendations") or []

        summary = Table(title="Organization Monitoring")
        summary.add_column("Field", style="cyan")
        summary.add_column("Value", style="white")
        summary.add_row(
            "Credits", _normalize_value(organization.get("credits"), fallback="0")
        )
        summary.add_row(
            "Active reservations",
            _normalize_value(organization.get("active_reservations"), fallback="0"),
        )
        summary.add_row(
            "Burning rate / hour",
            _normalize_value(organization.get("burning_rate_per_hour"), fallback="0"),
        )
        summary.add_row(
            "ETA (hours)",
            _normalize_value(
                organization.get("estimated_hours_to_depletion"), fallback="n/a"
            ),
        )
        console.print(summary)

        teams_table = Table(title="Team Monitoring")
        teams_table.add_column("Team", style="cyan")
        teams_table.add_column("Credits", style="white")
        teams_table.add_column("Reservations", style="white")
        teams_table.add_column("Burn/hr", style="white")
        teams_table.add_column("ETA(h)", style="white")
        for team in teams:
            teams_table.add_row(
                _normalize_value(team.get("handle") or team.get("uid")),
                _normalize_value(team.get("credits"), fallback="0"),
                _normalize_value(team.get("active_reservations"), fallback="0"),
                _normalize_value(team.get("burning_rate_per_hour"), fallback="0"),
                _normalize_value(
                    team.get("estimated_hours_to_depletion"), fallback="n/a"
                ),
            )
        console.print(teams_table)

        if recommendations:
            rec_table = Table(title="Recommendations")
            rec_table.add_column("Severity", style="cyan")
            rec_table.add_column("Account", style="white")
            rec_table.add_column("Message", style="white")
            for rec in recommendations:
                rec_table.add_row(
                    _normalize_value(rec.get("severity")),
                    _normalize_value(rec.get("account_uid")),
                    _normalize_value(rec.get("message")),
                )
            console.print(rec_table)
    except Exception as e:
        console.print(f"[red]Error fetching organization monitoring: {e}[/red]")
        raise typer.Exit(1)


@app.command(name="team-monitor")
def usage_team_monitor(
    team_uid: str = typer.Option(..., "--team-uid", help="Team UID."),
    token: Optional[str] = typer.Option(None, "--token", help="Authentication token."),
    iam_url: Optional[str] = typer.Option(
        None,
        "--iam-url",
        help="Datalayer IAM server URL",
    ),
    window_hours: int = typer.Option(
        24, "--window-hours", help="Monitoring window in hours."
    ),
) -> None:
    """Show team/member credits monitoring metrics and recommendations."""
    try:
        client = _make_client(token=token, iam_url=iam_url)
        response = _iam_get(
            client,
            f"/api/iam/v1/usage/credits/allocations/teams/{team_uid}/monitoring?window_hours={max(1, window_hours)}",
        )
        if not response.get("success", True):
            console.print(
                f"[red]Error: {response.get('message', 'Unknown error')}[/red]"
            )
            raise typer.Exit(1)

        monitoring = response.get("monitoring") or {}
        team = monitoring.get("team") or {}
        members = monitoring.get("members") or []
        recommendations = monitoring.get("recommendations") or []

        summary = Table(title="Team Monitoring")
        summary.add_column("Field", style="cyan")
        summary.add_column("Value", style="white")
        summary.add_row("Team", _normalize_value(team.get("handle") or team.get("uid")))
        summary.add_row("Credits", _normalize_value(team.get("credits"), fallback="0"))
        summary.add_row(
            "Active reservations",
            _normalize_value(team.get("active_reservations"), fallback="0"),
        )
        summary.add_row(
            "Burning rate / hour",
            _normalize_value(team.get("burning_rate_per_hour"), fallback="0"),
        )
        summary.add_row(
            "ETA (hours)",
            _normalize_value(team.get("estimated_hours_to_depletion"), fallback="n/a"),
        )
        console.print(summary)

        members_table = Table(title="Member Monitoring")
        members_table.add_column("Member", style="cyan")
        members_table.add_column("Credits", style="white")
        members_table.add_column("Reservations", style="white")
        members_table.add_column("Burn/hr", style="white")
        members_table.add_column("ETA(h)", style="white")
        for member in members:
            members_table.add_row(
                _normalize_value(member.get("handle") or member.get("uid")),
                _normalize_value(member.get("credits"), fallback="0"),
                _normalize_value(member.get("active_reservations"), fallback="0"),
                _normalize_value(member.get("burning_rate_per_hour"), fallback="0"),
                _normalize_value(
                    member.get("estimated_hours_to_depletion"), fallback="n/a"
                ),
            )
        console.print(members_table)

        if recommendations:
            rec_table = Table(title="Recommendations")
            rec_table.add_column("Severity", style="cyan")
            rec_table.add_column("Account", style="white")
            rec_table.add_column("Message", style="white")
            for rec in recommendations:
                rec_table.add_row(
                    _normalize_value(rec.get("severity")),
                    _normalize_value(rec.get("account_uid")),
                    _normalize_value(rec.get("message")),
                )
            console.print(rec_table)
    except Exception as e:
        console.print(f"[red]Error fetching team monitoring: {e}[/red]")
        raise typer.Exit(1)


@app.command(name="org-allocate-team")
def usage_org_allocate_team(
    organization_uid: str = typer.Option(
        ..., "--organization-uid", help="Organization UID."
    ),
    team_uid: str = typer.Option(..., "--team-uid", help="Team UID."),
    amount: float = typer.Option(
        ..., "--amount", help="Amount of credits to allocate."
    ),
    token: Optional[str] = typer.Option(None, "--token", help="Authentication token."),
    iam_url: Optional[str] = typer.Option(
        None,
        "--iam-url",
        help="Datalayer IAM server URL",
    ),
) -> None:
    """Allocate credits from organization to team."""
    try:
        client = _make_client(token=token, iam_url=iam_url)
        response = _iam_post(
            client,
            f"/api/iam/v1/usage/credits/allocations/organizations/{organization_uid}/teams/{team_uid}",
            {"amount": amount},
        )
        if not response.get("success", True):
            console.print(
                f"[red]Error: {response.get('message', 'Unknown error')}[/red]"
            )
            raise typer.Exit(1)
        console.print("[green]Credits allocated from organization to team.[/green]")
        console.print(response.get("transfer") or response)
    except Exception as e:
        console.print(f"[red]Error allocating credits: {e}[/red]")
        raise typer.Exit(1)


@app.command(name="org-revoke-team")
def usage_org_revoke_team(
    organization_uid: str = typer.Option(
        ..., "--organization-uid", help="Organization UID."
    ),
    team_uid: str = typer.Option(..., "--team-uid", help="Team UID."),
    amount: float = typer.Option(..., "--amount", help="Amount of credits to revoke."),
    token: Optional[str] = typer.Option(None, "--token", help="Authentication token."),
    iam_url: Optional[str] = typer.Option(
        None,
        "--iam-url",
        help="Datalayer IAM server URL",
    ),
) -> None:
    """Revoke credits from team back to organization."""
    try:
        client = _make_client(token=token, iam_url=iam_url)
        response = _iam_post(
            client,
            f"/api/iam/v1/usage/credits/allocations/organizations/{organization_uid}/teams/{team_uid}/revoke",
            {"amount": amount},
        )
        if not response.get("success", True):
            console.print(
                f"[red]Error: {response.get('message', 'Unknown error')}[/red]"
            )
            raise typer.Exit(1)
        console.print("[green]Credits revoked from team to organization.[/green]")
        console.print(response.get("transfer") or response)
    except Exception as e:
        console.print(f"[red]Error revoking credits: {e}[/red]")
        raise typer.Exit(1)


@app.command(name="team-allocate-member")
def usage_team_allocate_member(
    team_uid: str = typer.Option(..., "--team-uid", help="Team UID."),
    member_uid: str = typer.Option(..., "--member-uid", help="Member UID."),
    amount: float = typer.Option(
        ..., "--amount", help="Amount of credits to allocate."
    ),
    token: Optional[str] = typer.Option(None, "--token", help="Authentication token."),
    iam_url: Optional[str] = typer.Option(
        None,
        "--iam-url",
        help="Datalayer IAM server URL",
    ),
) -> None:
    """Allocate credits from team to member."""
    try:
        client = _make_client(token=token, iam_url=iam_url)
        response = _iam_post(
            client,
            f"/api/iam/v1/usage/credits/allocations/teams/{team_uid}/members/{member_uid}",
            {"amount": amount},
        )
        if not response.get("success", True):
            console.print(
                f"[red]Error: {response.get('message', 'Unknown error')}[/red]"
            )
            raise typer.Exit(1)
        console.print("[green]Credits allocated from team to member.[/green]")
        console.print(response.get("transfer") or response)
    except Exception as e:
        console.print(f"[red]Error allocating credits: {e}[/red]")
        raise typer.Exit(1)


@app.command(name="team-revoke-member")
def usage_team_revoke_member(
    team_uid: str = typer.Option(..., "--team-uid", help="Team UID."),
    member_uid: str = typer.Option(..., "--member-uid", help="Member UID."),
    amount: float = typer.Option(..., "--amount", help="Amount of credits to revoke."),
    token: Optional[str] = typer.Option(None, "--token", help="Authentication token."),
    iam_url: Optional[str] = typer.Option(
        None,
        "--iam-url",
        help="Datalayer IAM server URL",
    ),
) -> None:
    """Revoke credits from member back to team."""
    try:
        client = _make_client(token=token, iam_url=iam_url)
        response = _iam_post(
            client,
            f"/api/iam/v1/usage/credits/allocations/teams/{team_uid}/members/{member_uid}/revoke",
            {"amount": amount},
        )
        if not response.get("success", True):
            console.print(
                f"[red]Error: {response.get('message', 'Unknown error')}[/red]"
            )
            raise typer.Exit(1)
        console.print("[green]Credits revoked from member to team.[/green]")
        console.print(response.get("transfer") or response)
    except Exception as e:
        console.print(f"[red]Error revoking credits: {e}[/red]")
        raise typer.Exit(1)


# Root-level command for convenience


def usage_root(
    token: Optional[str] = typer.Option(
        None,
        "--token",
        help="Authentication token (Bearer token for API requests).",
    ),
    iam_url: Optional[str] = typer.Option(
        None,
        "--iam-url",
        help="Datalayer IAM server URL",
    ),
) -> None:
    """Show credits usage and reservations (root command)."""
    usage_show(token=token, iam_url=iam_url)
