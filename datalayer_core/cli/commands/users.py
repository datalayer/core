# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""User commands for Datalayer CLI."""

import json
from typing import Optional

import requests
import typer
from rich.console import Console

from datalayer_core.client.client import DatalayerClient

# Create a Typer app for user commands
app = typer.Typer(name="users", help="User management commands")

console = Console()


@app.command(name="dump-user")
def dump_user(
    uid: str = typer.Argument(..., help="User UID to query"),
    token: Optional[str] = typer.Option(
        None,
        "--token",
        help="Authentication token (Bearer token for API requests).",
    ),
) -> None:
    """Dump raw JSON response for a user by UID."""
    try:
        client = DatalayerClient(token=token)

        # Make direct API call to IAM endpoint
        url = f"{client.urls.iam_url}/api/iam/v1/users/{uid}"

        # Get the token for authorization
        auth_token = client._get_token()

        # Make request directly with requests to get full response details
        headers = {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json",
        }

        console.print(f"[cyan]Requesting:[/cyan] {url}")

        response = requests.get(url, headers=headers, timeout=30)

        # Print response details
        console.print(f"[green]Status Code:[/green] {response.status_code}")
        console.print("[green]Headers:[/green]")
        for key, value in response.headers.items():
            console.print(f"  {key}: {value}")
        console.print()

        # Print the response body
        console.print("[green]Response Body:[/green]")
        try:
            json_response = response.json()
            console.print(json.dumps(json_response, indent=2))
        except ValueError:
            # If response is not JSON, print raw text
            console.print("[yellow]Response is not JSON:[/yellow]")
            console.print(response.text)

        # Exit with error code if status is not 2xx
        if not response.ok:
            raise typer.Exit(1)

    except requests.exceptions.RequestException as e:
        console.print(f"[red]Request error: {e}[/red]")
        if hasattr(e, "response") and e.response is not None:
            console.print(f"[yellow]Status Code:[/yellow] {e.response.status_code}")
            console.print("[yellow]Response:[/yellow]")
            try:
                console.print(json.dumps(e.response.json(), indent=2))
            except (ValueError, TypeError):
                console.print(e.response.text)
        raise typer.Exit(1)
    except Exception as e:
        console.print(f"[red]Error: {e}[/red]")
        raise typer.Exit(1)
