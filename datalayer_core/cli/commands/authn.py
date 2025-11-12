# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""Authentication commands for Datalayer CLI."""

import os
import threading
import time
from typing import Optional

import questionary
import typer
from rich.console import Console

from datalayer_core.client.client import DatalayerClient
from datalayer_core.services.authn.http_server import get_token
from datalayer_core.utils.network import fetch, find_http_port
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
    no_browser: bool = typer.Option(
        False,
        "--no-browser",
        help="Use CLI-only authentication (no browser)",
    ),
) -> None:
    """Log into a Datalayer server."""
    try:
        # Use DatalayerURLs for proper URL configuration
        urls = DatalayerURLs.from_environment(run_url=run_url, iam_url=iam_url)
        server_url = urls.run_url
        access_token = token or os.environ.get("DATALAYER_API_KEY")

        if access_token:
            # Token provided, validate it
            client = DatalayerClient(urls=urls, token=access_token)
            try:
                response = client._get_profile()
                profile = response.get("profile", {})
                user_handle = profile.get("handle_s", "unknown")

                console.print(
                    f"🎉 Successfully authenticated as [cyan]{user_handle}[/cyan] on [green]{server_url}[/green]"
                )

                # Store token in keyring if available
                try:
                    import keyring

                    keyring.set_password(server_url, "access_token", access_token)
                    console.print("✅ Token saved to keyring for future use")
                except ImportError:
                    console.print("💡 Install keyring package to save tokens securely")

                return
            except Exception as e:
                console.print(f"[red]Authentication failed: {e}[/red]")
                console.print("[yellow]Please check your token and try again.[/yellow]")
                raise typer.Exit(1)

        # No token provided, check keyring
        stored_token = None
        try:
            import keyring

            stored_token = keyring.get_password(server_url, "access_token")
            if stored_token:
                console.print("🔑 Found stored token, validating...")
                client = DatalayerClient(urls=urls, token=stored_token)
                try:
                    response = client._get_profile()
                    profile = response.get("profile", {})
                    user_handle = profile.get("handle_s", "unknown")

                    console.print(
                        f"🎉 Successfully authenticated as [cyan]{user_handle}[/cyan] on [green]{server_url}[/green]"
                    )
                    return
                except Exception:
                    console.print(
                        "[yellow]Stored token is invalid, clearing...[/yellow]"
                    )
                    keyring.delete_password(server_url, "access_token")
                    stored_token = None
        except ImportError:
            pass

        # Need to authenticate - choose method
        if no_browser:
            # CLI-only authentication
            console.print("[yellow]CLI-only authentication selected[/yellow]")
            credentials = _ask_credentials()
            _authenticate_with_credentials(server_url, credentials)
        else:
            # Browser-based authentication
            console.print(
                "[yellow]No token found. Starting browser-based authentication...[/yellow]"
            )
            _authenticate_with_browser(server_url)

    except typer.Exit:
        raise
    except Exception as e:
        console.print(f"[red]Login failed: {e}[/red]")
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


def _authenticate_with_credentials(
    server_url: str, credentials: dict[str, str]
) -> None:
    """Authenticate using provided credentials."""
    credentials.pop("credentials_type", None)

    try:
        response = fetch(
            f"{server_url}/api/iam/v1/login",
            method="POST",
            json=credentials,
            timeout=5,
        )
        content = response.json()
        user_handle = content["user"]["handle_s"]
        token = content["token"]

        console.print(
            f"🎉 Successfully authenticated as [cyan]{user_handle}[/cyan] on [green]{server_url}[/green]"
        )

        # Store token in keyring
        try:
            import keyring

            keyring.set_password(server_url, "access_token", token)
            console.print("✅ Token saved to keyring for future use")
        except ImportError:
            console.print("💡 Install keyring package to save tokens securely")

    except Exception as e:
        username = credentials.get("username", credentials.get("handle", "user"))
        console.print(
            f"[red]Failed to authenticate as {username} on {server_url}[/red]"
        )
        console.print(f"[red]Error: {e}[/red]")
        raise typer.Exit(1)


