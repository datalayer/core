# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""Plans commands for Datalayer CLI."""

from typing import Any, Optional

import typer
from rich.console import Console
from rich.table import Table

from datalayer_core.client.client import DatalayerClient
from datalayer_core.utils.urls import DatalayerURLs

app = typer.Typer(
    name="plans", help="Plan and subscription details", invoke_without_command=True
)
console = Console(width=200)


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


@app.callback()
def plans_callback(ctx: typer.Context) -> None:
    """Plans and subscription commands."""
    if ctx.invoked_subcommand is None:
        ctx.invoke(plans_show)


def _format_number(value: Any, fallback: str = "-") -> str:
    if value is None:
        return fallback
    try:
        number = float(value)
    except (TypeError, ValueError):
        return _normalize_value(value, fallback=fallback)
    if number.is_integer():
        return f"{int(number)}"
    return f"{number:.4f}".rstrip("0").rstrip(".") or "0"


def _format_period(start: Any, end: Any) -> str:
    start_text = _normalize_value(start, fallback="")
    end_text = _normalize_value(end, fallback="")
    if not start_text and not end_text:
        return "-"
    # Trim ISO timestamps to a date for readability.
    start_short = start_text[:10] if start_text else "…"
    end_short = end_text[:10] if end_text else "…"
    return f"{start_short} → {end_short}"


def _format_runs(plan: dict[str, Any]) -> str:
    included = plan.get("included_runs")
    used = plan.get("used_credits")
    remaining = plan.get("remaining_runs")
    used_text = _format_number(used, fallback="0")
    if included in (None, "", 0):
        return f"{used_text} / ∞"
    included_text = _format_number(included)
    if remaining is not None:
        remaining_text = _format_number(remaining)
        return f"{used_text} / {included_text}  (left {remaining_text})"
    return f"{used_text} / {included_text}"


def _format_wallet(
    plan: dict[str, Any],
    wallet_balance: Any = None,
) -> str:
    balance = (
        wallet_balance
        if wallet_balance is not None
        else plan.get("wallet_balance")
    )
    quota = plan.get("wallet_quota")
    is_quota = bool(plan.get("wallet_is_quota"))
    balance_text = _format_number(balance, fallback="0")
    if is_quota and quota not in (None, ""):
        return f"{balance_text} / {_format_number(quota)}"
    return balance_text


def _render_plan_row(
    table: Table,
    scope_label: str,
    handle: str,
    name: str,
    account_uid: str,
    plan: dict[str, Any],
    wallet_balance: Any = None,
    is_eligible: Any = None,
    parent: str = "",
) -> None:
    plan_name = plan.get("plan_name") or plan.get("plan_code") or "Free"
    status = plan.get("status") or "unknown"
    eligible = (
        "yes" if is_eligible is True else ("no" if is_eligible is False else "-")
    )
    handle_text = _normalize_value(handle, fallback="-")
    if name and name != handle:
        handle_text = f"{handle_text} ({name})"
    table.add_row(
        scope_label,
        handle_text,
        _normalize_value(parent, fallback="-"),
        _normalize_value(plan_name),
        _normalize_value(status),
        _format_wallet(plan, wallet_balance=wallet_balance),
        _format_number(plan.get("current_credits"), fallback="0"),
        _format_runs(plan),
        _format_period(
            plan.get("current_period_start"), plan.get("current_period_end")
        ),
        eligible,
        _normalize_value(account_uid),
    )


def _add_plan_columns(table: Table) -> None:
    table.add_column("Scope", style="cyan", no_wrap=True)
    table.add_column("Handle", style="white", no_wrap=True)
    table.add_column("Parent Org", style="magenta", no_wrap=True)
    table.add_column("Plan", style="green", no_wrap=True)
    table.add_column("Status", style="white", no_wrap=True)
    table.add_column(
        "Wallet (balance/quota)", style="yellow", justify="right", no_wrap=True
    )
    table.add_column(
        "Current Credits", style="white", justify="right", no_wrap=True
    )
    table.add_column(
        "Runs (used/included)", style="white", justify="right", no_wrap=True
    )
    table.add_column("Period", style="white", no_wrap=True)
    table.add_column("Eligible", style="white", no_wrap=True)
    table.add_column("Account UID", style="dim", no_wrap=True)



