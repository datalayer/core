# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""Subscription and billing commands for Datalayer CLI."""

from collections import Counter
from typing import Any, Optional

import typer
from rich.console import Console
from rich.table import Table

from datalayer_core.client.client import DatalayerClient

app = typer.Typer(
    name="subscriptions",
    help="Subscription and billing commands",
    invoke_without_command=True,
)
console = Console()


def _extract_subscription(payload: dict[str, Any]) -> dict[str, Any]:
    return payload.get("subscription") or {}


def _normalize_value(value: Any, fallback: str = "Not available") -> str:
    if value is None:
        return fallback
    text = str(value).strip()
    if not text:
        return fallback
    return text


def _format_plan_price(plan: dict[str, Any]) -> str:
    amount = (
        plan.get("amount")
        or plan.get("unit_amount")
        or plan.get("unit_amount_decimal")
        or plan.get("price")
    )
    currency = str(plan.get("currency") or "").strip().upper()

    try:
        if amount is None:
            return "Not available"
        amount_minor = float(amount)
        amount_major = amount_minor / 100.0
        if currency == "USD":
            return f"${amount_major:,.2f} USD"
        if currency:
            return f"{amount_major:,.2f} {currency}"
        return f"{amount_major:,.2f}"
    except (TypeError, ValueError):
        return _normalize_value(amount)


def _as_plan_list(value: Any) -> list[dict[str, Any]]:
    if not isinstance(value, list):
        return []
    plans: list[dict[str, Any]] = []
    for item in value:
        if isinstance(item, dict):
            plans.append(item)
        elif item is not None:
            plans.append({"name": str(item)})
    return plans


def _extract_available_plans(payload: dict[str, Any]) -> list[dict[str, Any]]:
    subscription = _extract_subscription(payload)
    candidates = [
        payload.get("available_subscriptions"),
        payload.get("available_plans"),
        payload.get("plans"),
        subscription.get("available_subscriptions")
        if isinstance(subscription, dict)
        else None,
        subscription.get("available_plans") if isinstance(subscription, dict) else None,
        subscription.get("plans") if isinstance(subscription, dict) else None,
    ]
    for candidate in candidates:
        plans = _as_plan_list(candidate)
        if plans:
            return plans
    return []


def _render_available_plans(plans: list[dict[str, Any]]) -> None:
    if not plans:
        console.print(
            "[yellow]No available subscription list provided by IAM response.[/yellow]"
        )
        return

    plans_table = Table(title="Available Subscriptions")
    plans_table.add_column("Plan", style="cyan")
    plans_table.add_column("Price", style="white")
    plans_table.add_column("Interval", style="white")
    plans_table.add_column("Included runs", style="white")

    for plan in plans:
        recurring = plan.get("recurring") or {}
        interval = (
            plan.get("interval")
            or recurring.get("interval")
            or plan.get("billing_period")
        )
        plans_table.add_row(
            _normalize_value(
                plan.get("name")
                or plan.get("plan_name")
                or plan.get("nickname")
                or plan.get("id")
            ),
            _format_plan_price(plan),
            _normalize_value(interval),
            _normalize_value(
                plan.get("included_runs")
                or (plan.get("metadata") or {}).get("included_runs")
            ),
        )

    console.print(plans_table)


def _is_platform_admin(client: DatalayerClient) -> bool:
    profile = client.get_profile()
    roles = set(profile.roles or [])
    return "platform_admin" in roles


@app.callback()
def subscription_callback(ctx: typer.Context) -> None:
    """Subscription and billing commands."""
    if ctx.invoked_subcommand is None:
        typer.echo(ctx.get_help())


