# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""Authentication commands for Datalayer CLI."""

import os
import threading
import time
import warnings
from typing import Optional

import questionary
import typer
from rich.console import Console

from datalayer_core.client.client import DatalayerClient
from datalayer_core.displays.me import display_me
from datalayer_core.services.authn.http_server import get_token
from datalayer_core.utils.defaults import DEFAULT_RUN_URL
from datalayer_core.utils.network import fetch, find_http_port

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
        # Use provided values or defaults
        server_url = run_url or os.environ.get("DATALAYER_RUN_URL", DEFAULT_RUN_URL)
        access_token = token or os.environ.get("DATALAYER_API_KEY")
        
        if access_token:
            # Token provided, validate it
            client = DatalayerClient(run_url=server_url, token=access_token)
            try:
                response = client._get_profile()
                profile = response.get("profile", {})
                user_handle = profile.get("handle_s", "unknown")
                
                console.print(f"🎉 Successfully authenticated as [cyan]{user_handle}[/cyan] on [green]{server_url}[/green]")
                
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
                client = DatalayerClient(run_url=server_url, token=stored_token)
                try:
                    response = client._get_profile()
                    profile = response.get("profile", {})
                    user_handle = profile.get("handle_s", "unknown")
                    
                    console.print(f"🎉 Successfully authenticated as [cyan]{user_handle}[/cyan] on [green]{server_url}[/green]")
                    return
                except Exception:
                    console.print("[yellow]Stored token is invalid, clearing...[/yellow]")
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
            console.print("[yellow]No token found. Starting browser-based authentication...[/yellow]")
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


def _authenticate_with_credentials(server_url: str, credentials: dict[str, str]) -> None:
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
        
        console.print(f"🎉 Successfully authenticated as [cyan]{user_handle}[/cyan] on [green]{server_url}[/green]")
        
        # Store token in keyring
        try:
            import keyring
            keyring.set_password(server_url, "access_token", token)
            console.print("✅ Token saved to keyring for future use")
        except ImportError:
            console.print("💡 Install keyring package to save tokens securely")
            
    except Exception as e:
        username = credentials.get("username", credentials.get("handle", "user"))
        console.print(f"[red]Failed to authenticate as {username} on {server_url}[/red]")
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
        console.print(f"🎉 Successfully authenticated as [cyan]{user_handle}[/cyan] on [green]{server_url}[/green]")
        
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
                console.print("[yellow]No web browser found. Please manually open:[/yellow]")
                console.print(f"[cyan]http://localhost:{port}/datalayer/login/cli[/cyan]")
        except Exception as e:
            console.print(f"[yellow]Could not launch browser: {e}[/yellow]")
            console.print(f"[yellow]Please manually open: http://localhost:{port}/datalayer/login/cli[/yellow]")
    
    threading.Thread(target=target, daemon=True).start()