@app.command(name="show")
def plans_show(
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
    """Show the authenticated user's plan plus plans of org/team memberships."""
    try:
        client = _make_client(token=token, iam_url=iam_url)

        # 1. Authenticated user plan.
        self_plan_response = _iam_get(client, "/api/iam/v1/plans")
        if not self_plan_response.get("success", True):
            console.print(
                f"[red]Error: {self_plan_response.get('message', 'Unknown error')}[/red]"
            )
            raise typer.Exit(1)

        # 2. Memberships (organizations + teams).
        memberships_response = _iam_get(client, "/api/iam/v1/memberships")
        memberships = (
            memberships_response.get("memberships") or []
            if memberships_response.get("success", True)
            else []
        )

        # 3. Resolve plans for all org/team memberships in one batch.
        membership_uids = [
            m.get("uid") for m in memberships if m.get("uid")
        ]
        accounts_details: list[dict[str, Any]] = []
        if membership_uids:
            details_response = _iam_post(
                client,
                "/api/iam/v1/plans/accounts/details",
                {"account_uids": membership_uids},
            )
            if details_response.get("success", True):
                accounts_details = details_response.get("accounts") or []

        if raw:
            console.print(
                {
                    "self_plan": self_plan_response,
                    "memberships": memberships_response,
                    "accounts_details": accounts_details,
                }
            )
            return

        table = Table(title="Plans")
        _add_plan_columns(table)

        # Self row.
        self_plan = self_plan_response.get("plan") or {}
        self_account_uid = self_plan_response.get("account_uid") or self_plan.get(
            "account_uid"
        ) or ""
        self_handle = self_plan.get("account_handle") or "-"
        _render_plan_row(
            table,
            scope_label="user (self)",
            handle=self_handle,
            name=self_handle,
            account_uid=self_account_uid,
            plan=self_plan,
            wallet_balance=self_plan.get("wallet_balance"),
            is_eligible=None,
            parent="",
        )

        # Memberships rows.
        details_by_uid: dict[str, dict[str, Any]] = {
            entry.get("account_uid"): entry for entry in accounts_details
        }
        orgs_by_uid = {
            m.get("uid"): m
            for m in memberships
            if (m.get("type") or "").lower() == "organization"
        }

        # Organizations first, then teams (with parent label).
        for membership in memberships:
            mtype = (membership.get("type") or "").lower()
            if mtype != "organization":
                continue
            uid = membership.get("uid") or ""
            detail = details_by_uid.get(uid) or {}
            plan = detail.get("subscription") or {}
            _render_plan_row(
                table,
                scope_label="organization",
                handle=membership.get("handle") or "-",
                name=membership.get("name") or membership.get("handle") or "-",
                account_uid=uid,
                plan=plan,
                wallet_balance=detail.get("wallet_balance"),
                is_eligible=detail.get("is_eligible"),
                parent="",
            )

        for membership in memberships:
            mtype = (membership.get("type") or "").lower()
            if mtype != "team":
                continue
            uid = membership.get("uid") or ""
            detail = details_by_uid.get(uid) or {}
            plan = detail.get("subscription") or {}
            parent_uid = membership.get("organization_uid") or ""
            parent_org = orgs_by_uid.get(parent_uid)
            parent_label = (
                parent_org.get("handle") if parent_org else (parent_uid or "-")
            )
            _render_plan_row(
                table,
                scope_label="team",
                handle=membership.get("handle") or "-",
                name=membership.get("name") or membership.get("handle") or "-",
                account_uid=uid,
                plan=plan,
                wallet_balance=detail.get("wallet_balance"),
                is_eligible=detail.get("is_eligible"),
                parent=parent_label or "-",
            )

        console.print(table)
    except typer.Exit:
        raise
    except Exception as e:
        console.print(f"[red]Error fetching plans: {e}[/red]")
        raise typer.Exit(1)


@app.command(name="catalog")
def plans_catalog(
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
        help="Optional billable account UID scope.",
    ),
    raw: bool = typer.Option(False, "--raw", help="Print raw JSON payload."),
) -> None:
    """List available plans from the catalog."""
    try:
        client = _make_client(token=token, iam_url=iam_url)
        suffix = (
            f"?billable_account_uid={billable_account_uid}"
            if billable_account_uid
            else ""
        )
        response = _iam_get(client, f"/api/iam/v1/plans/catalog{suffix}")
        if not response.get("success", True):
            console.print(
                f"[red]Error: {response.get('message', 'Unknown error')}[/red]"
            )
            raise typer.Exit(1)

        if raw:
            console.print(response)
            return

        plans = response.get("plans") or response.get("available_plans") or []
        table = Table(title="Available Plans")
        table.add_column("ID", style="cyan")
        table.add_column("Name", style="white")
        table.add_column("Code", style="white")
        table.add_column("Price", style="white", justify="right")
        table.add_column("Currency", style="white")
        table.add_column("Included Runs", style="white", justify="right")
        for plan in plans:
            if not isinstance(plan, dict):
                continue
            table.add_row(
                _normalize_value(plan.get("id")),
                _normalize_value(plan.get("name")),
                _normalize_value(plan.get("code") or plan.get("plan_code")),
                _normalize_value(plan.get("price"), fallback="-"),
                _normalize_value(plan.get("currency"), fallback="-"),
                _normalize_value(plan.get("included_runs"), fallback="-"),
            )
        console.print(table)
    except typer.Exit:
        raise
    except Exception as e:
        console.print(f"[red]Error fetching plans catalog: {e}[/red]")
        raise typer.Exit(1)


# Root-level command for convenience.


def plans_root(
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
    """Show plans for the authenticated user and memberships (root command)."""
    plans_show(token=token, iam_url=iam_url)