@app.command(name="show")
def subscription_show(
    token: Optional[str] = typer.Option(
        None,
        "--token",
        help="Authentication token (Bearer token for API requests).",
    ),
    raw: bool = typer.Option(
        False,
        "--raw",
        help="Print raw JSON payload from IAM.",
    ),
) -> None:
    """Show current subscription status and billing details."""
    try:
        client = DatalayerClient(token=token)
        response = client.get_subscription()

        if not response.get("success", True):
            console.print(
                f"[red]Error: {response.get('message', 'Unknown error')}[/red]"
            )
            raise typer.Exit(1)

        if raw:
            console.print(response)
            return

        subscription = _extract_subscription(response)
        portal = response.get("portal") or {}

        plan_name = _normalize_value(
            subscription.get("plan_name")
            or (subscription.get("plan") or {}).get("name")
            or subscription.get("plan")
            or subscription.get("tier"),
            fallback="Free",
        )
        status = _normalize_value(
            subscription.get("status")
            or subscription.get("subscription_status")
            or subscription.get("state"),
            fallback="",
        )
        if status.lower() == "unknown":
            status = ""
        period_start = _normalize_value(
            subscription.get("current_period_start")
            or subscription.get("period_start")
            or subscription.get("start_date")
        )
        period_end = _normalize_value(
            subscription.get("current_period_end")
            or subscription.get("period_end")
            or subscription.get("next_renewal_at")
            or subscription.get("renewal_date")
        )

        included_runs = subscription.get("included_runs")
        used_runs = subscription.get("used_runs")
        remaining_runs = None
        try:
            if included_runs is not None and used_runs is not None:
                remaining_runs = max(0, int(included_runs) - int(used_runs))
        except (ValueError, TypeError):
            remaining_runs = None

        table = Table(title="Subscription")
        table.add_column("Field", style="cyan", no_wrap=True)
        table.add_column("Value", style="white")

        table.add_row("Plan", plan_name)
        table.add_row("Status", status.replace("_", " "))
        table.add_row("Period start", period_start)
        table.add_row("Period end", period_end)
        table.add_row(
            "Included runs",
            _normalize_value(included_runs),
        )
        table.add_row(
            "Used runs",
            _normalize_value(used_runs),
        )
        table.add_row(
            "Remaining runs",
            _normalize_value(remaining_runs),
        )
        table.add_row("Billing portal", _normalize_value(portal.get("url")))

        console.print(table)

        plans_response = client.get_subscription_plans()
        if plans_response.get("success", True):
            _render_available_plans(_extract_available_plans(plans_response))
        else:
            _render_available_plans(_extract_available_plans(response))

        console.print(
            "[green]To upgrade or downgrade, run:[/green] datalayer subscriptions move"
        )
    except Exception as e:
        console.print(f"[red]Error fetching subscription: {e}[/red]")
        raise typer.Exit(1)


@app.command(name="available")
def subscription_available(
    token: Optional[str] = typer.Option(
        None,
        "--token",
        help="Authentication token (Bearer token for API requests).",
    ),
    raw: bool = typer.Option(
        False,
        "--raw",
        help="Print raw JSON payload from IAM.",
    ),
) -> None:
    """Show available subscription plans for the current user."""
    try:
        client = DatalayerClient(token=token)
        response = client.get_subscription_plans()

        if not response.get("success", True):
            fallback = client.get_subscription()
            if not fallback.get("success", True):
                console.print(
                    f"[red]Error: {response.get('message', 'Unknown error')}[/red]"
                )
                raise typer.Exit(1)
            response = fallback

        if raw:
            console.print(response)
            return

        _render_available_plans(_extract_available_plans(response))
        console.print(
            "[green]To upgrade or downgrade, run:[/green] datalayer subscriptions move"
        )
    except Exception as e:
        console.print(f"[red]Error fetching available subscriptions: {e}[/red]")
        raise typer.Exit(1)