@app.command()
def logout(
    run_url: Optional[str] = typer.Option(
        None,
        "--run-url", 
        help="Datalayer server URL",
    ),
) -> None:
    """Log out of Datalayer server."""
    try:
        server_url = run_url or os.environ.get("DATALAYER_RUN_URL", DEFAULT_RUN_URL)
        
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
            console.print(f"[yellow]Warning: Could not clear keyring token: {e}[/yellow]")
            
        # Show logout status
        if tokens_cleared or keyring_cleared:
            console.print("✅ Successfully logged out")
            if tokens_cleared:
                console.print(f"   - Cleared environment variables: {', '.join(tokens_cleared)}")
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
) -> None:
    """Display current authentication status."""
    try:
        server_url = run_url or os.environ.get("DATALAYER_RUN_URL", DEFAULT_RUN_URL)
        
        # Check for tokens from various sources
        token = None
        token_source = None
        
        # Check environment variables
        if os.environ.get("DATALAYER_API_KEY"):
            token = os.environ["DATALAYER_API_KEY"]
            token_source = "DATALAYER_API_KEY environment variable"
        elif os.environ.get("DATALAYER_EXTERNAL_TOKEN"):
            token = os.environ["DATALAYER_EXTERNAL_TOKEN"]
            token_source = "DATALAYER_EXTERNAL_TOKEN environment variable"
        else:
            # Check keyring
            try:
                import keyring
                stored_token = keyring.get_password(server_url, "access_token")
                if stored_token:
                    token = stored_token
                    token_source = f"Stored token for {server_url}"
            except ImportError:
                pass
            except Exception:
                pass
                
        if token:
            console.print("✅ [green]Authenticated[/green]")
            console.print(f"   - Server: [blue]{server_url}[/blue]")
            console.print(f"   - Token source: {token_source}")
            
            # Try to decode JWT token to show user info (basic decode, no verification)
            try:
                import base64
                import json
                
                # JWT tokens have 3 parts separated by dots
                parts = token.split('.')
                if len(parts) >= 2:
                    # Decode the payload (second part)
                    payload_b64 = parts[1]
                    # Add padding if needed
                    payload_b64 += '=' * (4 - len(payload_b64) % 4)
                    payload = json.loads(base64.b64decode(payload_b64))
                    
                    # Extract user info from the JWT payload
                    if 'sub' in payload:
                        user_info = payload['sub']
                        if isinstance(user_info, dict):
                            # User info is embedded in the sub field
                            if 'handle' in user_info:
                                console.print(f"   - Handle: {user_info['handle']}")
                            if 'email' in user_info:
                                console.print(f"   - Email: {user_info['email']}")
                            if 'firstName' in user_info and 'lastName' in user_info:
                                console.print(f"   - Name: {user_info['firstName']} {user_info['lastName']}")
                            if 'uid' in user_info:
                                console.print(f"   - UID: {user_info['uid']}")
                            if 'roles' in user_info and isinstance(user_info['roles'], list):
                                console.print("   - Roles:")
                                for role in user_info['roles']:
                                    console.print(f"     • [cyan]{role}[/cyan]")
                        else:
                            console.print(f"   - User ID: {user_info}")
                    
                    if 'exp' in payload:
                        import datetime
                        exp_date = datetime.datetime.fromtimestamp(payload['exp'])
                        console.print(f"   - Expires: {exp_date}")
                        
            except Exception:
                # Token might not be JWT or might be malformed
                console.print(f"   - Token: {token[:20]}..." if len(token) > 20 else f"   - Token: {token}")
        else:
            console.print("❌ [red]Not authenticated[/red]")
            console.print(f"   - Server: [blue]{server_url}[/blue]")
            console.print(f"   - No tokens found in environment or keyring")
            console.print(f"💡 Run 'datalayer login' to authenticate")
        
    except Exception as e:
        console.print(f"[red]Failed to check authentication status: {e}[/red]")
        raise typer.Exit(1)


@app.command()
def logout(
    run_url: Optional[str] = typer.Option(
        None,
        "--run-url", 
        help="Datalayer server URL",
    ),
) -> None:
    """Log out of Datalayer server."""
    try:
        server_url = run_url or os.environ.get("DATALAYER_RUN_URL", DEFAULT_RUN_URL)
        
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
            console.print(f"[yellow]Warning: Could not clear keyring token: {e}[/yellow]")
            
        # Show logout status
        if tokens_cleared or keyring_cleared:
            console.print("✅ Successfully logged out")
            if tokens_cleared:
                console.print(f"   - Cleared environment variables: {', '.join(tokens_cleared)}")
            if keyring_cleared:
                console.print(f"   - Cleared stored token for {server_url}")
        else:
            console.print("ℹ️  No authentication tokens found to clear")
            
        console.print(f"👋 Logged out from [green]{server_url}[/green]")
        
    except Exception as e:
        console.print(f"[red]Logout failed: {e}[/red]")
        raise typer.Exit(1)


# Add individual commands at the root level for backward compatibility
def login_root(
    run_url: Optional[str] = typer.Option(
        None,
        "--run-url",
        help="Datalayer server URL",
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
    login(run_url=run_url, token=token, no_browser=no_browser)


def logout_root(
    run_url: Optional[str] = typer.Option(
        None,
        "--run-url", 
        help="Datalayer server URL",
    ),
) -> None:
    """Log out of Datalayer server."""
    logout(run_url=run_url)


def whoami_root(
    run_url: Optional[str] = typer.Option(
        None,
        "--run-url",
        help="Datalayer server URL", 
    ),
) -> None:
    """Display current authenticated user profile."""
    whoami(run_url=run_url)