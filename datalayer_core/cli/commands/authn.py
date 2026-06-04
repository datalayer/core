# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""Authentication commands for Datalayer CLI - Refactored to use Client."""

import asyncio
import base64
import json
import os
import threading
import time
from datetime import datetime, timezone
from typing import Optional, Any

import questionary
import requests
import typer
from rich.console import Console

from datalayer_core.authn import AuthenticationManager
from datalayer_core.authn.server.http_server import get_token
from datalayer_core.utils.network import find_http_port
from datalayer_core.utils.urls import DatalayerURLs

# Create a Typer app for auth commands
app = typer.Typer(
    name="auth", help="Authentication commands", invoke_without_command=True
)

console = Console()


@app.callback()
def auth_callback(ctx: typer.Context) -> None:
    """Authentication commands."""
    if ctx.invoked_subcommand is None:
        typer.echo(ctx.get_help())


def _fetch_memberships(iam_url: str, token: Optional[str]) -> Optional[list[dict]]:
    """Fetch the authenticated user's organization/team memberships."""
    if not token:
        return None
    try:
        response = requests.get(
            f"{iam_url}/api/iam/v1/memberships",
            headers={"Authorization": f"Bearer {token}"},
            timeout=10,
        )
        if response.status_code != 200:
            return None
        data = response.json()
        if not data.get("success", True):
            return None
        return data.get("memberships") or []
    except Exception:
        return None


def _decode_jwt_claims(token: str) -> Optional[dict]:
    """Decode JWT claims without verifying signature (display purpose only)."""
    try:
        parts = token.split(".")
        if len(parts) < 2:
            return None
        payload = parts[1]
        padding = "=" * (-len(payload) % 4)
        decoded = base64.urlsafe_b64decode(payload + padding)
        claims = json.loads(decoded.decode("utf-8"))
        return claims if isinstance(claims, dict) else None
    except Exception:
        return None


def _coerce_unix_timestamp(value: Any) -> Optional[int]:
    try:
        if value is None:
            return None
        if isinstance(value, bool):
            return None
        if isinstance(value, (int, float)):
            return int(value)
        if isinstance(value, str):
            return int(float(value.strip()))
    except Exception:
        return None
    return None