@app.command(name="move")
def subscription_move(
    token: Optional[str] = typer.Option(
        None,
        "--token",
        help="Authentication token (Bearer token for API requests).",
    ),
    return_url: Optional[str] = typer.Option(
        None,
        "--return-url",
        help="Optional return URL after plan change. Defaults to IAM base URL.",
    ),
    open_browser: bool = typer.Option(
        True,
        "--open/--no-open",
        help="Open checkout portal in your browser when URL is available.",
    ),
) -> None:
    """Start upgrade/downgrade flow via checkout portal."""
    try:
        client = DatalayerClient(token=token)
        resolved_return_url = return_url or client.urls.iam_url
        response = client.create_checkout_portal(resolved_return_url)

        if not response.get("success", True):
            console.print(
                f"[red]Error: {response.get('message', 'Unknown error')}[/red]"
            )
            raise typer.Exit(1)

        portal = response.get("portal") or {}
        portal_url = portal.get("url")
        portal_route = portal.get("route")

        if portal_url:
            console.print(
                "[green]Use this checkout portal to upgrade/downgrade:[/green] "
                f"{portal_url}"
            )
            if open_browser:
                import webbrowser

                webbrowser.open(portal_url)
            return

        if portal_route:
            console.print(
                "[yellow]Portal URL is not exposed, but a checkout route is available:[/yellow] "
                f"{portal_route}"
            )
            console.print(
                "[green]Open your Datalayer UI and navigate to that route to change plans.[/green]"
            )
            return

        console.print(
            "[yellow]No checkout portal available for this account. Contact support or platform admin.[/yellow]"
        )
        raise typer.Exit(1)
    except Exception as e:
        console.print(f"[red]Error starting subscription move flow: {e}[/red]")
        raise typer.Exit(1)


@app.command(name="portal")
def subscription_portal(
    token: Optional[str] = typer.Option(
        None,
        "--token",
        help="Authentication token (Bearer token for API requests).",
    ),
    open_browser: bool = typer.Option(
        True,
        "--open/--no-open",
        help="Open the billing portal in your browser.",
    ),
) -> None:
    """Print billing portal URL and optionally open it in a browser."""
    try:
        client = DatalayerClient(token=token)
        response = client.get_subscription()
        if not response.get("success", True):
            console.print(
                f"[red]Error: {response.get('message', 'Unknown error')}[/red]"
            )
            raise typer.Exit(1)

        portal_url = (response.get("portal") or {}).get("url")
        if not portal_url:
            console.print(
                "[yellow]No billing portal URL available for this account.[/yellow]"
            )
            raise typer.Exit(1)

        console.print(f"[green]Billing portal:[/green] {portal_url}")
        if open_browser:
            import webbrowser

            webbrowser.open(portal_url)
    except Exception as e:
        console.print(f"[red]Error opening billing portal: {e}[/red]")
        raise typer.Exit(1)


@app.command(name="cancel")
def subscription_cancel(
    token: Optional[str] = typer.Option(
        None,
        "--token",
        help="Authentication token (Bearer token for API requests).",
    ),
    open_browser: bool = typer.Option(
        True,
        "--open/--no-open",
        help="Open the cancellation portal in your browser when available.",
    ),
) -> None:
    """Start subscription cancellation flow."""
    try:
        client = DatalayerClient(token=token)
        response = client.cancel_subscription()
        if not response.get("success", True):
            console.print(
                f"[red]Error: {response.get('message', 'Unknown error')}[/red]"
            )
            raise typer.Exit(1)

        console.print("[green]Cancellation request submitted.[/green]")
        portal_url = (response.get("portal") or {}).get("url")
        if portal_url:
            console.print(f"[green]Cancellation portal:[/green] {portal_url}")
            if open_browser:
                import webbrowser

                webbrowser.open(portal_url)
    except Exception as e:
        console.print(f"[red]Error cancelling subscription: {e}[/red]")
        raise typer.Exit(1)


