# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""Authentication commands for Datalayer CLI - Refactored to use SDK."""

import asyncio
import os
import threading
import time
from typing import Optional

import questionary
import typer
from rich.console import Console

from datalayer_core.sdk.auth import AuthenticationManager
from datalayer_core.services.authn.http_server import get_token
from datalayer_core.utils.network import find_http_port
from datalayer_core.utils.urls import DatalayerURLs

# Create a Typer app for auth commands
app = typer.Typer(name="auth", help="Authentication commands")

console = Console()


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
    Log into a Datalayer server using SDK authentication.

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

        # Initialize SDK authentication manager
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
    """Login using token via SDK."""
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
    """Login using handle/password via SDK."""
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
            "validate": lambda x: True
            if len(x) >= 8
            else "Password must have at least 8 characters",
        },
        {
            "type": "password",
            "name": "token",
            "message": "Token:",
            "when": lambda x: x["credentials_type"] == "token",
            "validate": lambda x: True
            if len(x) >= 8
            else "Token must have at least 8 characters",
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
    TODO: Integrate with SDK BrowserAuthStrategy when implemented.
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

        # Store token using SDK
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
                
                # IAM Providers
                iam_providers = user.get("iam_providers", [])
                if iam_providers:
                    console.print("\n[bold]Connected Accounts:[/bold]")
                    for provider in iam_providers:
                        provider_name = provider.get("iam_provider_name_s", "unknown")
                        linked_id = provider.get("linked_account_id_s", "")
                        linked_url = provider.get("linked_account_url_s", "")
                        
                        if linked_url:
                            console.print(f"  🔗 {provider_name.capitalize()}: {linked_url}")
                        elif linked_id:
                            console.print(f"  🔗 {provider_name.capitalize()}: ID {linked_id}")
                        else:
                            console.print(f"  🔗 {provider_name.capitalize()}")
                
                # Customer UID
                if user.get("credits_customer_uid"):
                    console.print(f"\n💳 Credits Customer: {user.get('credits_customer_uid')}")
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
    details: bool = typer.Option(
        False,
        "--details",
        help="Show detailed user information",
    ),
) -> None:
    """
    Show current authenticated user.
    """
    whoami(run_url=run_url, iam_url=iam_url, details=details)