def _authenticate_with_browser(server_url: str) -> None:
    """Authenticate using browser-based flow."""
    try:
        port = find_http_port()

        console.print(f"🌐 Opening browser for authentication...")
        console.print(f"🔗 URL: [cyan]http://localhost:{port}[/cyan]")
        console.print("📋 Please complete authentication in your browser")
        console.print("⌨️  Press CTRL+C to cancel")
        console.print()

        # Launch browser in separate thread
        _launch_browser(port)

        # Get token from HTTP server
        result = get_token(server_url, port)

        if result is None:
            console.print("[yellow]Authentication was cancelled or failed[/yellow]")
            raise typer.Exit(1)

        user_handle, token = result
        console.print(
            f"🎉 Successfully authenticated as [cyan]{user_handle}[/cyan] on [green]{server_url}[/green]"
        )

        # Store token in keyring
        try:
            import keyring

            keyring.set_password(server_url, "access_token", token)
            console.print("✅ Token saved to keyring for future use")
        except ImportError:
            console.print("💡 Install keyring package to save tokens securely")

    except KeyboardInterrupt:
        console.print("\n[yellow]Authentication cancelled by user[/yellow]")
        raise typer.Exit(1)
    except Exception as e:
        console.print(f"[red]Browser authentication failed: {e}[/red]")
        raise typer.Exit(1)


