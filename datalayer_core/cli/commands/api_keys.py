# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""API key commands for Datalayer CLI."""

from typing import Optional

import typer
from rich.console import Console

from datalayer_core.client.client import DatalayerClient
from datalayer_core.displays.api_keys import display_api_keys
from datalayer_core.models.api_key import ApiKeyType

# Create a Typer app for API key commands
app = typer.Typer(
    name="api-keys",
    help="API key management commands",
    invoke_without_command=True,
)

console = Console()


@app.callback()
def api_keys_callback(ctx: typer.Context) -> None:
    """API key management commands."""
    if ctx.invoked_subcommand is None:
        typer.echo(ctx.get_help())


@app.command(name="ls")
def list_api_keys(
    token: Optional[str] = typer.Option(
        None,
        "--token",
        help="Authentication token (Bearer token for API requests).",
    ),
) -> None:
    """List all API keys."""
    try:
        client = DatalayerClient(token=token)
        api_keys = client.list_api_keys()

        # Convert to dict format for display_api_keys
        api_key_dicts = []
        for api_key in api_keys:
            api_key_dicts.append(
                {
                    "uid": api_key.uid,
                    "name_s": api_key.name,
                    "description_t": api_key.description,
                    "variant_s": api_key.api_key_type,
                }
            )

        display_api_keys(api_key_dicts)

    except Exception as e:
        console.print(f"[red]Error listing API keys: {e}[/red]")
        raise typer.Exit(1)


@app.command(name="list")
def list_api_keys_verbose(
    token: Optional[str] = typer.Option(
        None,
        "--token",
        help="Authentication token (Bearer token for API requests).",
    ),
) -> None:
    """List all API keys."""
    list_api_keys(token=token)


@app.command(name="create")
def create_api_key(
    name: str = typer.Argument(..., help="Name of the API key"),
    description: str = typer.Argument(..., help="Description of the API key"),
    expiration_date: Optional[int] = typer.Option(
        0,
        "--expiration-date",
        help="Expiration date in seconds since epoch (0 for no expiration)",
    ),
    api_key_type: str = typer.Option(
        ApiKeyType.USER,
        "--api-key-type",
        help="Type of the API key (user, admin)",
    ),
    token: Optional[str] = typer.Option(
        None,
        "--token",
        help="Authentication token (Bearer token for API requests).",
    ),
) -> None:
    """Create a new API key."""
    try:
        client = DatalayerClient(token=token)

        result = client.create_api_key(
            name=name,
            description=description,
            expiration_date=expiration_date or 0,
            api_key_type=api_key_type,
        )

        if result.get("success", False):
            api_key_data = result.get("api_key", result.get("token", {}))
            console.print(
                f"[green]API key '{name}' created successfully![/green]"
            )
            console.print(
                f"[yellow]API key value: {result.get('access_token', 'N/A')}[/yellow]"
            )
            console.print(
                "[dim]Please save this API key value securely - it won't be shown again![/dim]"
            )

            # Display the created API key info.
            if api_key_data:
                display_api_keys(
                    [
                        {
                            "uid": api_key_data.get("uid"),
                            "name_s": api_key_data.get("name_s", name),
                            "description_t": api_key_data.get(
                                "description_t", description
                            ),
                            "variant_s": api_key_data.get(
                                "variant_s", api_key_type
                            ),
                        }
                    ]
                )
        else:
            console.print(
                f"[red]Failed to create API key: {result.get('message', 'Unknown error')}[/red]"
            )
            raise typer.Exit(1)

    except Exception as e:
        console.print(f"[red]Error creating API key: {e}[/red]")
        raise typer.Exit(1)


@app.command(name="delete")
def delete_api_key(
    uid: str = typer.Argument(..., help="UID of the API key to delete"),
    token: Optional[str] = typer.Option(
        None,
        "--token",
        help="Authentication token (Bearer token for API requests).",
    ),
) -> None:
    """Delete an API key."""
    try:
        client = DatalayerClient(token=token)

        success = client.delete_api_key(uid)

        if success:
            console.print(f"[green]API key '{uid}' deleted successfully![/green]")
        else:
            console.print(f"[red]Failed to delete API key '{uid}'[/red]")
            raise typer.Exit(1)

    except Exception as e:
        console.print(f"[red]Error deleting API key: {e}[/red]")
        raise typer.Exit(1)


# Root level commands for convenience
def api_keys_list(
    token: Optional[str] = typer.Option(
        None,
        "--token",
        help="Authentication token (Bearer token for API requests).",
    ),
) -> None:
    """List all API keys (root command)."""
    list_api_keys(token=token)


def api_keys_ls(
    token: Optional[str] = typer.Option(
        None,
        "--token",
        help="Authentication token (Bearer token for API requests).",
    ),
) -> None:
    """List all API keys (root command alias)."""
    list_api_keys(token=token)
