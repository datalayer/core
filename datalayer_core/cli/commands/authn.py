# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""Authentication commands for Datalayer CLI."""

import os
from typing import Optional

import typer
from rich.console import Console

from datalayer_core.client.client import DatalayerClient
from datalayer_core.displays.me import display_me
from datalayer_core.utils.urls import DEFAULT_DATALAYER_RUN_URL, DatalayerURLs

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
    method: str = typer.Option(
        "browser",
        "--method",
        help="Authentication method: browser, password, or token",
    ),
) -> None:
    """
    Login to Datalayer platform.

    Supports three authentication methods:
    - browser: OAuth via GitHub (default)
    - password: Username/email and password
    - token: Direct API token entry

    Token is stored in system keyring for reuse across CLI and VS Code.
    """
    try:
        # Use DatalayerURLs for proper URL configuration
        urls = DatalayerURLs.from_environment(run_url=run_url, iam_url=iam_url)

        # Create client without auto-discovery (we're logging in)
        client = DatalayerClient(urls=urls, auto_discover=False)

        if method == "browser":
            console.print("🌐 Opening browser for authentication...")
            profile = client.login_browser()
            user_handle = profile.get("handle_s", profile.get("handle", "unknown"))
            console.print(f"✓ Successfully logged in as [cyan]{user_handle}[/cyan]")

        elif method == "password":
            handle = typer.prompt("Username or email")
            password = typer.prompt("Password", hide_input=True)
            profile = client.login_password(handle, password)
            user_handle = profile.get("handle_s", profile.get("handle", "unknown"))
            console.print(f"✓ Successfully logged in as [cyan]{user_handle}[/cyan]")

        elif method == "token":
            token = typer.prompt("API Token", hide_input=True)
            profile = client.login_token(token)
            user_handle = profile.get("handle_s", profile.get("handle", "unknown"))
            console.print(f"✓ Successfully logged in as [cyan]{user_handle}[/cyan]")

        else:
            console.print(
                f"[red]Invalid method '{method}'. Use 'browser', 'password', or 'token'[/red]"
            )
            raise typer.Exit(1)

    except typer.Exit:
        raise
    except KeyboardInterrupt:
        console.print("\n[yellow]Login cancelled by user[/yellow]")
        raise typer.Exit(1)
    except Exception as e:
        console.print(f"[red]✗ Login failed: {str(e)}[/red]")
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
    """
    Logout from Datalayer platform.

    Clears authentication token from system keyring and environment variables.
    """
    try:
        # Use DatalayerURLs for proper URL configuration
        urls = DatalayerURLs.from_environment(run_url=run_url, iam_url=iam_url)

        # Create client (it will auto-discover token if exists)
        try:
            client = DatalayerClient(urls=urls)
        except ValueError:
            # No token found, that's fine for logout
            client = DatalayerClient(urls=urls, auto_discover=False, token="dummy")

        # Logout (clears keyring and env vars)
        client.logout()

        console.print("✓ Successfully logged out")
        console.print(f"   Cleared tokens for [green]{urls.run_url}[/green]")

    except Exception as e:
        console.print(f"[red]✗ Logout failed: {str(e)}[/red]")
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
        help="Authentication token (Bearer token for API requests).",
    ),
) -> None:
    """
    Display current user information.

    Shows information about the currently authenticated user.
    Automatically discovers token from keyring or environment variables.
    """
    try:
        # Use DatalayerURLs for proper URL configuration
        urls = DatalayerURLs.from_environment(run_url=run_url, iam_url=iam_url)

        # Create client with auto-discovery (unless token explicitly provided)
        try:
            if token:
                client = DatalayerClient(urls=urls, token=token, auto_discover=False)
            else:
                client = DatalayerClient(urls=urls)
        except ValueError as e:
            console.print("❌ [red]Not authenticated[/red]")
            console.print()
            console.print(f"[red]{str(e)}[/red]")
            console.print()
            console.print("💡 [bold yellow]Next Steps[/bold yellow]")
            console.print("   Run 'datalayer authn login' to authenticate")
            console.print("   Or set DATALAYER_API_KEY environment variable")
            raise typer.Exit(1)

        # Get user info
        profile_response = client._get_profile()
        profile = profile_response.get("profile", {})

        console.print("✅ [green]Authenticated[/green]")
        console.print()

        # Server Information
        console.print("🌐 [bold]Server Configuration[/bold]")
        console.print(f"   - RUN Server: [blue]{urls.run_url}[/blue]")
        console.print(f"   - IAM Server: [blue]{urls.iam_url}[/blue]")
        console.print()

        # Display user information
        console.print("👤 [bold]User Profile[/bold]")

        # Handle - check both camelCase and snake_case formats
        handle = profile.get("handle") or profile.get("handle_s")
        if handle:
            console.print(f"   - Handle: [cyan]{handle}[/cyan]")

        # UID - check both formats
        uid = profile.get("uid") or profile.get("uid_s")
        if uid:
            console.print(f"   - User ID: {uid}")

        # Email - check both formats
        email = profile.get("email") or profile.get("email_s")
        if email:
            console.print(f"   - Email: {email}")

        # First Name - check both formats
        first_name = (
            profile.get("firstName")
            or profile.get("firstName_s")
            or profile.get("first_name_t")
        )
        if first_name:
            console.print(f"   - First Name: {first_name}")

        # Last Name - check both formats
        last_name = (
            profile.get("lastName")
            or profile.get("lastName_s")
            or profile.get("last_name_t")
        )
        if last_name:
            console.print(f"   - Last Name: {last_name}")

        # Check for display name in various possible fields
        display_name = None
        for field in [
            "displayName",
            "displayName_s",
            "display_name_s",
            "display_name",
        ]:
            if field in profile and profile[field]:
                display_name = profile[field]
                break

        if display_name:
            console.print(f"   - Display Name: [bold]{display_name}[/bold]")
        elif first_name and last_name:
            # Fallback to combined name if no display name
            console.print(f"   - Full Name: {first_name} {last_name}")

    except typer.Exit:
        raise
    except Exception as e:
        console.print(f"[red]✗ Not authenticated: {str(e)}[/red]")
        console.print("Run 'datalayer authn login' to authenticate")
        raise typer.Exit(1)


# Add individual commands at the root level for backward compatibility
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
    method: str = typer.Option(
        "browser",
        "--method",
        help="Authentication method: browser, password, or token",
    ),
) -> None:
    """Log into a Datalayer server."""
    login(run_url=run_url, iam_url=iam_url, method=method)


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
    """Log out of Datalayer server."""
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
        help="Authentication token (Bearer token for API requests).",
    ),
) -> None:
    """Display current authenticated user profile."""
    whoami(run_url=run_url, iam_url=iam_url, token=token)