@app.command(name="topups")
def subscription_topups(
    token: Optional[str] = typer.Option(
        None,
        "--token",
        help="Authentication token (Bearer token for API requests).",
    ),
    raw: bool = typer.Option(
        False,
        "--raw",
        help="Print raw JSON payload from IAM.",
    ),
) -> None:
    """Show top-up eligibility and available top-up prices."""
    try:
        client = DatalayerClient(token=token)
        subscription_resp = client.get_subscription()
        usage_resp = client.get_usage_credits()
        prices_resp = client._fetch(
            f"{client.urls.iam_url}/api/iam/stripe/v1/topup/prices",
            method="GET",
        ).json()

        if raw:
            console.print(
                {
                    "subscription": subscription_resp,
                    "usage": usage_resp,
                    "prices": prices_resp,
                }
            )
            return

        subscription = _extract_subscription(subscription_resp)
        plan_name = _normalize_value(
            subscription.get("plan_name") or subscription.get("plan") or "Free",
            fallback="Free",
        )
        status = _normalize_value(
            subscription.get("status")
            or subscription.get("subscription_status")
            or "unknown",
            fallback="unknown",
        ).lower()
        has_topup_access = status in {"active", "trialing"} and str(
            plan_name
        ).lower() not in {
            "free",
            "none",
        }

        credits = (usage_resp.get("credits") or {}).get("credits")
        quota = (usage_resp.get("credits") or {}).get("quota")
        prices = prices_resp.get("prices") or []

        summary = Table(title="Top-up Status")
        summary.add_column("Field", style="cyan", no_wrap=True)
        summary.add_column("Value", style="white")
        summary.add_row("Plan", str(plan_name))
        summary.add_row("Subscription status", str(status).replace("_", " "))
        summary.add_row("Top-up eligible", "yes" if has_topup_access else "no")
        summary.add_row("Current credits", _normalize_value(credits, fallback="0"))
        summary.add_row("Quota", _normalize_value(quota, fallback="none"))
        summary.add_row("Top-up prices", str(len(prices)))
        console.print(summary)

        prices_table = Table(title="Top-up Prices")
        prices_table.add_column("Price ID", style="cyan")
        prices_table.add_column("Currency", style="white")
        prices_table.add_column("Unit Amount", style="white")
        prices_table.add_column("Credits per Unit", style="white")

        for price in prices:
            # Stripe price payloads can vary by endpoint version.
            unit_amount = (
                price.get("unit_amount")
                or price.get("amount")
                or price.get("unit_amount_decimal")
            )
            transform_quantity = price.get("transform_quantity") or {}
            credits_per_unit = (
                transform_quantity.get("divide_by")
                if isinstance(transform_quantity, dict)
                else None
            )
            if credits_per_unit is None:
                credits_per_unit = price.get("credits") or price.get("credits_delta")

            prices_table.add_row(
                _normalize_value(price.get("id")),
                _normalize_value(price.get("currency"), fallback="n/a"),
                _normalize_value(unit_amount, fallback="n/a"),
                _normalize_value(credits_per_unit, fallback="n/a"),
            )

        if prices:
            console.print(prices_table)
        else:
            console.print("[yellow]No top-up prices configured.[/yellow]")

        if not has_topup_access:
            console.print(
                "[yellow]Top-up purchase is currently blocked. Activate a monthly subscription first.[/yellow]"
            )
    except Exception as e:
        console.print(f"[red]Error fetching top-up information: {e}[/red]")
        raise typer.Exit(1)


@app.command(name="stats")
def subscription_stats(
    token: Optional[str] = typer.Option(
        None,
        "--token",
        help="Authentication token (Bearer token for API requests).",
    ),
    query: str = typer.Option(
        "",
        "--query",
        help="Optional user search query for scoped analytics.",
    ),
) -> None:
    """Show subscription aggregates (platform_admin only)."""
    try:
        client = DatalayerClient(token=token)
        if not _is_platform_admin(client):
            console.print("[red]Access denied: platform_admin role required.[/red]")
            raise typer.Exit(1)

        response = client._fetch(
            f"{client.urls.iam_url}/api/iam/v1/users/search",
            method="POST",
            json={"query": query},
        ).json()

        if not response.get("success", True):
            console.print(
                f"[red]Error: {response.get('message', 'Unknown error')}[/red]"
            )
            raise typer.Exit(1)

        data = response.get("data") or {}
        users = data.get("users") or response.get("users") or []

        status_counter: Counter[str] = Counter()
        plan_counter: Counter[str] = Counter()
        paid_count = 0

        for user in users:
            status = str(user.get("subscription_status_s") or "none").lower()
            plan = str(user.get("subscription_plan_s") or "none")
            status_counter[status] += 1
            plan_counter[plan] += 1

            if status in {"active", "trialing", "past_due", "unpaid"}:
                paid_count += 1

        total_users = len(users)

        headline = Table(title="Subscription Aggregates")
        headline.add_column("Metric", style="cyan", no_wrap=True)
        headline.add_column("Value", style="white")
        headline.add_row("Total users scanned", str(total_users))
        headline.add_row("Users with paid subscriptions", str(paid_count))
        headline.add_row(
            "Paid subscription ratio",
            f"{(paid_count / total_users * 100):.1f}%" if total_users else "0.0%",
        )
        console.print(headline)

        status_table = Table(title="Subscription Status Counts")
        status_table.add_column("Status", style="cyan", no_wrap=True)
        status_table.add_column("Count", style="white")
        for status, count in sorted(
            status_counter.items(), key=lambda x: (-x[1], x[0])
        ):
            status_table.add_row(status, str(count))
        console.print(status_table)

        plan_table = Table(title="Subscription Plan Counts")
        plan_table.add_column("Plan", style="cyan", no_wrap=True)
        plan_table.add_column("Count", style="white")
        for plan, count in sorted(plan_counter.items(), key=lambda x: (-x[1], x[0])):
            plan_table.add_row(plan, str(count))
        console.print(plan_table)

    except Exception as e:
        console.print(f"[red]Error computing subscription stats: {e}[/red]")
        raise typer.Exit(1)