def _launch_browser(port: int) -> None:
    """Launch browser in separate thread."""

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
    """Log out of Datalayer server."""
    try:
        # Use DatalayerURLs for proper URL configuration
        urls = DatalayerURLs.from_environment(run_url=run_url, iam_url=iam_url)
        server_url = urls.run_url

        # Clear environment variables if they exist
        tokens_cleared = []

        if "DATALAYER_API_KEY" in os.environ:
            del os.environ["DATALAYER_API_KEY"]
            tokens_cleared.append("DATALAYER_API_KEY")

        if "DATALAYER_EXTERNAL_TOKEN" in os.environ:
            del os.environ["DATALAYER_EXTERNAL_TOKEN"]
            tokens_cleared.append("DATALAYER_EXTERNAL_TOKEN")

        # Clear stored tokens from keyring
        keyring_cleared = False
        try:
            import keyring

            if keyring.get_password(server_url, "access_token"):
                keyring.delete_password(server_url, "access_token")
                keyring_cleared = True
        except ImportError:
            pass
        except Exception as e:
            console.print(
                f"[yellow]Warning: Could not clear keyring token: {e}[/yellow]"
            )

        # Show logout status
        if tokens_cleared or keyring_cleared:
            console.print("✅ Successfully logged out")
            if tokens_cleared:
                console.print(
                    f"   - Cleared environment variables: {', '.join(tokens_cleared)}"
                )
            if keyring_cleared:
                console.print(f"   - Cleared stored token for {server_url}")
        else:
            console.print("ℹ️  No authentication tokens found to clear")

        console.print(f"👋 Logged out from [green]{server_url}[/green]")

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
        help="Authentication token (Bearer token for API requests).",
    ),
) -> None:
    """Display current authentication status."""
    try:
        # Use DatalayerURLs for proper URL configuration
        urls = DatalayerURLs.from_environment(run_url=run_url, iam_url=iam_url)
        server_url = urls.run_url

        # Check for tokens from various sources
        resolved_token = token  # Start with explicitly provided token
        token_source = None

        if resolved_token:
            token_source = "--token option"
        else:
            # Check environment variables
            if os.environ.get("DATALAYER_API_KEY"):
                resolved_token = os.environ["DATALAYER_API_KEY"]
                token_source = "DATALAYER_API_KEY environment variable"
            elif os.environ.get("DATALAYER_EXTERNAL_TOKEN"):
                resolved_token = os.environ["DATALAYER_EXTERNAL_TOKEN"]
                token_source = "DATALAYER_EXTERNAL_TOKEN environment variable"
            else:
                # Check keyring
                try:
                    import keyring

                    stored_token = keyring.get_password(server_url, "access_token")
                    if stored_token:
                        resolved_token = stored_token
                        token_source = f"Stored token for {server_url}"
                except ImportError:
                    pass
                except Exception:
                    pass

        if resolved_token:
            # Validate token by making an API call to the server
            try:
                client = DatalayerClient(urls=urls, token=resolved_token)
                console.print("🔍 Validating token with server...")
                response = client._get_profile()
                profile = response.get("profile", {})

                console.print("✅ [green]Authenticated[/green]")
                console.print()

                # Server Information
                console.print("🌐 [bold]Server Configuration[/bold]")
                console.print(f"   - RUN Server: [blue]{server_url}[/blue]")
                console.print(f"   - IAM Server: [blue]{urls.iam_url}[/blue]")
                console.print(f"   - Token source: {token_source}")
                console.print()

                # Display server-verified user information
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

                # Internal ID
                if "id" in profile:
                    console.print(f"   - Internal ID: {profile['id']}")

                # User type - check both formats
                user_type = profile.get("type") or profile.get("type_s")
                if user_type:
                    console.print(f"   - User Type: [magenta]{user_type}[/magenta]")

                # Origin - check both formats
                origin = profile.get("origin") or profile.get("origin_s")
                if origin:
                    console.print(f"   - Origin: {origin}")

                # Timestamps
                timestamp_fields = [
                    ("creation_ts_dt", "Account Created"),
                    ("join_request_ts_dt", "Join Requested"),
                    ("join_ts_dt", "Joined"),
                    ("last_update_ts_dt", "Last Updated"),
                ]
                for field, label in timestamp_fields:
                    if field in profile and profile[field]:
                        console.print(f"   - {label}: {profile[field]}")

                console.print()

                # Roles and Permissions - check both formats
                roles = profile.get("roles") or profile.get("roles_ss") or []
                if isinstance(roles, list):
                    console.print("🔐 [bold]Roles & Permissions[/bold]")
                    if roles:
                        for role in roles:
                            console.print(f"   • [cyan]{role}[/cyan]")
                    else:
                        console.print("   - No roles assigned")
                    console.print()

                # Also decode JWT token to show expiration and additional info
                try:
                    import base64
                    import datetime
                    import json

                    # JWT tokens have 3 parts separated by dots
                    parts = resolved_token.split(".")
                    if len(parts) >= 3:
                        console.print("🔑 [bold]Token Information[/bold]")

                        # Decode the header (first part)
                        header_b64 = parts[0]
                        header_b64 += "=" * (4 - len(header_b64) % 4)
                        header = json.loads(base64.b64decode(header_b64))

                        if "typ" in header:
                            console.print(f"   - Token Type: {header['typ']}")
                        if "alg" in header:
                            console.print(f"   - Algorithm: {header['alg']}")

                        # Decode the payload (second part)
                        payload_b64 = parts[1]
                        payload_b64 += "=" * (4 - len(payload_b64) % 4)
                        payload = json.loads(base64.b64decode(payload_b64))

                        if "iss" in payload:
                            console.print(f"   - Issued by: {payload['iss']}")
                        if "aud" in payload:
                            audience = payload["aud"]
                            if isinstance(audience, list):
                                console.print(f"   - Audience: {', '.join(audience)}")
                            else:
                                console.print(f"   - Audience: {audience}")
                        if "iat" in payload:
                            issued_date = datetime.datetime.fromtimestamp(
                                payload["iat"]
                            )
                            console.print(f"   - Issued at: {issued_date}")
                        if "exp" in payload:
                            exp_date = datetime.datetime.fromtimestamp(payload["exp"])
                            now = datetime.datetime.now()
                            if exp_date > now:
                                time_left = exp_date - now
                                console.print(
                                    f"   - Expires: {exp_date} ([green]in {time_left}[/green])"
                                )
                            else:
                                console.print(
                                    f"   - Expires: {exp_date} ([red]EXPIRED[/red])"
                                )
                        if "jti" in payload:
                            console.print(f"   - Token ID: {payload['jti']}")

                        # Show token scope if available
                        if "scope" in payload:
                            scopes = payload["scope"]
                            if isinstance(scopes, str):
                                scopes = scopes.split()
                            console.print(f"   - Scopes: {', '.join(scopes)}")

                        console.print()

                except Exception:
                    # JWT decoding failed, skip detailed token info
                    pass

            except Exception as api_error:
                # Token exists but API call failed - show token info but indicate validation failure
                console.print("⚠️  [yellow]Token found but validation failed[/yellow]")
                console.print()
                console.print("🌐 [bold]Server Configuration[/bold]")
                console.print(f"   - Server: [blue]{server_url}[/blue]")
                console.print(f"   - IAM Server: [blue]{urls.iam_url}[/blue]")
                console.print(f"   - Token source: {token_source}")
                console.print(f"   - Validation error: [red]{str(api_error)}[/red]")
                console.print()

                # Still try to decode JWT token for local information
                try:
                    import base64
                    import json

                    # JWT tokens have 3 parts separated by dots
                    parts = resolved_token.split(".")
                    if len(parts) >= 2:
                        # Decode the payload (second part)
                        payload_b64 = parts[1]
                        # Add padding if needed
                        payload_b64 += "=" * (4 - len(payload_b64) % 4)
                        payload = json.loads(base64.b64decode(payload_b64))

                        # Extract user info from the JWT payload
                        if "sub" in payload:
                            user_info = payload["sub"]
                            if isinstance(user_info, dict):
                                # User info is embedded in the sub field
                                if "handle" in user_info:
                                    console.print(
                                        f"   - Handle (from token): {user_info['handle']}"
                                    )
                                if "email" in user_info:
                                    console.print(
                                        f"   - Email (from token): {user_info['email']}"
                                    )
                                if "firstName" in user_info and "lastName" in user_info:
                                    console.print(
                                        f"   - Name (from token): {user_info['firstName']} {user_info['lastName']}"
                                    )
                                if "uid" in user_info:
                                    console.print(
                                        f"   - UID (from token): {user_info['uid']}"
                                    )
                                if "roles" in user_info and isinstance(
                                    user_info["roles"], list
                                ):
                                    console.print("   - Roles (from token):")
                                    for role in user_info["roles"]:
                                        console.print(f"     • [cyan]{role}[/cyan]")
                            else:
                                console.print(f"   - User ID (from token): {user_info}")

                        if "exp" in payload:
                            import datetime

                            exp_date = datetime.datetime.fromtimestamp(payload["exp"])
                            console.print(f"   - Expires (from token): {exp_date}")

                except Exception:
                    # Token might not be JWT or might be malformed
                    console.print(
                        f"   - Token: {resolved_token[:20]}..."
                        if resolved_token and len(resolved_token) > 20
                        else f"   - Token: {resolved_token}"
                    )
        else:
            console.print("❌ [red]Not authenticated[/red]")
            console.print()
            console.print("🌐 [bold]Server Configuration[/bold]")
            console.print(f"   - RUN Server: [blue]{server_url}[/blue]")
            console.print(f"   - IAM Server: [blue]{urls.iam_url}[/blue]")
            console.print()
            console.print("🔍 [bold]Token Search Results[/bold]")
            console.print("   - DATALAYER_API_KEY: Not found")
            console.print("   - DATALAYER_EXTERNAL_TOKEN: Not found")
            console.print(f"   - Keyring ({server_url}): Not found")
            console.print()
            console.print("💡 [bold yellow]Next Steps[/bold yellow]")
            console.print("   Run 'datalayer login' to authenticate")
            console.print("   Or set DATALAYER_API_KEY environment variable")

    except Exception as e:
        console.print(f"[red]Failed to check authentication status: {e}[/red]")
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
    token: Optional[str] = typer.Option(
        None,
        "--token",
        help="User access token",
    ),
    no_browser: bool = typer.Option(
        False,
        "--no-browser",
        help="Use CLI-only authentication (no browser)",
    ),
) -> None:
    """Log into a Datalayer server."""
    login(run_url=run_url, iam_url=iam_url, token=token, no_browser=no_browser)


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