def _format_unix_timestamp(ts: Optional[int]) -> str:
    if ts is None:
        return "unknown"
    try:
        return datetime.fromtimestamp(ts, tz=timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    except Exception:
        return "unknown"


def _format_duration(seconds: int) -> str:
    seconds = max(0, seconds)
    days, remainder = divmod(seconds, 86400)
    hours, remainder = divmod(remainder, 3600)
    minutes, _ = divmod(remainder, 60)
    chunks = []
    if days:
        chunks.append(f"{days}d")
    if hours:
        chunks.append(f"{hours}h")
    if minutes or not chunks:
        chunks.append(f"{minutes}m")
    return " ".join(chunks)


def _expiration_status(exp_ts: Optional[int]) -> str:
    if exp_ts is None:
        return "[red]unknown[/red]"

    now = int(time.time())
    remaining = exp_ts - now
    if remaining <= 0:
        return f"[red]expired { _format_duration(abs(remaining)) } ago[/red]"
    if remaining <= 900:
        return f"[red]{_format_duration(remaining)} remaining[/red]"
    if remaining <= 86400:
        return f"[yellow]{_format_duration(remaining)} remaining[/yellow]"
    return f"[green]{_format_duration(remaining)} remaining[/green]"


@app.command()
def login(
    run_url: Optional[str] = typer.Option(
        None,
        "--run-url",
        help="Datalayer server URL",
    ),
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
    handle: Optional[str] = typer.Option(
        None,
        "--handle",
        help="Username for credentials authentication",
    ),
    password: Optional[str] = typer.Option(
        None,
        "--password",
        help="Password for credentials authentication",
    ),
    no_browser: bool = typer.Option(
        False,
        "--no-browser",
        help="Use CLI-only authentication (no browser)",
    ),
) -> None:
    """
    Log into a Datalayer server using Client authentication.

    Examples
    --------
    Token authentication::

        datalayer login --token YOUR_TOKEN

    Credentials authentication::

        datalayer login --handle user@example.com --password secret

    Browser OAuth (default)::

        datalayer login

    CLI-only mode::

        datalayer login --no-browser
    """
    try:
        # Use DatalayerURLs for proper URL configuration
        urls = DatalayerURLs.from_environment(run_url=run_url, iam_url=iam_url)

        # Initialize Client authentication manager
        auth = AuthenticationManager(urls.iam_url)

        # Determine authentication method
        access_token = token or os.environ.get("DATALAYER_API_KEY")

        if access_token:
            # Token-based authentication
            console.print("🔑 Authenticating with provided token...")
            asyncio.run(_login_with_token(auth, access_token, urls.run_url))

        elif handle and password:
            # Credentials-based authentication
            console.print(f"👤 Authenticating as {handle}...")
            asyncio.run(_login_with_credentials(auth, handle, password, urls.run_url))

        else:
            # Try stored token first
            stored_token = auth.get_stored_token()
            if stored_token:
                console.print("🔑 Found stored token, validating...")
                try:
                    asyncio.run(_login_with_token(auth, stored_token, urls.run_url))
                    return
                except Exception:
                    console.print(
                        "[yellow]Stored token is invalid, clearing...[/yellow]"
                    )
                    auth.clear_stored_token()

            # Need interactive authentication
            if no_browser:
                # CLI-only mode - ask for credentials
                console.print("[yellow]CLI-only authentication selected[/yellow]")
                credentials = _ask_credentials()

                if credentials.get("credentials_type") == "token":
                    asyncio.run(
                        _login_with_token(auth, credentials["token"], urls.run_url)
                    )
                else:
                    asyncio.run(
                        _login_with_credentials(
                            auth,
                            credentials["handle"],
                            credentials["password"],
                            urls.run_url,
                        )
                    )
            else:
                # Browser-based OAuth
                console.print(
                    "[yellow]No token found. Starting browser-based authentication...[/yellow]"
                )
                _authenticate_with_browser(auth, urls.run_url)

    except typer.Exit:
        raise
    except Exception as e:
        console.print(f"[red]Login failed: {e}[/red]")
        raise typer.Exit(1)


async def _login_with_token(
    auth: AuthenticationManager, token: str, server_url: str
) -> None:
    """Login using token via Client."""
    try:
        user, _ = await auth.login(token=token)
        user_handle = user.get("handle_s", user.get("handle", "unknown"))

        console.print(
            f"🎉 Successfully authenticated as [cyan]{user_handle}[/cyan] on [green]{server_url}[/green]"
        )
        console.print("✅ Token saved for future use")

    except Exception as e:
        console.print(f"[red]Authentication failed: {e}[/red]")
        console.print("[yellow]Please check your token and try again.[/yellow]")
        raise typer.Exit(1)


async def _login_with_credentials(
    auth: AuthenticationManager, handle: str, password: str, server_url: str
) -> None:
    """Login using handle/password via Client."""
    try:
        user, _ = await auth.login(handle=handle, password=password)
        user_handle = user.get("handle_s", user.get("handle", "unknown"))

        console.print(
            f"🎉 Successfully authenticated as [cyan]{user_handle}[/cyan] on [green]{server_url}[/green]"
        )
        console.print("✅ Token saved for future use")

    except Exception as e:
        console.print(f"[red]Failed to authenticate as {handle} on {server_url}[/red]")
        console.print(f"[red]Error: {e}[/red]")
        raise typer.Exit(1)


def _ask_credentials() -> dict[str, str]:
    """Ask user for login credentials via CLI."""
    questions = [
        {
            "type": "select",
            "name": "credentials_type",
            "message": "How do you want to log in?",
            "choices": [
                {"name": "Username/Password", "value": "password"},
                {"name": "Token", "value": "token"},
            ],
        },
        {
            "type": "text",
            "name": "handle",
            "message": "Username:",
            "when": lambda x: x["credentials_type"] == "password",
            "validate": lambda x: True if len(x) > 0 else "Please enter a username",
        },
        {
            "type": "password",
            "name": "password",
            "message": "Password:",
            "when": lambda x: x["credentials_type"] == "password",
            "validate": lambda x: (
                True if len(x) >= 8 else "Password must have at least 8 characters"
            ),
        },
        {
            "type": "password",
            "name": "token",
            "message": "Token:",
            "when": lambda x: x["credentials_type"] == "token",
            "validate": lambda x: (
                True if len(x) >= 8 else "Token must have at least 8 characters"
            ),
        },
    ]
    return questionary.prompt(questions)


def _launch_browser(port: int) -> None:
    """
    Launch browser in separate thread.
    """

    def target() -> None:
        try:
            import webbrowser

            time.sleep(1)  # Allow server to start
            browser = webbrowser.get()
            if browser:
                browser.open(f"http://localhost:{port}/datalayer/login/cli")
            else:
                console.print(
                    "[yellow]No web browser found. Please manually open:[/yellow]"
                )
                console.print(
                    f"[cyan]http://localhost:{port}/datalayer/login/cli[/cyan]"
                )
        except Exception as e:
            console.print(f"[yellow]Could not launch browser: {e}[/yellow]")
            console.print(
                f"[yellow]Please manually open: http://localhost:{port}/datalayer/login/cli[/yellow]"
            )

    threading.Thread(target=target, daemon=True).start()


def _authenticate_with_browser(auth: AuthenticationManager, server_url: str) -> None:
    """
    Authenticate using browser-based flow.

    Note: This still uses the old HTTP server for OAuth callback.
    TODO: Integrate with Client BrowserAuthStrategy when implemented.
    """
    try:
        port = find_http_port()

        console.print("🌐 Opening browser for authentication...")
        console.print(f"🔗 URL: [cyan]http://localhost:{port}[/cyan]")
        console.print("📋 Please complete authentication in your browser")
        console.print("⌨️  Press CTRL+C to cancel")
        console.print()

        # Launch browser
        _launch_browser(port)

        # Get token from HTTP server
        result = get_token(server_url, port)

        if result is None:
            console.print("[yellow]Authentication was cancelled or failed[/yellow]")
            raise typer.Exit(1)

        user_handle, token = result

        # Store token using Client
        auth.store_token(token)

        console.print(
            f"🎉 Successfully authenticated as [cyan]{user_handle}[/cyan] on [green]{server_url}[/green]"
        )
        console.print("✅ Token saved for future use")

    except KeyboardInterrupt:
        console.print("\n[yellow]Authentication cancelled by user[/yellow]")
        raise typer.Exit(1)
    except Exception as e:
        console.print(f"[red]Browser authentication failed: {e}[/red]")
        raise typer.Exit(1)


@app.command()
def logout(
    run_url: Optional[str] = typer.Option(
        None,
        "--run-url",
        help="Datalayer server URL",
    ),
    iam_url: Optional[str] = typer.Option(
        None,
        "--iam-url",
        help="Datalayer IAM server URL",
    ),
) -> None:
    """Log out from Datalayer server."""
    try:
        urls = DatalayerURLs.from_environment(run_url=run_url, iam_url=iam_url)
        auth = AuthenticationManager(urls.iam_url)

        asyncio.run(auth.logout())

        console.print(f"👋 Logged out from [green]{urls.run_url}[/green]")
        console.print("✅ Stored token cleared")

    except Exception as e:
        console.print(f"[red]Logout failed: {e}[/red]")
        raise typer.Exit(1)


@app.command()
def whoami(
    run_url: Optional[str] = typer.Option(
        None,
        "--run-url",
        help="Datalayer server URL",
    ),
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
    details: bool = typer.Option(
        False,
        "--details",
        help="Show detailed user information",
    ),
) -> None:
    """Show current authenticated user."""
    try:
        urls = DatalayerURLs.from_environment(run_url=run_url, iam_url=iam_url)
        auth = AuthenticationManager(urls.iam_url)

        # If token provided, store it temporarily for whoami
        access_token = token or os.environ.get("DATALAYER_API_KEY")
        if access_token:
            auth.store_token(access_token)

        user = asyncio.run(auth.whoami())

        if user:
            handle = user.get("handle_s", user.get("handle", "unknown"))
            email = user.get("email_s", user.get("email", ""))

            console.print(f"👤 User: [cyan]{handle}[/cyan]")
            if email:
                console.print(f"📧 Email: {email}")
            console.print(f"🌐 Server: [green]{urls.run_url}[/green]")

            if details:
                console.print("\n[bold]Detailed Information:[/bold]")

                # Full name
                first_name = user.get("first_name_t", "")
                last_name = user.get("last_name_t", "")
                if first_name or last_name:
                    console.print(f"📝 Name: {first_name} {last_name}".strip())

                # User IDs
                if user.get("uid"):
                    console.print(f"🆔 UID: {user.get('uid')}")
                if user.get("id"):
                    console.print(f"🔑 ID: {user.get('id')}")

                # Roles
                roles = user.get("roles_ss", [])
                if roles:
                    console.print(f"🎭 Roles: {', '.join(roles)}")

                # Avatar
                if user.get("avatar_url_s"):
                    console.print(f"🖼️  Avatar: {user.get('avatar_url_s')}")

                # Timestamps
                if user.get("creation_ts_dt"):
                    console.print(f"📅 Created: {user.get('creation_ts_dt')}")
                if user.get("last_update_ts_dt"):
                    console.print(f"🔄 Last Updated: {user.get('last_update_ts_dt')}")

                # JWT token details
                token_for_details = access_token or auth.current_token or auth.get_stored_token()
                if token_for_details:
                    claims = _decode_jwt_claims(token_for_details)
                    if claims:
                        subject = claims.get("sub")
                        if isinstance(subject, dict):
                            subject = subject.get("uid") or subject
                        exp_ts = _coerce_unix_timestamp(claims.get("exp"))
                        iat_ts = _coerce_unix_timestamp(claims.get("iat"))

                        console.print("\n[bold]JWT Token:[/bold]")
                        if claims.get("jti"):
                            console.print(f"  🪪 JTI: {claims.get('jti')}")
                        if subject is not None:
                            console.print(f"  👤 Subject: {subject}")
                        if claims.get("iss"):
                            console.print(f"  🏷️  Issuer: {claims.get('iss')}")
                        if iat_ts is not None:
                            console.print(f"  🕒 Issued At: {_format_unix_timestamp(iat_ts)}")
                        if exp_ts is not None:
                            console.print(f"  ⏰ Expires At: {_format_unix_timestamp(exp_ts)}")
                        console.print(f"  ⌛ Time to Expiration: {_expiration_status(exp_ts)}")

                # IAM Providers
                iam_providers = user.get("iam_providers", [])
                if iam_providers:
                    console.print("\n[bold]Connected Accounts:[/bold]")
                    for provider in iam_providers:
                        provider_name = provider.get("iam_provider_name_s", "unknown")
                        linked_id = provider.get("linked_account_id_s", "")
                        linked_url = provider.get("linked_account_url_s", "")

                        if linked_url:
                            console.print(
                                f"  🔗 {provider_name.capitalize()}: {linked_url}"
                            )
                        elif linked_id:
                            console.print(
                                f"  🔗 {provider_name.capitalize()}: ID {linked_id}"
                            )
                        else:
                            console.print(f"  🔗 {provider_name.capitalize()}")

                # Customer UID
                if user.get("stripe_customer_id_s"):
                    console.print(
                        f"\n💳 Credits Customer: {user.get('stripe_customer_id_s')}"
                    )

                # Memberships (organizations + teams)
                memberships = _fetch_memberships(urls.iam_url, access_token)
                if memberships is not None:
                    orgs = [m for m in memberships if (m.get("type") or "").lower() == "organization"]
                    teams = [m for m in memberships if (m.get("type") or "").lower() == "team"]
                    org_by_uid = {m.get("uid"): m for m in orgs}

                    if orgs:
                        console.print("\n[bold]🏢 Organizations:[/bold]")
                        for org in orgs:
                            handle = org.get("handle") or org.get("uid") or "unknown"
                            name = org.get("name") or ""
                            roles = ", ".join(org.get("roles_ss") or []) or "-"
                            label = f"  • [cyan]{handle}[/cyan]"
                            if name and name != handle:
                                label += f" ({name})"
                            label += f"  uid={org.get('uid')}  roles={roles}"
                            console.print(label)

                    if teams:
                        console.print("\n[bold]👥 Teams:[/bold]")
                        for team in teams:
                            handle = team.get("handle") or team.get("uid") or "unknown"
                            name = team.get("name") or ""
                            roles = ", ".join(team.get("roles_ss") or []) or "-"
                            org_uid = team.get("organization_uid")
                            parent = org_by_uid.get(org_uid) if org_uid else None
                            parent_label = (
                                parent.get("handle") if parent else (org_uid or "unknown")
                            )
                            label = f"  • [cyan]{handle}[/cyan]"
                            if name and name != handle:
                                label += f" ({name})"
                            label += f"  in [magenta]{parent_label}[/magenta]"
                            label += f"  uid={team.get('uid')}  roles={roles}"
                            console.print(label)

                    if not orgs and not teams:
                        console.print("\n[dim]No organization or team memberships.[/dim]")
        else:
            console.print("[yellow]Not authenticated[/yellow]")
            console.print("Run 'datalayer login' to authenticate")

    except Exception as e:
        console.print(f"[red]Failed to get user info: {e}[/red]")
        raise typer.Exit(1)


# Root-level commands for backward compatibility with main CLI
def login_root(
    run_url: Optional[str] = typer.Option(
        None,
        "--run-url",
        help="Datalayer server URL",
    ),
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
    handle: Optional[str] = typer.Option(
        None,
        "--handle",
        help="Username for credentials authentication",
    ),
    password: Optional[str] = typer.Option(
        None,
        "--password",
        help="Password for credentials authentication",
    ),
    no_browser: bool = typer.Option(
        False,
        "--no-browser",
        help="Use CLI-only authentication (no browser)",
    ),
) -> None:
    """
    Log into a Datalayer server.
    """
    login(
        run_url=run_url,
        iam_url=iam_url,
        token=token,
        handle=handle,
        password=password,
        no_browser=no_browser,
    )


def logout_root(
    run_url: Optional[str] = typer.Option(
        None,
        "--run-url",
        help="Datalayer server URL",
    ),
    iam_url: Optional[str] = typer.Option(
        None,
        "--iam-url",
        help="Datalayer IAM server URL",
    ),
) -> None:
    """
    Log out of Datalayer server.
    """
    logout(run_url=run_url, iam_url=iam_url)


def whoami_root(
    run_url: Optional[str] = typer.Option(
        None,
        "--run-url",
        help="Datalayer server URL",
    ),
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
    details: bool = typer.Option(
        False,
        "--details",
        help="Show detailed user information",
    ),
) -> None:
    """
    Show current authenticated user.
    """
    whoami(run_url=run_url, iam_url=iam_url, token=token, details=details)