@app.command(name="admin-users")
def subscription_admin_users(
    token: Optional[str] = typer.Option(
        None,
        "--token",
        help="Authentication token (Bearer token for API requests).",
    ),
    query: str = typer.Option(
        "",
        "--query",
        help="Optional user search query.",
    ),
    limit: int = typer.Option(
        25,
        "--limit",
        help="Maximum users to print.",
    ),
) -> None:
    """List users with subscription fields (platform_admin only)."""
    try:
        client = DatalayerClient(token=token)
        if not _is_platform_admin(client):
            console.print("[red]Access denied: platform_admin role required.[/red]")
            raise typer.Exit(1)

        response = client._fetch(
            f"{client.urls.iam_url}/api/iam/v1/users/search",
            method="POST",
            json={"query": query},
        ).json()

        if not response.get("success", True):
            console.print(
                f"[red]Error: {response.get('message', 'Unknown error')}[/red]"
            )
            raise typer.Exit(1)

        data = response.get("data") or {}
        users = (data.get("users") or response.get("users") or [])[:limit]

        table = Table(title="Subscription Users")
        table.add_column("Handle", style="cyan")
        table.add_column("Plan", style="white")
        table.add_column("Status", style="white")
        table.add_column("Customer", style="white")

        for user in users:
            table.add_row(
                _normalize_value(user.get("handle_s")),
                _normalize_value(user.get("subscription_plan_s"), fallback="none"),
                _normalize_value(user.get("subscription_status_s"), fallback="none"),
                _normalize_value(user.get("credits_customer_uid"), fallback="none"),
            )

        console.print(table)
        console.print(
            f"[green]Shown {len(users)} user(s). Use --query to narrow results.[/green]"
        )
    except Exception as e:
        console.print(f"[red]Error listing subscription users: {e}[/red]")
        raise typer.Exit(1)


@app.command(name="dry-run")
def subscription_dry_run(
    token: Optional[str] = typer.Option(
        None,
        "--token",
        help="Authentication token (Bearer token for API requests).",
    ),
    check_api: bool = typer.Option(
        True,
        "--check-api/--no-check-api",
        help="Verify IAM Stripe API endpoints during the walkthrough.",
    ),
    price_id: Optional[str] = typer.Option(
        None,
        "--price-id",
        help="Optional Stripe top-up price id used for payment-intent creation check.",
    ),
    create_intent: bool = typer.Option(
        False,
        "--create-intent/--no-create-intent",
        help="Create a real test-mode payment intent to validate end-to-end wiring.",
    ),
) -> None:
    """Didactic dry-run for subscriptions and Stripe configuration."""
    try:
        client = DatalayerClient(token=token)

        console.rule("[bold]Datalayer Subscriptions Dry-Run[/bold]")
        console.print(
            "This walkthrough validates Stripe test configuration end-to-end."
        )

        checklist = Table(title="Step-by-step Checklist")
        checklist.add_column("Step", style="cyan", no_wrap=True)
        checklist.add_column("What to verify", style="white")
        checklist.add_row("1", "Stripe Dashboard in Test Mode (pk_test/sk_test keys).")
        checklist.add_row("2", "Top-up one-time product and prices configured.")
        checklist.add_row(
            "3",
            "Top-up prices have transform_quantity.divide_by mapped to credits.",
        )
        checklist.add_row("4", "Monthly subscription product exists and is active.")
        checklist.add_row(
            "5",
            "Customer portal enabled for payment method and cancellation flows.",
        )
        checklist.add_row(
            "6",
            "Webhook endpoint set to /api/iam/stripe/v1/webhook with subscription + invoice + payment_intent events.",
        )
        checklist.add_row(
            "7",
            "IAM env vars are set: DATALAYER_STRIPE_API_KEY, DATALAYER_STRIPE_JS_API_KEY, DATALAYER_STRIPE_PRODUCT_ID, DATALAYER_STRIPE_WEBHOOK_SECRET.",
        )
        console.print(checklist)

        if check_api:
            console.rule("[bold]API Checks[/bold]")

            sub_resp = client.get_subscription()
            if sub_resp.get("success", True):
                sub = _extract_subscription(sub_resp)
                console.print(
                    "[green]OK[/green] /api/iam/v1/subscription "
                    f"plan={_normalize_value(sub.get('plan_name'), 'unknown')} "
                    f"status={_normalize_value(sub.get('status'), 'unknown')}"
                )
            else:
                console.print(
                    "[red]FAILED[/red] /api/iam/v1/subscription "
                    f"{sub_resp.get('message', 'Unknown error')}"
                )

            prices_resp = client._fetch(
                f"{client.urls.iam_url}/api/iam/stripe/v1/topup/prices",
                method="GET",
            ).json()
            prices = prices_resp.get("prices") or []
            if prices_resp.get("success", True):
                console.print(
                    f"[green]OK[/green] /api/iam/stripe/v1/topup/prices returned {len(prices)} price(s)."
                )
            else:
                console.print(
                    "[red]FAILED[/red] /api/iam/stripe/v1/topup/prices "
                    f"{prices_resp.get('message', 'Unknown error')}"
                )

            if create_intent:
                if not price_id:
                    if prices:
                        price_id = prices[0].get("id")
                    else:
                        console.print(
                            "[yellow]SKIP[/yellow] No top-up price available for intent creation check."
                        )

                if price_id:
                    intent_resp = client._fetch(
                        f"{client.urls.iam_url}/api/iam/stripe/v1/topup/payment-intent",
                        method="POST",
                        json={"price_id": price_id},
                    ).json()
                    if intent_resp.get("success", True) and intent_resp.get(
                        "client_secret"
                    ):
                        console.print(
                            "[green]OK[/green] /api/iam/stripe/v1/topup/payment-intent returned client_secret."
                        )
                    else:
                        console.print(
                            "[red]FAILED[/red] /api/iam/stripe/v1/topup/payment-intent "
                            f"{intent_resp.get('message', 'Unknown error')}"
                        )

        console.rule("[bold]Stripe Test Card Suggestions[/bold]")
        cards = Table()
        cards.add_column("Scenario", style="cyan")
        cards.add_column("Card Number", style="white")
        cards.add_row("Success", "4242 4242 4242 4242")
        cards.add_row("3DS Challenge", "4000 0025 0000 3155")
        cards.add_row("Declined", "4000 0000 0000 0002")
        cards.add_row("Insufficient Funds", "4000 0000 0000 9995")
        console.print(cards)
        console.print(
            "Use any future expiry date, any CVC, and any postal code in test mode."
        )

        console.rule("[bold]Expected Result[/bold]")
        console.print(
            "Top-up must be blocked without monthly subscription, and allowed with active monthly subscription."
        )
    except Exception as e:
        console.print(f"[red]Error running subscriptions dry-run: {e}[/red]")
        raise typer.Exit(1)


def subscription_root(
    token: Optional[str] = typer.Option(
        None,
        "--token",
        help="Authentication token (Bearer token for API requests).",
    ),
) -> None:
    """Show subscription status (root command)."""
    subscription_show(token=token)
